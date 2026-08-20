import * as Haptics from 'expo-haptics';
import { useCallback, useRef } from 'react';

/**
 * Detecta una combinación de toques rápidos (por defecto 7) sobre un botón
 * y dispara `onUnlock`. Sirve para revelar accesos ocultos (dev/admin).
 */
export function useSecretCombo(onUnlock: () => void, taps = 7) {
  const countRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePress = useCallback(() => {
    countRef.current += 1;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      countRef.current = 0;
    }, 2500);
    if (countRef.current >= taps) {
      countRef.current = 0;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUnlock();
    }
  }, [onUnlock, taps]);

  return handlePress;
}