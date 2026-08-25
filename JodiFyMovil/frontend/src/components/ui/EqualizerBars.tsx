import React, { useEffect, useMemo, useRef } from 'react';
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

function randomSpeeds(count: number, min: number, max: number): number[] {
  return Array.from({ length: count }, () => min + Math.random() * (max - min));
}

export function EqualizerBars({ playing, bars = 5, height = 18, barWidth = 3, color }: Props) {
  const animationsRef = useRef<Animated.Value[] | null>(null);
  const baseHeightsRef = useRef<number[]>([]);
  const speedsRef = useRef<number[]>([]);
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const mountedRef = useRef(true);
  const [initialized, setInitialized] = React.useState(false);

  // Initialize refs only once
  useEffect(() => {
    if (!animationsRef.current) {
      animationsRef.current = Array.from({ length: bars }, () => new Animated.Value(0.35));
      baseHeightsRef.current = randomHeights(bars, 0.4, 0.9);
      speedsRef.current = randomSpeeds(bars, 800, 1500);
      setInitialized(true);
    }
    return () => {
      mountedRef.current = false;
    };
  }, [bars]);

  // Handle playing state changes
  useEffect(() => {
    if (!mountedRef.current) return;
    const animations = animationsRef.current;
    const baseHeights = baseHeightsRef.current;
    const speeds = speedsRef.current;
    
    if (!animations || animations.length !== bars) return;

    if (playing) {
      const seqs = animations.map((anim, i) =>
        Animated.sequence([
          Animated.timing(anim, {
            toValue: baseHeights[i] ?? 0.6,
            duration: speeds[i] ?? 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.35,
            duration: speeds[i] ?? 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      
      const parallel = Animated.parallel(seqs);
      loopRef.current = Animated.loop(parallel);
      loopRef.current.start();
    } else {
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current = null;
      }
      animations.forEach((a) => a.stopAnimation());
    }
    
    return () => {
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current = null;
      }
      animations.forEach((a) => a.stopAnimation());
    };
  }, [playing, bars]);

// Memoize bar styles
  const barStyles = useMemo(() => {
    const baseStyle = { width: barWidth, backgroundColor: color ?? colors.primary };
    return (animationsRef.current ?? []).map((anim) => [
      styles.bar,
      {
        ...baseStyle,
        transform: [{ scaleY: anim }],
      },
    ]);
  }, [barWidth, color, initialized]);

  return (
    <View style={[styles.row, { height }]}>
      {barStyles.map((style, i) => (
        <Animated.View key={i} style={style} />
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