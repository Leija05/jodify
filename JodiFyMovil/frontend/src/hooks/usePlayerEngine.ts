import { useEffect } from 'react';
import { configureAudioMode, onPlayerStatus } from '../stores/audio';
import { usePlayerStore } from '../stores/player.store';

export function usePlayerEngine() {
  useEffect(() => {
    void configureAudioMode();

    const handleStatus = (status: any) => {
      if (!status) return;

      const { playbackState, currentTime, duration } = status;
      const store = usePlayerStore.getState();

      store.setProgress(currentTime, duration);

      if (playbackState === 3) {
        store.setPlaying(true);
        store.setBuffering(false);
      } else if (playbackState === 2) {
        store.setPlaying(false);
      } else if (playbackState === 4) {
        store.setBuffering(true);
      } else if (playbackState === 5) {
        store.setError(status.error ?? 'Error de reproducción');
      } else if (playbackState === 6) {
        store.next();
      }
    };

    const unsubscribe = onPlayerStatus(handleStatus);

    return () => {
      unsubscribe();
    };
  }, []);
}