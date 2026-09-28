import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../stores/player.store';
import { useSettingsStore } from '../stores/settings.store';

export function useSleepTimer() {
  const sleepTimer = useSettingsStore((s) => s.sleepTimer);
  const pause = usePlayerStore((s) => s.pause);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (sleepTimer.endAt && !sleepTimer.triggered) {
      const remaining = sleepTimer.endAt - Date.now();

      if (remaining <= 0) {
        triggerSleep();
      } else {
        timeoutRef.current = setTimeout(triggerSleep, remaining);
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [sleepTimer.endAt, sleepTimer.triggered]);

  useEffect(() => {
    checkIntervalRef.current = setInterval(() => {
      if (sleepTimer.endAt && !sleepTimer.triggered) {
        const remaining = sleepTimer.endAt - Date.now();
        if (remaining <= 0) {
          triggerSleep();
        }
      }
    }, 5000);

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [sleepTimer.endAt, sleepTimer.triggered]);

  const triggerSleep = () => {
    if (isPlaying) {
      pause();
    }
    useSettingsStore.setState({
      sleepTimer: { ...sleepTimer, triggered: true },
    });
  };
}