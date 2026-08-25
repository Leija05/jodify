import { useEffect, useRef } from 'react';
import { getPlayer, onPlayerStatus } from '../store/audio';
import { useEqStore } from '../store/eq.store';
import { usePlayerStore } from '../store/player.store';
import { applyNative } from '../services/equalizer.service';
import { syncLockScreen } from '../services/lockscreen.service';
import { recordHistory } from '../services/history.service';
import { useSettingsStore } from '../store/settings.store';

/** Aplica el ecualizador guardado cada vez que cambia la fuente reproducida. */
export function applyEqToCurrentPlayer() {
  const { values, enabled } = useEqStore.getState();
  if (enabled && values.length > 0) {
    void applyNative(values);
  }
}

/**
 * Puente entre el AudioPlayer nativo (expo-audio) y el store de Zustand.
 * Se monta una sola vez en App y sobrevive a la recreación del player.
 *
 * Incluye:
 * - Fallback para didJustFinish (verificación por posición)
 * - Registro de historial de reproducción
 * - Sincronización de lock screen / notificación
 */
export function usePlayerEngine() {
  const lastFinishAt = useRef(0);
  const lastRecordedSongId = useRef<string | null>(null);

  useEffect(() => {
    const unsub = onPlayerStatus((status) => {
      const store = usePlayerStore.getState();
      if (store.position !== status.currentTime || store.duration !== status.duration) {
        store.setProgress(status.currentTime, status.duration);
      }
      store.setBuffering(status.isBuffering);
      if (status.playing !== store.isPlaying) {
        store.setPlaying(status.playing);
      }
      syncLockScreen(
        store.currentSong,
        status.playing,
        status.playbackState ?? (status.playing ? 'playing' : 'paused'),
      );

      // Registrar historial: la primera vez que una canción se reproduce
      if (status.playing && store.currentSong) {
        const songId = String(store.currentSong.id);
        if (songId !== lastRecordedSongId.current) {
          lastRecordedSongId.current = songId;
          const user = useSettingsStore.getState().user;
          if (user) {
            void recordHistory(store.currentSong.id, user.username);
          }
        }
      }

      // Detección de fin de canción: didJustFinish o fallback por posición
      const didFinish = status.didJustFinish;
      const positionFallback =
        status.duration > 0 &&
        status.currentTime >= status.duration - 1 &&
        !status.isBuffering &&
        status.playing;

      if (didFinish || positionFallback) {
        const now = Date.now();
        if (now - lastFinishAt.current < 1000) return;
        lastFinishAt.current = now;

        const { repeat } = usePlayerStore.getState();
        if (repeat === 'one') {
          const p = getPlayer();
          if (p) {
            p.seekTo(0);
            p.play();
          }
          usePlayerStore.getState().setProgress(0, status.duration);
        } else {
          usePlayerStore.getState().next();
        }
      }
    });
    return () => unsub();
  }, []);
}
