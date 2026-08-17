import { useEffect, useMemo, useState } from 'react';
import { useSettingsStore } from '../store/settings.store';
import { pausePlayback } from '../services/player.service';
import { useToastStore } from '../store/toast.store';

export function useSleepTimer(): { remainingMs: number | null; totalMs: number | null } {
  const sleepTimer = useSettingsStore((s) => s.sleepTimer);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const totalMs = sleepTimer ? sleepTimer.durationMinutes * 60000 : null;

  useEffect(() => {
    if (!sleepTimer) {
      setRemainingMs(null);
      return;
    }
    const update = () => {
      const remaining = sleepTimer.endAt - Date.now();
      if (remaining <= 0) {
        setRemainingMs(0);
        pausePlayback();
        useSettingsStore.getState().setSleepTimer(null);
        useToastStore.getState().show('Temporizador de sueño completado', 'info');
        return;
      }
      setRemainingMs(remaining);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [sleepTimer]);

  return useMemo(() => ({ remainingMs, totalMs }), [remainingMs, totalMs]);
}
