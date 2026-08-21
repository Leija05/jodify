package com.leija.jodify.eq

import android.media.audiofx.Equalizer
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Ecualizador nativo de JodiFy.
 *
 * Usa el `Equalizer` de android.media.audiofx sobre la mezcla de salida
 * global (sesión 0, el único enfoque viable sin modificar expo-audio).
 * Si el dispositivo no lo soporta, `isAvailable` devuelve false y la UI
 * degrada con elegancia. Todo el manejo de errores es defensivo para que
 * nunca rompa la reproducción.
 */
class JodifyEqualizerModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  private var equalizer: Equalizer? = null
  private var available = false
  private var enabled = false
  private var lastGains: DoubleArray? = null

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
      // Reaplica los últimos ajustes si los había.
      lastGains?.let { applyGainsInternal(it) }
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
      val targets = intArrayOf(60, 230, 910, 3600, 14000)
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
    callback.invoke(ok, equalizer?.numberOfBands ?: 0)
  }

  @ReactMethod
  fun setEnabled(flag: Boolean) {
    enabled = flag
    if (flag) {
      if (createIfNeeded()) {
        try {
          equalizer?.enabled = true
        } catch (e: Throwable) {
          Log.w(tag, "No se pudo activar el ecualizador: ${e.message}")
        }
      }
    } else {
      try {
        equalizer?.enabled = false
      } catch (e: Throwable) {
        Log.w(tag, "No se pudo desactivar el ecualizador: ${e.message}")
      }
    }
  }

  /** Recibe las ganancias en decibelios (rango típico -12..12) y las aplica. */
  @ReactMethod
  fun setBandGains(gains: ReadableArray) {
    if (!createIfNeeded()) return
    val values = DoubleArray(gains.size()) { gains.getDouble(it) }
    applyGainsInternal(values)
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
    } catch (e: Throwable) {
      // ya liberado
    }
    equalizer = null
    available = false
  }
}