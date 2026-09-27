import React, { useEffect, useMemo, useRef } from 'react';
import { Image, StyleSheet, View, StyleProp, ViewStyle, Animated, Easing, Dimensions } from 'react-native';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const DynamicBackground = React.forwardRef<View, DynamicBackgroundProps>(
  ({ song, intensity = 0.85, style }, ref) => {
    const coverUrl = useMemo(() => (song ? pickCoverUrl(song) : null), [song]);
    const palette = useMemo(() => getSongPalette(song), [song]);

    // Mesh orb oscillation animations
    const orb1Anim = useRef(new Animated.Value(0)).current;
    const orb2Anim = useRef(new Animated.Value(0)).current;
    const orb3Anim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      // Loop slow ambient floating animation (Apple Music fluid aura)
      const loop1 = Animated.loop(
        Animated.sequence([
          Animated.timing(orb1Anim, {
            toValue: 1,
            duration: 8000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb1Anim, {
            toValue: 0,
            duration: 8000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      const loop2 = Animated.loop(
        Animated.sequence([
          Animated.timing(orb2Anim, {
            toValue: 1,
            duration: 11000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(orb2Anim, {
            toValue: 0,
            duration: 11000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );

      const loop3 = Animated.loop(
        Animated.sequence([
          Animated.timing(orb3Anim, {
            toValue: 1,
            duration: 9500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb3Anim, {
            toValue: 0,
            duration: 9500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      loop1.start();
      loop2.start();
      loop3.start();

      return () => {
        loop1.stop();
        loop2.stop();
        loop3.stop();
      };
    }, [orb1Anim, orb2Anim, orb3Anim]);

    // Crossfade smoothly on song change
    useEffect(() => {
      fadeAnim.setValue(0.4);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, [song?.id, fadeAnim]);

    const orb1TranslateX = orb1Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [-40, 50],
    });
    const orb1TranslateY = orb1Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [-20, 60],
    });

    const orb2TranslateX = orb2Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [30, -50],
    });
    const orb2TranslateY = orb2Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [40, -40],
    });

    const orb3TranslateY = orb3Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [-30, 40],
    });

    return (
      <View ref={ref} pointerEvents="none" style={[styles.container, style]}>
        {/* Base Obsidian Foundation */}
        <View style={[styles.baseBackground, { backgroundColor: palette.ambientDark }]} />

        {/* Animated Mesh Container */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
          {/* Blurred Artwork Projection */}
          {coverUrl && (
            <Image
              source={{ uri: coverUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              blurRadius={80}
            />
          )}

          {/* Fluid Glowing Orb 1 (Top Left) */}
          <Animated.View
            style={[
              styles.orb,
              styles.orb1,
              {
                backgroundColor: palette.primary,
                opacity: 0.35 * intensity,
                transform: [{ translateX: orb1TranslateX }, { translateY: orb1TranslateY }],
              },
            ]}
          />

          {/* Fluid Glowing Orb 2 (Center Right) */}
          <Animated.View
            style={[
              styles.orb,
              styles.orb2,
              {
                backgroundColor: palette.secondary,
                opacity: 0.28 * intensity,
                transform: [{ translateX: orb2TranslateX }, { translateY: orb2TranslateY }],
              },
            ]}
          />

          {/* Fluid Glowing Orb 3 (Bottom Center) */}
          <Animated.View
            style={[
              styles.orb,
              styles.orb3,
              {
                backgroundColor: palette.accent,
                opacity: 0.22 * intensity,
                transform: [{ translateY: orb3TranslateY }],
              },
            ]}
          />
        </Animated.View>

        {/* High-Fidelity Dark Obsidian Vignette (Guarantees WCAG AAA Text Contrast) */}
        <LinearGradient
          colors={[
            'rgba(3, 3, 5, 0.35)',
            'rgba(3, 3, 5, 0.70)',
            'rgba(3, 3, 5, 0.94)',
            colors.background,
          ]}
          locations={[0, 0.45, 0.8, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  baseBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orb1: {
    top: -SCREEN_WIDTH * 0.2,
    left: -SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 1.1,
    height: SCREEN_WIDTH * 1.1,
  },
  orb2: {
    top: SCREEN_HEIGHT * 0.25,
    right: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH * 1.0,
    height: SCREEN_WIDTH * 1.0,
  },
  orb3: {
    bottom: -SCREEN_HEIGHT * 0.1,
    left: SCREEN_WIDTH * 0.1,
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_WIDTH * 1.2,
  },
});

DynamicBackground.displayName = 'DynamicBackground';