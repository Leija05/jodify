import * as Haptics from 'expo-haptics';
import { useCallback, useRef } from 'react';

/**
 * Detecta una combinación secreta de toques para revelar accesos admin/dev.
 *
 * Patrón: 5 taps en el logo + 2 taps rápidos en el tagline (en <1.5s).
 * Esto es lo suficientemente oculto para usuarios normales pero descubrible
 * para quienes buscan activamente.
 *
 * Alternativa simple: 7 taps seguidos en el logo (fallback).
 */
export function useSecretCombo(onUnlock: () => void) {
  const logoTapCount = useRef(0);
  const taglineTapCount = useRef(0);
  const logoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taglineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoPress = useCallback(() => {
    // Reset tagline taps
    taglineTapCount.current = 0;
    if (taglineTimerRef.current) clearTimeout(taglineTimerRef.current);

    logoTapCount.current += 1;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (logoTimerRef.current) clearTimeout(logoTimerRef.current);
    logoTimerRef.current = setTimeout(() => {
      logoTapCount.current = 0;
    }, 2000);

    // Combo: 5 logo taps + check tagline
    if (logoTapCount.current >= 5) {
      // Si también hubo 2 tagline taps recientes, desbloquear
      if (taglineTapCount.current >= 2) {
        comboUnlock();
        return;
      }
      // Iniciar timer para esperar los tagline taps
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => {
        taglineTapCount.current = 0;
      }, 1500);
    }

    // Fallback: 7 taps directos en el logo
    if (logoTapCount.current >= 7) {
      comboUnlock();
    }
  }, [onUnlock]);

  const handleTaglinePress = useCallback(() => {
    taglineTapCount.current += 1;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (taglineTimerRef.current) clearTimeout(taglineTimerRef.current);
    taglineTimerRef.current = setTimeout(() => {
      taglineTapCount.current = 0;
    }, 1500);

    // Si ya hay 5+ logo taps y ahora 2 tagline taps, desbloquear
    if (logoTapCount.current >= 5 && taglineTapCount.current >= 2) {
      comboUnlock();
    }
  }, [onUnlock]);

  function comboUnlock() {
    logoTapCount.current = 0;
    taglineTapCount.current = 0;
    if (logoTimerRef.current) clearTimeout(logoTimerRef.current);
    if (taglineTimerRef.current) clearTimeout(taglineTimerRef.current);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onUnlock();
  }

  return { handleLogoPress, handleTaglinePress };
}
