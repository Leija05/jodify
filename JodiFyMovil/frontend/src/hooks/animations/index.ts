import { useCallback, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { motion, useReducedMotion } from '../../theme';

export function useSpring() {
  const reduceMotion = useReducedMotion();

  const spring = useCallback(
    (value: Animated.Value, toValue: number, config?: { damping?: number; stiffness?: number }) => {
      if (reduceMotion) {
        value.setValue(toValue);
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        Animated.spring(value, {
          toValue,
          ...motion.springDefault,
          ...(config?.damping != null ? { damping: config.damping } : null),
          ...(config?.stiffness != null ? { stiffness: config.stiffness } : null),
          useNativeDriver: true,
        }).start(() => resolve());
      });
    },
    [reduceMotion]
  );

  return { spring };
}

export function useTiming() {
  const reduceMotion = useReducedMotion();

  const timing = useCallback(
    (value: Animated.Value, toValue: number, duration?: number, easing?: (t: number) => number) => {
      if (reduceMotion) {
        value.setValue(toValue);
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        Animated.timing(value, {
          toValue,
          duration: duration ?? motion.duration.normal,
          easing: easing ?? Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => resolve());
      });
    },
    [reduceMotion]
  );

  return { timing };
}

export function useParallel() {
  const parallel = useCallback(async (animations: (() => Promise<void>)[]) => {
    await Promise.all(animations.map((a) => a()));
  }, []);

  return { parallel };
}

export function useStagger() {
  const { spring } = useSpring();

  const stagger = useCallback(
    async (
      values: Animated.Value[],
      toValue: number,
      delay: number,
      config?: { damping?: number; stiffness?: number }
    ) => {
      await Promise.all(
        values.map((value, index) =>
          new Promise<void>((resolve) => {
            setTimeout(() => {
              spring(value, toValue, config).then(resolve);
            }, index * delay);
          })
        )
      );
    },
    [spring]
  );

  return { stagger };
}

export function useFadeIn() {
  const { timing } = useTiming();
  const opacity = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback(
    (duration?: number) => timing(opacity, 1, duration),
    [timing]
  );

  const fadeOut = useCallback(
    (duration?: number) => timing(opacity, 0, duration),
    [timing]
  );

  return { opacity, fadeIn, fadeOut };
}

export function useSlideUp() {
  const { timing } = useTiming();
  const translateY = useRef(new Animated.Value(50)).current;

  const slideUp = useCallback(
    (duration?: number) => timing(translateY, 0, duration),
    [timing]
  );

  const slideDown = useCallback(
    (duration?: number) => timing(translateY, 50, duration),
    [timing]
  );

  return { translateY, slideUp, slideDown };
}

export function useScale() {
  const { spring } = useSpring();
  const scale = useRef(new Animated.Value(1)).current;

  const scaleTo = useCallback(
    (toValue: number, config?: { damping?: number; stiffness?: number }) => spring(scale, toValue, config),
    [spring]
  );

  return { scale, scaleTo };
}