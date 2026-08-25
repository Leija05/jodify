import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import type { Song } from '../../lib/types';
import { colors } from '../../theme';
import { CoverArt } from './SongRow';

interface Props {
  song: Song;
  size: number;
  playing: boolean;
}

export function VinylDisc({ song, size, playing }: Props) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!playing) {
      rotation.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [playing, rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const grooves = Array.from({ length: 6 }, (_, i) => ({
    size: size * (0.34 + i * 0.09),
    opacity: 0.10 - i * 0.012,
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}>
        {grooves.map((g, i) => (
          <View
            key={i}
            style={[
              styles.groove,
              {
                width: g.size,
                height: g.size,
                borderRadius: g.size / 2,
                opacity: g.opacity,
              },
            ]}
          />
        ))}
        <View style={[styles.hole, { width: size * 0.07, height: size * 0.07, borderRadius: size * 0.035 }]} />
      </View>
      <View style={styles.spinWrap}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <CoverArt song={song} size={size * 0.42} radiusSize={size * 0.21} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    position: 'absolute',
    backgroundColor: '#0b0b12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.7,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  groove: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  hole: {
    backgroundColor: colors.primary,
  },
  spinWrap: {
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});