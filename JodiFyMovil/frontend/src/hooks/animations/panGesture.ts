import { useCallback, useRef } from 'react';
import { Animated, Dimensions, PanResponder, PanResponderGestureState } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PanGestureConfig {
  onStart?: () => void;
  onMove?: (gestureState: PanResponderGestureState) => void;
  onEnd?: (gestureState: PanResponderGestureState) => void;
  onCancel?: () => void;
  threshold?: number;
  direction?: 'horizontal' | 'vertical' | 'both';
}

interface PanGestureReturn {
  panHandlers: any;
  translateX: Animated.Value;
  translateY: Animated.Value;
  isDragging: boolean;
}

export function usePanGesture({
  onStart,
  onMove,
  onEnd,
  onCancel,
  threshold = 5,
  direction = 'both',
}: PanGestureConfig): PanGestureReturn {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const isDraggingRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gestureState) => {
        const dx = Math.abs(gestureState.dx);
        const dy = Math.abs(gestureState.dy);
        if (direction === 'horizontal') return dx > threshold;
        if (direction === 'vertical') return dy > threshold;
        return dx > threshold || dy > threshold;
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        translateX.extractOffset();
        translateY.extractOffset();
        onStart?.();
      },
      onPanResponderMove: (_event, gestureState) => {
        if (direction !== 'vertical') translateX.setValue(gestureState.dx);
        if (direction !== 'horizontal') translateY.setValue(gestureState.dy);
        onMove?.(gestureState);
      },
      onPanResponderRelease: (_, gestureState) => {
        isDraggingRef.current = false;
        translateX.flattenOffset();
        translateY.flattenOffset();
        onEnd?.(gestureState);
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        onCancel?.();
      },
    })
  ).current;

  return {
    panHandlers: panResponder.panHandlers,
    translateX,
    translateY,
    isDragging: isDraggingRef.current,
  };
}

export function useSwipeable({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  springConfig = { damping: 18, stiffness: 260, useNativeDriver: true },
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  springConfig?: { damping: number; stiffness: number; useNativeDriver: boolean };
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipingRef = useRef(false);

  const springBack = useCallback(() => {
    if (isSwipingRef.current) return;
    Animated.spring(translateX, { toValue: 0, ...springConfig }).start();
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_event, gestureState) => Math.abs(gestureState.dx) > 5,
      onPanResponderGrant: () => {
        translateX.extractOffset();
        isSwipingRef.current = true;
      },
      onPanResponderMove: (_event, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();
        isSwipingRef.current = false;
        const { dx } = gestureState;

        if (dx > threshold) {
          Animated.spring(translateX, { toValue: threshold, ...springConfig }).start(() => {
            onSwipeRight?.();
            springBack();
          });
        } else if (dx < -threshold) {
          Animated.spring(translateX, { toValue: -threshold, ...springConfig }).start(() => {
            onSwipeLeft?.();
            springBack();
          });
        } else {
          springBack();
        }
      },
      onPanResponderTerminate: () => {
        isSwipingRef.current = false;
        springBack();
      },
    })
  ).current;

  return {
    panHandlers: panResponder.panHandlers,
    translateX,
  };
}

export function useDragToDismiss({
  onDismiss,
  threshold = 120,
  springConfig = { damping: 16, stiffness: 280, useNativeDriver: true },
}: {
  onDismiss: () => void;
  threshold?: number;
  springConfig?: { damping: number; stiffness: number; useNativeDriver: boolean };
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const isDismissingRef = useRef(false);

  const springBack = useCallback(() => {
    if (isDismissingRef.current) return;
    Animated.spring(translateY, { toValue: 0, ...springConfig }).start();
  }, [translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gestureState) => gestureState.dy > 3,
      onPanResponderGrant: () => {
        translateY.extractOffset();
        isDismissingRef.current = false;
      },
      onPanResponderMove: (_event, gestureState) => {
        const dy = gestureState.dy;
        if (dy > 0) {
          const clampedDy = Math.min(dy, SCREEN_HEIGHT * 0.55);
          translateY.setValue(clampedDy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset();
        const { dy, vy } = gestureState;

        if (dy > threshold || (dy > 60 && vy > 0.45)) {
          onDismiss();
        } else {
          springBack();
        }
      },
      onPanResponderTerminate: springBack,
    })
  ).current;

  return {
    panHandlers: panResponder.panHandlers,
    translateY,
  };
}