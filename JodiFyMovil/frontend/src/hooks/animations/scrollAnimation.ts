import { useCallback, useRef } from 'react';
import { Animated, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

type ScrollHandler = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

export function useScrollAnimation() {
  const scrollY = useRef(new Animated.Value(0)).current;

  const onScroll: ScrollHandler = useCallback(
    (event) => {
      scrollY.setValue(event.nativeEvent.contentOffset.y);
    },
    [scrollY],
  );

  const fadeIn = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const fadeOut = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const translateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [50, 0],
    extrapolate: 'clamp',
  });

  const scale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0.95, 1],
    extrapolate: 'clamp',
  });

  return { scrollY, onScroll, fadeIn, fadeOut, translateY, scale };
}

export function useScrollProgress() {
  const scrollY = useRef(new Animated.Value(0)).current;

  const onScroll: ScrollHandler = useCallback(
    (event) => {
      const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
      const maxScroll = Math.max(contentSize.height - layoutMeasurement.height, 1);
      const progress = Math.min(Math.max(contentOffset.y / maxScroll, 0), 1);
      scrollY.setValue(progress);
    },
    [scrollY],
  );

  return { scrollProgress: scrollY, onScroll };
}

export function useParallax(factor: number = 0.5) {
  const scrollY = useRef(new Animated.Value(0)).current;

  const onScroll: ScrollHandler = useCallback(
    (event) => {
      scrollY.setValue(event.nativeEvent.contentOffset.y);
    },
    [scrollY],
  );

  const translateY = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [0, -300 * factor],
    extrapolate: 'clamp',
  });

  return { onScroll, translateY };
}
