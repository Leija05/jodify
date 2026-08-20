import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  hapticStyle?: Haptics.NotificationFeedbackType | Haptics.ImpactFeedbackStyle;
  scaleTo?: number;
}

export function PressableScale({ children, onPress, onLongPress, disabled, style, haptic = false, hapticStyle, scaleTo = 0.95 }: Props) {
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