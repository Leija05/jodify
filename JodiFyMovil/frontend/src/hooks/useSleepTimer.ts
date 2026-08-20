import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/player.store';
import { useSettingsStore } from '../store/settings.store';

/**
 * Vigila el temporizador de sueño y pausa la reproducción al llegar a cero.
 */
export function useSleepTimer() {
  const timerId = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const check = () => {
      const { sleepTimer, cancelSleepTimer } = useSettingsStore.getState();
      if (!sleepTimer.endAt) return;
      if (sleepTimer.triggered) return;
      if (Date.now() >= sleepTimer.endAt) {
        useSettingsStore.setState({
          sleepTimer: { ...sleepTimer, triggered: true },
        });
        usePlayerStore.getState().pause();
        cancelSleepTimer();
      }
    };

    check();
    timerId.current = setInterval(check, 5000);
    return () => {
      if (timerId.current) clearInterval(timerId.current);
    };
  }, []);
}