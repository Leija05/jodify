import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import type { Song } from '../../lib/types';
import { pickCoverUrl } from '../../lib/utils';

interface Props {
  song: Song | null | undefined;
  intensity?: number;
}

/**
 * Fondo dinámico tipo "Neon Obsidian": portada difuminada + viñeta + float sutil.
 */
export function DynamicBackground({ song, intensity = 0.85 }: Props) {
  const url = song ? pickCoverUrl(song) : null;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 15000,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 15000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  const interpolated = float.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.08],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {url ? (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: interpolated }] }]}>
          <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </Animated.View>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(5,5,7,${intensity})` }]} />
      <View style={[StyleSheet.absoluteFill, styles.vignette]} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#0a0a10',
  },
  vignette: {
    backgroundColor: 'rgba(5,5,7,0.35)',
  },
});