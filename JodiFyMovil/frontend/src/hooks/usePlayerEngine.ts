import { useEffect } from 'react';
import { configureAudioMode, onPlayerStatus } from '../stores/audio';
import { usePlayerStore } from '../stores/player.store';

export function usePlayerEngine() {
  const setBuffering = usePlayerStore((s) => s.setBuffering);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setError = usePlayerStore((s) => s.setError);
  const next = usePlayerStore((s) => s.next);

  useEffect(() => {
    configureAudioMode();

    const handleStatus = (status: any) => {
      if (!status) return;

      const { playbackState, currentTime, duration } = status;

      setProgress(currentTime, duration);

      if (playbackState === 3) {
        setPlaying(true);
        setBuffering(false);
      } else if (playbackState === 2) {
        setPlaying(false);
      } else if (playbackState === 4) {
        setBuffering(true);
      } else if (playbackState === 5) {
        setError(status.error ?? 'Error de reproducción');
      } else if (playbackState === 6) {
        next();
      }
    };

    const unsubscribe = onPlayerStatus(handleStatus);

    return () => {
      unsubscribe();
    };
  }, [setBuffering, setPlaying, setProgress, setError, next]);
}