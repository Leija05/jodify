import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, Animated, Easing, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Song } from '@lib/types';
import { pickCoverUrl } from '@lib/utils';
import { getSongPalette } from '@lib/palette';

interface DynamicBackgroundProps {
  song: Song | null;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
}

export const DynamicBackground = React.memo(
  React.forwardRef<View, DynamicBackgroundProps>(
    ({ song, intensity = 0.85, style }, ref) => {
      const coverUrl = useMemo(() => (song ? pickCoverUrl(song) : null), [song]);
      const palette = useMemo(() => getSongPalette(song), [song]);

      const fadeAnim = useRef(new Animated.Value(1)).current;
      const prevSongIdRef = useRef(song?.id);

      useEffect(() => {
        if (prevSongIdRef.current !== song?.id) {
          prevSongIdRef.current = song?.id;
          fadeAnim.setValue(0.2);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        }
      }, [song?.id, fadeAnim]);

      const primaryHex = palette.primary;
      const secondaryHex = palette.secondary;
      const accentHex = palette.accent;

      return (
        <View ref={ref} pointerEvents="none" style={[styles.container, style]}>
          {/* Base Dark Foundation tinted with song palette */}
          <View style={[styles.baseBackground, { backgroundColor: palette.ambientDark }]} />

          {/* Animated Mesh Layer */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
            <View style={[StyleSheet.absoluteFill, { opacity: Math.min(Math.max(intensity, 0.4), 1) }]}>
              {/* Cover Glow Background */}
              {coverUrl && (
                <Image
                  source={{ uri: coverUrl }}
                  style={[StyleSheet.absoluteFill, { opacity: 0.45 }]}
                  resizeMode="cover"
                  blurRadius={Platform.OS === 'ios' ? 45 : 30}
                />
              )}

              {/* Mesh Gradient 1: Top-Left Primary Radiant Bloom */}
              <LinearGradient
                colors={[
                  primaryHex + 'B3', // 70% opacity
                  primaryHex + '55',
                  primaryHex + '18',
                  'transparent',
                ]}
                locations={[0, 0.35, 0.7, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 0.8 }}
                style={StyleSheet.absoluteFill}
              />

              {/* Mesh Gradient 2: Center-Right Secondary Atmosphere */}
              <LinearGradient
                colors={[
                  secondaryHex + '99', // 60% opacity
                  secondaryHex + '40',
                  'transparent',
                ]}
                locations={[0.05, 0.5, 0.9]}
                start={{ x: 1, y: 0.15 }}
                end={{ x: 0.1, y: 0.85 }}
                style={StyleSheet.absoluteFill}
              />

              {/* Mesh Gradient 3: Bottom Accent Ambient */}
              <LinearGradient
                colors={[
                  'transparent',
                  accentHex + '35',
                  accentHex + '70',
                ]}
                locations={[0.2, 0.6, 1]}
                start={{ x: 0.15, y: 0.3 }}
                end={{ x: 0.85, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
          </Animated.View>

          {/* Soft Dynamic Vignette Overlay allowing ambient color glow across whole screen */}
          <LinearGradient
            colors={[
              'rgba(3, 5, 12, 0.12)',
              'rgba(3, 5, 12, 0.35)',
              'rgba(3, 5, 12, 0.62)',
              'rgba(3, 5, 12, 0.88)',
            ]}
            locations={[0, 0.35, 0.7, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      );
    }
  )
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: '#05050A',
  },
  baseBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#05050A',
  },
});

DynamicBackground.displayName = 'DynamicBackground';