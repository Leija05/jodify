import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type HitSlop = NonNullable<React.ComponentProps<typeof Pressable>['hitSlop']>;

interface Props {
  children: React.ReactNode;
  onPress?: (() => void) | undefined;
  onLongPress?: (() => void) | undefined;
  disabled?: boolean | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  haptic?: boolean | undefined;
  hapticStyle?: Haptics.NotificationFeedbackType | Haptics.ImpactFeedbackStyle | undefined;
  scaleTo?: number | undefined;
  hitSlop?: HitSlop | undefined;
}

export function PressableScale({ children, onPress, onLongPress, disabled, style, haptic = false, hapticStyle, scaleTo = 0.95, hitSlop }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (to: number) => {
      Animated.spring(scale, {
        toValue: to,
        useNativeDriver: true,
        speed: 40,
        bounciness: 0,
      }).start();
    },
    [scale],
  );

  const handlePress = useCallback(() => {
    if (haptic) {
      if (hapticStyle && typeof hapticStyle === 'number') {
        void Haptics.notificationAsync(hapticStyle as Haptics.NotificationFeedbackType);
      } else {
        void Haptics.impactAsync((hapticStyle as Haptics.ImpactFeedbackStyle) ?? Haptics.ImpactFeedbackStyle.Light);
      }
    }
    onPress?.();
  }, [haptic, hapticStyle, onPress]);

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress}
        disabled={disabled}
        onPressIn={() => animateTo(scaleTo)}
        onPressOut={() => animateTo(1)}
        hitSlop={hitSlop}
        style={styles.pressable}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
});