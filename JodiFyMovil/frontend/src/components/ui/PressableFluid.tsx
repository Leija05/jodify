import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { motion, useReducedMotion } from '../../theme';

type HitSlop = NonNullable<React.ComponentProps<typeof Pressable>['hitSlop']>;

export type HapticType =
  | 'light' | 'medium' | 'heavy'
  | 'selection'
  | 'success' | 'warning' | 'error';

/** `haptic` acepta `true` (impacto ligero por defecto) o un tipo explícito. */
export type HapticProp = boolean | HapticType;

const HAPTIC_MAP: Record<HapticType, Haptics.ImpactFeedbackStyle | Haptics.NotificationFeedbackType> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
  selection: Haptics.ImpactFeedbackStyle.Light,
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

function fireHaptic(haptic: HapticProp) {
  if (!haptic) return;
  const type: HapticType = haptic === true ? 'light' : haptic;
  const mapped = HAPTIC_MAP[type];
  if (!mapped) return;
  try {
    if (type === 'light' || type === 'medium' || type === 'heavy' || type === 'selection') {
      void Haptics.impactAsync(mapped as Haptics.ImpactFeedbackStyle);
    } else {
      void Haptics.notificationAsync(mapped as Haptics.NotificationFeedbackType);
    }
  } catch {
    // Los hápticos no son críticos: nunca deben romper la interacción.
  }
}

export interface Props {
  children: React.ReactNode;
  onPress?: (() => void) | undefined;
  onLongPress?: (() => void) | undefined;
  onPressIn?: (() => void) | undefined;
  onPressOut?: (() => void) | undefined;
  disabled?: boolean | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  /** `true` = light. También acepta 'light' | 'medium' | … */
  haptic?: HapticProp | undefined;
  scaleTo?: number | undefined;
  pressOpacity?: number | undefined;
  hitSlop?: HitSlop | number | undefined;
  testID?: string | undefined;
}

function resolveHitSlop(hitSlop?: HitSlop | number): HitSlop | undefined {
  if (hitSlop == null) return undefined;
  if (typeof hitSlop === 'number') {
    return { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop };
  }
  return hitSlop;
}

export function PressableFluid({
  children,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled,
  style,
  haptic = true,
  scaleTo = 0.96,
  pressOpacity = 0.9,
  hitSlop,
  testID,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReducedMotion();

  const animateTo = useCallback(
    (toScale: number, toOpacity: number) => {
      if (reduceMotion) {
        scale.setValue(toScale);
        opacity.setValue(toOpacity);
        return;
      }
      Animated.parallel([
        Animated.spring(scale, { toValue: toScale, ...motion.springQuick, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: toOpacity, duration: 90, useNativeDriver: true }),
      ]).start();
    },
    [scale, opacity, reduceMotion],
  );

  const handlePress = useCallback(() => {
    if (disabled) return;
    fireHaptic(haptic);
    onPress?.();
  }, [disabled, haptic, onPress]);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale }], opacity },
        style,
      ]}
      testID={testID}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress}
        onPressIn={() => {
          animateTo(scaleTo, pressOpacity);
          onPressIn?.();
        }}
        onPressOut={() => {
          animateTo(1, 1);
          onPressOut?.();
        }}
        disabled={disabled}
        hitSlop={resolveHitSlop(hitSlop)}
        style={styles.pressable}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Botón de icono con área táctil garantizada (>=48dp).
 * A diferencia de PressableFluid puro, centra el contenido y no estira.
 */
export function IconButton({
  icon,
  size = 24,
  color,
  onPress,
  haptic = 'light',
  hitSlop = 10,
  style,
  disabled,
  testID,
}: {
  icon: React.ReactNode;
  size?: number | undefined;
  color?: string | undefined;
  onPress?: (() => void) | undefined;
  haptic?: HapticProp | undefined;
  hitSlop?: number | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  disabled?: boolean | undefined;
  testID?: string | undefined;
}) {
  void size;
  void color;
  return (
    <PressableFluid
      onPress={onPress}
      haptic={haptic}
      hitSlop={hitSlop}
      disabled={disabled}
      style={[styles.iconButton, style]}
      testID={testID}
    >
      {icon}
    </PressableFluid>
  );
}

export function TextButton({
  children,
  onPress,
  haptic = 'light',
  style,
  disabled,
  testID,
}: {
  children: React.ReactNode;
  onPress?: (() => void) | undefined;
  haptic?: HapticProp | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  disabled?: boolean | undefined;
  testID?: string | undefined;
}) {
  return (
    <PressableFluid
      onPress={onPress}
      haptic={haptic}
      hitSlop={8}
      disabled={disabled}
      style={[styles.textButton, style]}
      testID={testID}
    >
      {children}
    </PressableFluid>
  );
}

const styles = StyleSheet.create({
  container: {},
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButton: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
