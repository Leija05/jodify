import { useEffect, useRef } from 'react';
import { configureAudioMode, onPlayerStatus } from '../stores/audio';
import { usePlayerStore, preloadNextTrack } from '../stores/player.store';

export function usePlayerEngine() {
  const lastFinishedRef = useRef(0);
  const autoSkipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preloadedForTrackRef = useRef(false);

  useEffect(() => {
    void configureAudioMode();

    const handleStatus = (status: any) => {
      if (!status) return;

      const { playbackState, currentTime, duration } = status;
      const store = usePlayerStore.getState();

      if (playbackState === 6) {
        preloadedForTrackRef.current = false;
        const now = Date.now();
        if (now - lastFinishedRef.current > 1200) {
          lastFinishedRef.current = now;
          if (autoSkipTimerRef.current) {
            clearTimeout(autoSkipTimerRef.current);
            autoSkipTimerRef.current = null;
          }
          store.next();
        }
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
        if (autoSkipTimerRef.current) {
          clearTimeout(autoSkipTimerRef.current);
          autoSkipTimerRef.current = null;
        }
        // Lookahead buffer: precarga proactiva al llegar al 70% del tema si aún no se precargó
        if (duration > 15 && currentTime / duration > 0.70 && !preloadedForTrackRef.current) {
          preloadedForTrackRef.current = true;
          void preloadNextTrack();
        }
      } else if (playbackState === 2) {
        if (store.isPlaying) updates.isPlaying = false;
      } else if (playbackState === 4) {
        if (!store.isBuffering) updates.isBuffering = true;
      } else if (playbackState === 5) {
        const err = status.error ?? 'Error de reproducción';
        if (store.error !== err) updates.error = err;
        // Auto-skip on unrecoverable track error if queue is active
        if (store.isPlaying && store.queue.length > 1 && !autoSkipTimerRef.current) {
          autoSkipTimerRef.current = setTimeout(() => {
            autoSkipTimerRef.current = null;
            if (usePlayerStore.getState().isPlaying) {
              usePlayerStore.getState().next();
            }
          }, 2500);
        }
      }

      if (Object.keys(updates).length > 0) {
        usePlayerStore.setState(updates);
      }
    };

    const unsubscribe = onPlayerStatus(handleStatus);

    return () => {
      unsubscribe();
      if (autoSkipTimerRef.current) {
        clearTimeout(autoSkipTimerRef.current);
      }
    };
  }, []);
}