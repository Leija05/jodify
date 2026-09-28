import React, { useEffect, useMemo } from 'react';
import { View, StyleProp, ViewStyle, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '@theme';

interface EqualizerBarsProps {
  playing: boolean;
  bars?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  speeds?: number[];
  amplitudes?: number[];
}

const DEFAULT_BARS = 5;
const DEFAULT_HEIGHT = 20;
const DEFAULT_BAR_WIDTH = 3;
const DEFAULT_GAP = 3;

export const EqualizerBars = React.forwardRef<View, EqualizerBarsProps>(
  (
    {
      playing,
      bars = DEFAULT_BARS,
      height = DEFAULT_HEIGHT,
      barWidth = DEFAULT_BAR_WIDTH,
      gap = DEFAULT_GAP,
      color = colors.white,
      style,
      speeds,
      amplitudes,
    },
    ref
  ) => {
    const animatedValues = useMemo(
      () => Array.from({ length: bars }, () => new Animated.Value(0.1)),
      [bars]
    );

    const barSpeeds = speeds ?? [0.8, 1.2, 0.9, 1.1, 1.0, 1.3, 0.7, 1.15, 0.85, 1.05];
    const barAmplitudes = amplitudes ?? [0.6, 0.8, 0.7, 0.9, 0.75, 0.85, 0.65, 0.9, 0.7, 0.8];

    useEffect(() => {
      if (!playing) {
        animatedValues.forEach((v) => v.setValue(0.1));
        return;
      }

      const animations = animatedValues.map((v, i) => {
        const speedVal = barSpeeds[i % barSpeeds.length] ?? 1.0;
        const speed = speedVal * 800;
        const ampVal = Math.max(0.2, barAmplitudes[i % barAmplitudes.length] ?? 0.75);

        return Animated.loop(
          Animated.sequence([
            Animated.timing(v, {
              toValue: ampVal,
              duration: speed,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(v, {
              toValue: 0.1,
              duration: speed,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
      });

      animations.forEach((a) => a.start());

      return () => {
        animations.forEach((a) => a.stop());
      };
    }, [playing, animatedValues, barSpeeds, barAmplitudes]);

    return (
      <View
        ref={ref}
        style={[
          styles.container,
          { gap, height },
          style,
        ]}
      >
        {animatedValues.map((animatedValue, i) => (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                width: barWidth,
                height,
                backgroundColor: color,
                transform: [{ scaleY: animatedValue }],
                transformOrigin: 'bottom',
              },
            ]}
          />
        ))}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 2,
  },
});

EqualizerBars.displayName = 'EqualizerBars';