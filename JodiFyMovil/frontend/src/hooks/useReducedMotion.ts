import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduced(value);
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      if (alive) setReduced(value);
    });

    return () => {
      alive = false;
      subscription?.remove?.();
    };
  }, []);

  return reduced;
}

export function getReducedMotionDuration(
  reduced: boolean,
  normalDuration: number,
  reducedDuration: number = 0
): number {
  return reduced ? reducedDuration : normalDuration;
}