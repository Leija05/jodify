import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, Animated, Easing, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@theme';
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
          fadeAnim.setValue(0.7);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 350,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start();
        }
      }, [song?.id, fadeAnim]);

      const primaryHex = palette.primary;
      const secondaryHex = palette.secondary;
      const accentHex = palette.accent;

      return (
        <View ref={ref} pointerEvents="none" style={[styles.container, style]}>
          {/* Base Dark Foundation */}
          <View style={[styles.baseBackground, { backgroundColor: palette.ambientDark }]} />

          {/* Animated Mesh Layer */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
            <View style={[StyleSheet.absoluteFill, { opacity: Math.min(Math.max(intensity, 0.1), 1) }]}>
              {/* Subtle Cover Glow on iOS only (avoid CPU blur on Android) */}
              {coverUrl && Platform.OS === 'ios' && (
              <Image
                source={{ uri: coverUrl }}
                style={[StyleSheet.absoluteFill, { opacity: 0.2 }]}
                resizeMode="cover"
                blurRadius={30}
              />
            )}

            {/* Mesh Gradient 1: Top-Left Primary Radiant Glow */}
            <LinearGradient
              colors={[
                primaryHex + '55',
                primaryHex + '25',
                'transparent',
              ]}
              locations={[0, 0.45, 0.85]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.85, y: 0.75 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Mesh Gradient 2: Center-Right Secondary Atmosphere */}
            <LinearGradient
              colors={[
                secondaryHex + '40',
                secondaryHex + '15',
                'transparent',
              ]}
              locations={[0.1, 0.5, 0.9]}
              start={{ x: 1, y: 0.2 }}
              end={{ x: 0.15, y: 0.9 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Mesh Gradient 3: Bottom Accent Ambient */}
            <LinearGradient
              colors={[
                'transparent',
                accentHex + '18',
                accentHex + '35',
              ]}
              locations={[0.3, 0.7, 1]}
              start={{ x: 0.1, y: 0.4 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </Animated.View>

          {/* Vignette Overlay for Crisp Contrast */}
          <LinearGradient
            colors={[
              'rgba(3, 3, 5, 0.25)',
              'rgba(3, 3, 5, 0.65)',
              'rgba(3, 3, 5, 0.92)',
              colors.background,
            ]}
            locations={[0, 0.4, 0.8, 1]}
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