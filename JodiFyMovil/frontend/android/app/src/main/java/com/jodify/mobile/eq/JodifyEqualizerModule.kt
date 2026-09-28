package com.jodify.mobile.eq

import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.Virtualizer
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import kotlin.math.abs
import kotlin.math.roundToInt

class JodifyEqualizerModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  private var equalizer: Equalizer? = null
  private var bassBoost: BassBoost? = null
  private var virtualizer: Virtualizer? = null

  private var available = false
  private var enabled = false
  private var lastGains: DoubleArray? = null
  private var bassStrength: Short = 0
  private var virtualizerStrength: Short = 0

  private val tag = "JodifyEqualizer"

  override fun getName(): String = "JodifyEqualizer"

  private fun createIfNeeded(): Boolean {
    if (equalizer != null) return available
    return try {
      val eq = Equalizer(0, 0)
      eq.enabled = enabled
      equalizer = eq
      available = true
      Log.d(tag, "Equalizer creado (${eq.numberOfBands} bandas)")
      lastGains?.let { applyGainsInternal(it) }

      try {
        val bb = BassBoost(0, 0)
        bb.enabled = enabled && bassStrength > 0
        if (bb.strengthSupported && bassStrength > 0) {
          bb.setStrength(bassStrength)
        }
        bassBoost = bb
      } catch (e: Throwable) {
        Log.w(tag, "BassBoost no soportado: ${e.message}")
      }

      try {
        val virt = Virtualizer(0, 0)
        virt.enabled = enabled && virtualizerStrength > 0
        if (virt.strengthSupported && virtualizerStrength > 0) {
          virt.setStrength(virtualizerStrength)
        }
        virtualizer = virt
      } catch (e: Throwable) {
        Log.w(tag, "Virtualizer no soportado: ${e.message}")
      }

      true
    } catch (e: Throwable) {
      Log.w(tag, "No se pudo crear el ecualizador: ${e.message}")
      available = false
      false
    }
  }

  private fun applyGainsInternal(gains: DoubleArray) {
    val eq = equalizer ?: return
    try {
      val bands = eq.numberOfBands.toInt()
      val targets = intArrayOf(32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000)
      for (i in 0 until bands) {
        val bandShort = i.toShort()
        val center = try {
          val range = eq.getBandFreqRange(bandShort)
          ((range[0].toInt() + range[1].toInt()) / 2).toInt()
        } catch (e: Throwable) {
          0
        }
        var bestIdx = 0
        var bestDist = Int.MAX_VALUE
        for (j in gains.indices) {
          val target = targets.getOrElse(j) { 14000 }
          val dist = abs(center - target)
          if (dist < bestDist) {
            bestDist = dist
            bestIdx = j
          }
        }
        val db = gains.getOrElse(bestIdx) { 0.0 }.toFloat()
        val millibels = (db * 100).roundToInt().coerceIn(-1500, 1500)
        eq.setBandLevel(bandShort, millibels.toShort())
      }
      lastGains = gains
    } catch (e: Throwable) {
      Log.w(tag, "No se pudieron aplicar las bandas: ${e.message}")
    }
  }

  @ReactMethod
  fun isAvailable(callback: Callback) {
    val ok = createIfNeeded()
    callback.invoke(ok, equalizer?.numberOfBands ?: 10)
  }

  @ReactMethod
  fun setEnabled(flag: Boolean) {
    enabled = flag
    createIfNeeded()
    try {
      equalizer?.enabled = flag
      bassBoost?.enabled = flag && bassStrength > 0
      virtualizer?.enabled = flag && virtualizerStrength > 0
    } catch (e: Throwable) {
      Log.w(tag, "No se pudo cambiar estado del ecualizador: ${e.message}")
    }
  }

  @ReactMethod
  fun setBandGains(gains: ReadableArray) {
    if (!createIfNeeded()) return
    val values = DoubleArray(gains.size()) { gains.getDouble(it) }
    applyGainsInternal(values)
  }

  @ReactMethod
  fun setBassBoost(strength: Double) {
    val s = (strength * 10).roundToInt().coerceIn(0, 1000).toShort()
    bassStrength = s
    try {
      createIfNeeded()
      bassBoost?.let {
        if (it.strengthSupported) {
          it.setStrength(s)
          it.enabled = enabled && s > 0
        }
      }
    } catch (e: Throwable) {
      Log.w(tag, "Error aplicando BassBoost: ${e.message}")
    }
  }

  @ReactMethod
  fun setVirtualizer(strength: Double) {
    val s = (strength * 10).roundToInt().coerceIn(0, 1000).toShort()
    virtualizerStrength = s
    try {
      createIfNeeded()
      virtualizer?.let {
        if (it.strengthSupported) {
          it.setStrength(s)
          it.enabled = enabled && s > 0
        }
      }
    } catch (e: Throwable) {
      Log.w(tag, "Error aplicando Virtualizer: ${e.message}")
    }
  }

  @ReactMethod
  fun getBandFrequencies(callback: Callback) {
    if (!createIfNeeded()) {
      callback.invoke(Arguments.createArray())
      return
    }
    val arr = Arguments.createArray()
    val eq = equalizer ?: run {
      callback.invoke(arr)
      return
    }
    for (i in 0 until eq.numberOfBands.toInt()) {
      try {
        val range = eq.getBandFreqRange(i.toShort())
        arr.pushInt((range[0].toInt() + range[1].toInt()) / 2)
      } catch (e: Throwable) {
        arr.pushInt(0)
      }
    }
    callback.invoke(arr)
  }

  @ReactMethod
  fun release() {
    try {
      equalizer?.release()
      bassBoost?.release()
      virtualizer?.release()
    } catch (e: Throwable) {
      // ya liberado
    }
    equalizer = null
    bassBoost = null
    virtualizer = null
    available = false
  }
}
