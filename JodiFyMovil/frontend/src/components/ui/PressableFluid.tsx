import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from '@hooks/useReducedMotion';
import { motion } from '@theme';

type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

interface PressableFluidProps extends Omit<React.ComponentPropsWithoutRef<typeof Pressable>, 'onPress' | 'style' | 'children'> {
  children: React.ReactNode;
  onPress?: (() => void) | undefined;
  haptic?: HapticType | false | undefined;
  hitSlop?: number | { top: number; bottom: number; left: number; right: number };
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  testID?: string;
  onLongPress?: (() => void) | undefined;
  onPressIn?: (() => void) | undefined;
  onPressOut?: (() => void) | undefined;
}

const DEFAULT_SCALE = 0.96;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PressableFluid = React.forwardRef<View, PressableFluidProps>(
  (
    {
      children,
      onPress,
      haptic = 'light',
      hitSlop = 0,
      disabled = false,
      style,
      contentStyle,
      scaleTo = DEFAULT_SCALE,
      testID,
      onLongPress,
      onPressIn,
      onPressOut,
      ...props
    },
    ref
  ) => {
    const reduced = useReducedMotion();
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    const animatePress = useCallback(
      (pressing: boolean) => {
        if (reduced) return;
        const targetScale = pressing ? scaleTo : 1;
        const targetOpacity = pressing ? 0.7 : 1;
        Animated.parallel([
          Animated.spring(scale, { toValue: targetScale, ...motion.springQuick, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: targetOpacity, duration: motion.duration.fast, useNativeDriver: true }),
        ]).start();
      },
      [reduced, scaleTo]
    );

    const handlePressIn = useCallback(() => {
      if (disabled) return;
      animatePress(true);
      onPressIn?.();
    }, [animatePress, disabled, onPressIn]);

    const handlePressOut = useCallback(() => {
      animatePress(false);
      onPressOut?.();
    }, [animatePress, onPressOut]);

    const handlePress = useCallback(() => {
      if (disabled) return;
      if (haptic) {
        if (haptic === 'selection') {
          Haptics.selectionAsync();
        } else if (haptic === 'success') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (haptic === 'warning') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else if (haptic === 'error') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else if (haptic === 'heavy') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else if (haptic === 'medium') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
      onPress?.();
    }, [disabled, haptic, onPress]);

    return (
      <AnimatedPressable
        ref={ref as any}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={onLongPress}
        disabled={disabled}
        hitSlop={hitSlop}
        style={[
          style,
          contentStyle,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
        testID={testID}
        {...props}
      >
        {children}
      </AnimatedPressable>
    );
  }
);

PressableFluid.displayName = 'PressableFluid';