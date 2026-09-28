package com.jodify.mobile.media

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class JodifyMediaModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val MODULE_NAME = "JodifyMediaModule"
    const val CHANNEL_ID = "jodify_playback"
    const val NOTIFICATION_ID = 2026
    const val ACTION_PLAY = "com.jodify.mobile.ACTION_PLAY"
    const val ACTION_PAUSE = "com.jodify.mobile.ACTION_PAUSE"
    const val ACTION_NEXT = "com.jodify.mobile.ACTION_NEXT"
    const val ACTION_PREV = "com.jodify.mobile.ACTION_PREV"
    private const val TAG = "JodifyMediaModule"
  }

  private var mediaSession: MediaSession? = null
  private var lastCoverUrl: String? = null
  private var cachedCoverBitmap: Bitmap? = null
  private var isReceiverRegistered = false

  override fun getName(): String = MODULE_NAME

  private val mediaActionReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      when (intent?.action) {
        ACTION_PLAY -> emitAction("play")
        ACTION_PAUSE -> emitAction("pause")
        ACTION_NEXT -> emitAction("next")
        ACTION_PREV -> emitAction("previous")
      }
    }
  }

  private fun emitAction(action: String, extra: WritableMap? = null) {
    val map = extra ?: Arguments.createMap()
    map.putString("action", action)
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      ?.emit("onMediaAction", map)
  }

  private fun initMediaSessionIfNeeded() {
    if (mediaSession != null) return

    val session = MediaSession(reactContext, "JodifySession")
    session.setCallback(object : MediaSession.Callback() {
      override fun onPlay() {
        emitAction("play")
      }

      override fun onPause() {
        emitAction("pause")
      }

      override fun onSkipToNext() {
        emitAction("next")
      }

      override fun onSkipToPrevious() {
        emitAction("previous")
      }

      override fun onSeekTo(pos: Long) {
        val map = Arguments.createMap()
        map.putDouble("position", pos / 1000.0)
        emitAction("seek", map)
      }

      override fun onStop() {
        emitAction("pause")
      }
    })

    session.isActive = true
    mediaSession = session

    if (!isReceiverRegistered) {
      val filter = IntentFilter().apply {
        addAction(ACTION_PLAY)
        addAction(ACTION_PAUSE)
        addAction(ACTION_NEXT)
        addAction(ACTION_PREV)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        reactContext.registerReceiver(mediaActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        reactContext.registerReceiver(mediaActionReceiver, filter)
      }
      isReceiverRegistered = true
    }

    createNotificationChannel()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager =
        reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val existing = notificationManager.getNotificationChannel(CHANNEL_ID)
      if (existing == null) {
        val channel = NotificationChannel(
          CHANNEL_ID,
          "JodiFy Reproducción",
          NotificationManager.IMPORTANCE_LOW
        ).apply {
          description = "Controles de reproducción y estado en segundo plano"
          setShowBadge(false)
          lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        notificationManager.createNotificationChannel(channel)
      }
    }
  }

  @ReactMethod
  fun updatePlayback(
    title: String,
    artist: String,
    coverUrl: String?,
    isPlaying: Boolean,
    positionSeconds: Double,
    durationSeconds: Double,
    accentColor: String?
  ) {
    initMediaSessionIfNeeded()
    val session = mediaSession ?: return

    val posMs = (positionSeconds * 1000).toLong().coerceAtLeast(0L)
    val durMs = (durationSeconds * 1000).toLong().coerceAtLeast(0L)

    val actions = PlaybackState.ACTION_PLAY or
      PlaybackState.ACTION_PAUSE or
      PlaybackState.ACTION_SKIP_TO_NEXT or
      PlaybackState.ACTION_SKIP_TO_PREVIOUS or
      PlaybackState.ACTION_SEEK_TO

    val state = if (isPlaying) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED
    val playbackState = PlaybackState.Builder()
      .setActions(actions)
      .setState(state, posMs, if (isPlaying) 1.0f else 0.0f)
      .build()
    session.setPlaybackState(playbackState)

    // Load cover art asynchronously or use cache
    if (coverUrl != null && coverUrl != lastCoverUrl) {
      lastCoverUrl = coverUrl
      thread {
        try {
          val url = URL(coverUrl)
          val connection = url.openConnection() as HttpURLConnection
          connection.doInput = true
          connection.connectTimeout = 4000
          connection.readTimeout = 4000
          connection.connect()
          val input = connection.inputStream
          val bitmap = BitmapFactory.decodeStream(input)
          cachedCoverBitmap = bitmap
          updateNotificationAndMetadata(title, artist, bitmap, isPlaying, durMs, accentColor)
        } catch (e: Exception) {
          Log.w(TAG, "Error downloading cover: ${e.message}")
          updateNotificationAndMetadata(title, artist, null, isPlaying, durMs, accentColor)
        }
      }
    } else {
      updateNotificationAndMetadata(title, artist, cachedCoverBitmap, isPlaying, durMs, accentColor)
    }
  }

  private fun updateNotificationAndMetadata(
    title: String,
    artist: String,
    bitmap: Bitmap?,
    isPlaying: Boolean,
    durationMs: Long,
    accentColor: String?
  ) {
    val session = mediaSession ?: return

    // Update MediaMetadata
    val metaBuilder = MediaMetadata.Builder()
      .putString(MediaMetadata.METADATA_KEY_TITLE, title)
      .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
      .putString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST, artist)
      .putLong(MediaMetadata.METADATA_KEY_DURATION, durationMs)

    if (bitmap != null) {
      metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, bitmap)
      metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ART, bitmap)
    }
    session.setMetadata(metaBuilder.build())

    // Build media notification
    val notificationManager =
      reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }

    // App launch intent when tapping notification
    val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)
    val contentPendingIntent = PendingIntent.getActivity(reactContext, 0, launchIntent, flags)

    val prevIntent = Intent(ACTION_PREV).setPackage(reactContext.packageName)
    val prevPending = PendingIntent.getBroadcast(reactContext, 1, prevIntent, flags)

    val playPauseIntent = Intent(if (isPlaying) ACTION_PAUSE else ACTION_PLAY).setPackage(reactContext.packageName)
    val playPausePending = PendingIntent.getBroadcast(reactContext, 2, playPauseIntent, flags)

    val nextIntent = Intent(ACTION_NEXT).setPackage(reactContext.packageName)
    val nextPending = PendingIntent.getBroadcast(reactContext, 3, nextIntent, flags)

    val colorInt = try {
      if (!accentColor.isNullOrEmpty()) Color.parseColor(accentColor) else Color.parseColor("#7F00FF")
    } catch (_: Exception) {
      Color.parseColor("#7F00FF")
    }

    val prevAction = Notification.Action.Builder(
      android.R.drawable.ic_media_previous,
      "Anterior",
      prevPending
    ).build()

    val playPauseAction = Notification.Action.Builder(
      if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play,
      if (isPlaying) "Pausar" else "Reproducir",
      playPausePending
    ).build()

    val nextAction = Notification.Action.Builder(
      android.R.drawable.ic_media_next,
      "Siguiente",
      nextPending
    ).build()

    val mediaStyle = Notification.MediaStyle()
      .setMediaSession(session.sessionToken)
      .setShowActionsInCompactView(0, 1, 2)

    val notifBuilder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(reactContext, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(reactContext)
    }

    notifBuilder
      .setContentTitle(title)
      .setContentText(artist)
      .setSubText("JodiFy")
      .setContentIntent(contentPendingIntent)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setStyle(mediaStyle)
      .setColor(colorInt)
      .setColorized(true)
      .setOngoing(isPlaying)
      .addAction(prevAction)
      .addAction(playPauseAction)
      .addAction(nextAction)

    if (bitmap != null) {
      notifBuilder.setLargeIcon(bitmap)
    }

    try {
      notificationManager.notify(NOTIFICATION_ID, notifBuilder.build())
    } catch (e: Exception) {
      Log.w(TAG, "Failed to show media notification: ${e.message}")
    }
  }

  @ReactMethod
  fun stopPlayback() {
    val session = mediaSession ?: return
    val state = PlaybackState.Builder()
      .setState(PlaybackState.STATE_STOPPED, 0, 0f)
      .build()
    session.setPlaybackState(state)
    session.isActive = false

    val notificationManager =
      reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    try {
      notificationManager.cancel(NOTIFICATION_ID)
    } catch (_: Exception) {}
  }

  override fun onCatalystInstanceDestroy() {
    super.onCatalystInstanceDestroy()
    if (isReceiverRegistered) {
      try {
        reactContext.unregisterReceiver(mediaActionReceiver)
      } catch (_: Exception) {}
      isReceiverRegistered = false
    }
    mediaSession?.release()
    mediaSession = null
  }
}
