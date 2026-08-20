import { useEffect } from 'react';
import { getPlayer, onPlayerStatus } from '../store/audio';
import { useEqStore } from '../store/eq.store';
import { usePlayerStore } from '../store/player.store';
import { applyNative } from '../services/equalizer.service';
import { syncLockScreen } from '../services/lockscreen.service';

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
 */
export function usePlayerEngine() {
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
      if (status.didJustFinish) {
        const { repeat } = usePlayerStore.getState();
        if (repeat === 'one') {
          getPlayer().seekTo(0);
          getPlayer().play();
          usePlayerStore.getState().setProgress(0, status.duration);
        } else {
          usePlayerStore.getState().next();
        }
      }
    });
    return () => unsub();
  }, []);
}