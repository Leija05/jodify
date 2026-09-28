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

      if (playbackState === 6) {
        store.next();
        return;
      }

      const updates: Record<string, any> = {};

      if (store.position !== currentTime || store.duration !== duration) {
        updates.position = currentTime;
        updates.duration = duration;
      }

      if (playbackState === 3) {
        if (!store.isPlaying) updates.isPlaying = true;
        if (store.isBuffering) updates.isBuffering = false;
      } else if (playbackState === 2) {
        if (store.isPlaying) updates.isPlaying = false;
      } else if (playbackState === 4) {
        if (!store.isBuffering) updates.isBuffering = true;
      } else if (playbackState === 5) {
        const err = status.error ?? 'Error de reproducción';
        if (store.error !== err) updates.error = err;
      }

      if (Object.keys(updates).length > 0) {
        usePlayerStore.setState(updates);
      }
    };

    const unsubscribe = onPlayerStatus(handleStatus);

    return () => {
      unsubscribe();
    };
  }, []);
}