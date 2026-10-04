package com.jodify.mobile.eq

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.audiofx.AudioEffect
import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.Virtualizer
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import kotlin.math.abs
import kotlin.math.roundToInt

class JodifyEqualizerModule(
  private val reactCtx: ReactApplicationContext
) : ReactContextBaseJavaModule(reactCtx), LifecycleEventListener {

  companion object {
    private const val TAG = "JodifyEqualizer"
    private var instance: JodifyEqualizerModule? = null
    private val activeSessions = java.util.Collections.synchronizedSet(mutableSetOf<Int>())

    @JvmStatic
    fun onAudioSession(sessionId: Int, open: Boolean) {
      Log.i(TAG, "onAudioSession directly invoked: sessionId=$sessionId, open=$open")
      if (sessionId <= 0) return
      if (open) {
        activeSessions.add(sessionId)
        instance?.attachSession(sessionId)
      } else {
        activeSessions.remove(sessionId)
        instance?.detachSession(sessionId)
      }
    }
  }

  private data class EffectBundle(
    var equalizer: Equalizer? = null,
    var bassBoost: BassBoost? = null,
    var virtualizer: Virtualizer? = null
  ) {
    fun release() {
      try { equalizer?.release() } catch (_: Throwable) {}
      try { bassBoost?.release() } catch (_: Throwable) {}
      try { virtualizer?.release() } catch (_: Throwable) {}
      equalizer = null
      bassBoost = null
      virtualizer = null
    }
  }

  private val sessionBundles = java.util.concurrent.ConcurrentHashMap<Int, EffectBundle>()

  private var available = false
  private var enabled = true
  private var lastGains: DoubleArray? = null
  private var bassStrength: Short = 0
  private var virtualizerStrength: Short = 0

  private val tag = "JodifyEqualizer"

  private val sessionReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent == null) return
      val action = intent.action ?: return
      val sessionId = intent.getIntExtra(AudioEffect.EXTRA_AUDIO_SESSION, 0)
      if (sessionId <= 0) return

      if (action == AudioEffect.ACTION_OPEN_AUDIO_EFFECT_CONTROL_SESSION) {
        Log.i(tag, "Audio session opened via broadcast: $sessionId, attaching effects")
        activeSessions.add(sessionId)
        attachSession(sessionId)
      } else if (action == AudioEffect.ACTION_CLOSE_AUDIO_EFFECT_CONTROL_SESSION) {
        Log.i(tag, "Audio session closed via broadcast: $sessionId, releasing effects")
        activeSessions.remove(sessionId)
        detachSession(sessionId)
      }
    }
  }

  init {
    instance = this
    reactCtx.addLifecycleEventListener(this)
    val filter = IntentFilter().apply {
      addAction(AudioEffect.ACTION_OPEN_AUDIO_EFFECT_CONTROL_SESSION)
      addAction(AudioEffect.ACTION_CLOSE_AUDIO_EFFECT_CONTROL_SESSION)
    }
    try {
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
        reactCtx.registerReceiver(sessionReceiver, filter, Context.RECEIVER_EXPORTED)
      } else {
        reactCtx.registerReceiver(sessionReceiver, filter)
      }
      Log.i(tag, "sessionReceiver registrado exitosamente")
    } catch (e: Throwable) {
      Log.w(tag, "No se pudo registrar sessionReceiver: ${e.message}")
    }

    // Attach any sessions that were registered before module initialized
    for (sid in activeSessions) {
      attachSession(sid)
    }
  }

  override fun getName(): String = "JodifyEqualizer"

  private fun createBundleForSession(sessionId: Int): EffectBundle {
    val bundle = EffectBundle()
    try {
      val eq = try {
        Equalizer(0, sessionId)
      } catch (e: Throwable) {
        Log.w(tag, "Equalizer(0, $sessionId) fallo, probando con prioridad 1000: ${e.message}")
        Equalizer(1000, sessionId)
      }
      eq.enabled = enabled
      bundle.equalizer = eq
      available = true
      Log.i(tag, "Equalizer creado en sesión $sessionId (${eq.numberOfBands} bandas), enabled=$enabled")
      lastGains?.let { applyGainsToEqualizer(eq, it) }
    } catch (e: Throwable) {
      Log.w(tag, "No se pudo crear Equalizer en sesión $sessionId: ${e.message}")
    }

    try {
      val bb = try {
        BassBoost(0, sessionId)
      } catch (_: Throwable) {
        BassBoost(1000, sessionId)
      }
      if (bb.strengthSupported) {
        bb.setStrength(bassStrength)
      }
      bb.enabled = enabled && bassStrength > 0
      bundle.bassBoost = bb
      Log.i(tag, "BassBoost creado en sesión $sessionId, strength=$bassStrength, enabled=${bb.enabled}")
    } catch (e: Throwable) {
      Log.w(tag, "BassBoost no soportado en sesión $sessionId: ${e.message}")
    }

    try {
      val virt = try {
        Virtualizer(0, sessionId)
      } catch (_: Throwable) {
        Virtualizer(1000, sessionId)
      }
      if (virt.strengthSupported) {
        virt.setStrength(virtualizerStrength)
      }
      virt.enabled = enabled && virtualizerStrength > 0
      bundle.virtualizer = virt
      Log.i(tag, "Virtualizer creado en sesión $sessionId, strength=$virtualizerStrength, enabled=${virt.enabled}")
    } catch (e: Throwable) {
      Log.w(tag, "Virtualizer no soportado en sesión $sessionId: ${e.message}")
    }

    return bundle
  }

  fun attachSession(sessionId: Int) {
    if (sessionId <= 0) return
    val existing = sessionBundles[sessionId]
    if (existing?.equalizer != null) {
      existing.equalizer?.enabled = enabled
      lastGains?.let { applyGainsToEqualizer(existing.equalizer!!, it) }
      return
    }
    val bundle = createBundleForSession(sessionId)
    if (bundle.equalizer != null || bundle.bassBoost != null || bundle.virtualizer != null) {
      sessionBundles[sessionId] = bundle
    }
  }

  fun detachSession(sessionId: Int) {
    sessionBundles.remove(sessionId)?.release()
  }

  private fun ensureGlobalBundle(): Boolean {
    if (sessionBundles.isEmpty()) {
      sessionBundles[0] = createBundleForSession(0)
    }
    return available || sessionBundles.isNotEmpty()
  }

  private fun applyGainsToEqualizer(eq: Equalizer, gains: DoubleArray) {
    try {
      eq.enabled = enabled
      val bands = eq.numberOfBands.toInt()
      val targets = intArrayOf(32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000)
      val levelRange = try { eq.bandLevelRange } catch (_: Throwable) { shortArrayOf(-1500, 1500) }
      val minLevel = levelRange[0].toInt()
      val maxLevel = levelRange[1].toInt()

      for (i in 0 until bands) {
        val bandShort = i.toShort()
        val centerHz = try {
          val range = eq.getBandFreqRange(bandShort)
          // Range is in milliHertz, convert to Hertz:
          (((range[0].toLong() + range[1].toLong()) / 2L) / 1000L).toInt()
        } catch (_: Throwable) {
          try { (eq.getCenterFreq(bandShort) / 1000).toInt() } catch (_: Throwable) { 0 }
        }

        var bestIdx = 0
        var bestDist = Int.MAX_VALUE
        for (j in gains.indices) {
          val target = targets.getOrElse(j) { 14000 }
          val dist = abs(centerHz - target)
          if (dist < bestDist) {
            bestDist = dist
            bestIdx = j
          }
        }

        val db = gains.getOrElse(bestIdx) { 0.0 }.toFloat()
        val millibels = (db * 100).roundToInt().coerceIn(minLevel, maxLevel).toShort()
        eq.setBandLevel(bandShort, millibels)
        Log.i(tag, "Band $bandShort ($centerHz Hz) set to $millibels mB (target: $db dB)")
      }
    } catch (e: Throwable) {
      Log.w(tag, "No se pudieron aplicar las bandas al Equalizer: ${e.message}")
    }
  }

  private fun applyGainsInternal(gains: DoubleArray) {
    lastGains = gains
    for (sid in activeSessions) {
      attachSession(sid)
    }
    for ((sid, bundle) in sessionBundles) {
      bundle.equalizer?.let {
        it.enabled = enabled
        applyGainsToEqualizer(it, gains)
      }
    }
  }

  @ReactMethod
  fun isAvailable(callback: Callback) {
    val ok = sessionBundles.isNotEmpty() || available
    val bands = sessionBundles.values.firstOrNull()?.equalizer?.numberOfBands?.toInt() ?: 10
    callback.invoke(true, bands)
  }

  @ReactMethod
  fun setEnabled(flag: Boolean) {
    enabled = flag
    Log.i(tag, "setEnabled: $flag across ${sessionBundles.size} sessions")
    for (sid in activeSessions) {
      attachSession(sid)
    }
    for ((_, bundle) in sessionBundles) {
      try {
        bundle.equalizer?.enabled = flag
        bundle.bassBoost?.enabled = flag && bassStrength > 0
        bundle.virtualizer?.enabled = flag && virtualizerStrength > 0
        if (flag && lastGains != null && bundle.equalizer != null) {
          applyGainsToEqualizer(bundle.equalizer!!, lastGains!!)
        }
      } catch (e: Throwable) {
        Log.w(tag, "Error al cambiar estado del bundle: ${e.message}")
      }
    }
  }

  @ReactMethod
  fun setBandGains(gains: ReadableArray) {
    ensureGlobalBundle()
    val values = DoubleArray(gains.size()) { gains.getDouble(it) }
    applyGainsInternal(values)
  }

  @ReactMethod
  fun setBassBoost(strength: Double) {
    val s = (strength * 10).roundToInt().coerceIn(0, 1000).toShort()
    bassStrength = s
    for (sid in activeSessions) {
      attachSession(sid)
    }
    ensureGlobalBundle()
    for ((_, bundle) in sessionBundles) {
      try {
        bundle.bassBoost?.let {
          if (it.strengthSupported) {
            it.setStrength(s)
            it.enabled = enabled && s > 0
          }
        }
      } catch (e: Throwable) {
        Log.w(tag, "Error aplicando BassBoost: ${e.message}")
      }
    }
  }

  @ReactMethod
  fun setVirtualizer(strength: Double) {
    val s = (strength * 10).roundToInt().coerceIn(0, 1000).toShort()
    virtualizerStrength = s
    for (sid in activeSessions) {
      attachSession(sid)
    }
    ensureGlobalBundle()
    for ((_, bundle) in sessionBundles) {
      try {
        bundle.virtualizer?.let {
          if (it.strengthSupported) {
            it.setStrength(s)
            it.enabled = enabled && s > 0
          }
        }
      } catch (e: Throwable) {
        Log.w(tag, "Error aplicando Virtualizer: ${e.message}")
      }
    }
  }

  @ReactMethod
  fun getBandFrequencies(callback: Callback) {
    ensureGlobalBundle()
    val arr = Arguments.createArray()
    val eq = sessionBundles.values.firstOrNull()?.equalizer
    if (eq == null) {
      callback.invoke(arr)
      return
    }
    for (i in 0 until eq.numberOfBands.toInt()) {
      try {
        val range = eq.getBandFreqRange(i.toShort())
        val center = (((range[0].toLong() + range[1].toLong()) / 2L) / 1000L).toInt()
        arr.pushInt(center)
      } catch (_: Throwable) {
        arr.pushInt(0)
      }
    }
    callback.invoke(arr)
  }

  @ReactMethod
  fun release() {
    for ((_, bundle) in sessionBundles) {
      bundle.release()
    }
    sessionBundles.clear()
    available = false
  }

  override fun onHostResume() {}
  override fun onHostPause() {}
  override fun onHostDestroy() {
    try {
      reactCtx.unregisterReceiver(sessionReceiver)
    } catch (_: Throwable) {}
    release()
  }
}
