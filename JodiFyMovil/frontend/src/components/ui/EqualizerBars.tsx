import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

interface Props {
  playing: boolean;
  bars?: number;
  height?: number;
  barWidth?: number;
  color?: string;
}

function randomHeights(count: number, min: number, max: number): number[] {
  return Array.from({ length: count }, () => min + Math.random() * (max - min));
}

export function EqualizerBars({ playing, bars = 5, height = 18, barWidth = 3, color }: Props) {
  const animations = useRef<Animated.Value[]>(
    Array.from({ length: bars }, () => new Animated.Value(0.35)),
  );
  const baseHeights = useRef(randomHeights(bars, 0.4, 0.9));
  const speeds = useRef(randomHeights(bars, 800, 1500));

  useEffect(() => {
    if (!playing) return;
    const seqs = animations.current.map((anim, i) =>
      Animated.sequence([
        Animated.timing(anim, {
          toValue: baseHeights.current[i],
          duration: speeds.current[i],
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.35,
          duration: speeds.current[i],
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const loop = Animated.loop(Animated.parallel(seqs));
    loop.start();
    return () => loop.stop();
  }, [playing]);

  useEffect(() => {
    if (playing) return;
    animations.current.forEach((a) => a.stopAnimation());
  }, [playing]);

  return (
    <View style={[styles.row, { height }]}>
      {animations.current.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              width: barWidth,
              backgroundColor: color ?? colors.primary,
              transform: [{ scaleY: anim }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
});
