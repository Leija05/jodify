import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { PressableFluid } from '@components/ui/PressableFluid';
import type { Song } from '@lib/types';
import { pickCoverUrl } from '@lib/utils';
import { getSongPalette } from '@lib/palette';
import { typography } from '@theme';

interface AudiophileTurntableProps {
  song: Song;
  isPlaying: boolean;
  vinylScale?: Animated.Value;
  onToggleMode: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sizing calibrated for mobile viewport so deck is centered and disc center-label is exposed
const SLEEVE_SIZE = Math.min(270, Math.max(220, Math.round(SCREEN_WIDTH * 0.64)));
const DISC_SIZE = Math.round(SLEEVE_SIZE * 0.94);
// Peek offset: 42% of sleeve width exposes ~110px of the vinyl, showing the iconic center label & spindle
const PEEK_OFFSET = Math.round(SLEEVE_SIZE * 0.42);
const TOTAL_DECK_WIDTH = SLEEVE_SIZE + PEEK_OFFSET;
const LABEL_SIZE = Math.round(DISC_SIZE * 0.38);
const SPINDLE_SIZE = Math.round(DISC_SIZE * 0.068);

export const AudiophileTurntable = React.memo(
  React.forwardRef<View, AudiophileTurntableProps>(
    ({ song, isPlaying, vinylScale, onToggleMode }, ref) => {
      const coverUrl = useMemo(() => pickCoverUrl(song), [song]);
      const palette = useMemo(() => getSongPalette(song), [song]);

      // Vinyl continuous rotation (16s matching web app jf-vinyl-rotate)
      const rotation = useRef(new Animated.Value(0)).current;
      // Spring slide-out animation (disc emerges from sleeve)
      const slideAnim = useRef(new Animated.Value(0)).current;

      useEffect(() => {
        let anim: Animated.CompositeAnimation | null = null;
        if (isPlaying) {
          anim = Animated.loop(
            Animated.timing(rotation, {
              toValue: 1,
              duration: 16000,
              easing: Easing.linear,
              useNativeDriver: true,
            })
          );
          anim.start();
        } else {
          rotation.stopAnimation();
        }
        return () => {
          if (anim) anim.stop();
        };
      }, [isPlaying, rotation]);

      // Spring slide-out reveal on mount
      useEffect(() => {
        Animated.spring(slideAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 90,
          mass: 1,
          useNativeDriver: true,
        }).start();
      }, [slideAnim]);

      const rotateInterpolation = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      });

      const slideInterpolation = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-PEEK_OFFSET * 0.7, 0],
      });

      const discTransform = vinylScale
        ? [
            { scale: vinylScale },
            { translateX: slideInterpolation },
            { rotate: rotateInterpolation },
          ]
        : [
            { translateX: slideInterpolation },
            { rotate: rotateInterpolation },
          ];

      return (
        <View ref={ref} style={styles.outerWrapper}>
          {/* Interactive Vinyl Deck Container (matching web app's jf-vinyl-deck) */}
          <PressableFluid onPress={onToggleMode} haptic="medium" style={styles.pressableDeck}>
            <View
              style={[
                styles.vinylDeckContainer,
                {
                  width: TOTAL_DECK_WIDTH,
                  height: SLEEVE_SIZE,
                },
              ]}
            >
              {/* =========================================================================
                  1. REALISTIC VINYL DISC (Peeking out from the sleeve & spinning)
                     Matching .jf-vinyl-disc from web app
                 ========================================================================= */}
              <Animated.View
                style={[
                  styles.vinylDisc,
                  {
                    width: DISC_SIZE,
                    height: DISC_SIZE,
                    borderRadius: DISC_SIZE / 2,
                    left: PEEK_OFFSET,
                    top: Math.round((SLEEVE_SIZE - DISC_SIZE) / 2),
                    transform: discTransform,
                  },
                ]}
              >
                {/* SVG Grooves & Deep Black Acetate Body */}
                <Svg
                  width={DISC_SIZE}
                  height={DISC_SIZE}
                  viewBox={`0 0 ${DISC_SIZE} ${DISC_SIZE}`}
                  style={StyleSheet.absoluteFill}
                >
                  <Defs>
                    {/* Deep Glossy Black Acetate Body (not neon) */}
                    <RadialGradient id="vinylBody" cx="50%" cy="50%" rx="50%" ry="50%">
                      <Stop offset="0%" stopColor="#08080C" />
                      <Stop offset="25%" stopColor="#12131A" />
                      <Stop offset="32%" stopColor="#0A0B0E" />
                      <Stop offset="55%" stopColor="#151620" />
                      <Stop offset="72%" stopColor="#0D0E14" />
                      <Stop offset="90%" stopColor="#181924" />
                      <Stop offset="98%" stopColor="#0E0F15" />
                      <Stop offset="100%" stopColor="#050508" />
                    </RadialGradient>

                    {/* Butterfly Specular Light Sheen (Subtle neutral white) */}
                    <SvgLinearGradient id="vinylLightSheen1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="rgba(255,255,255,0.11)" />
                      <Stop offset="25%" stopColor="rgba(255,255,255,0.06)" />
                      <Stop offset="48%" stopColor="rgba(0,0,0,0)" />
                      <Stop offset="52%" stopColor="rgba(0,0,0,0)" />
                      <Stop offset="75%" stopColor="rgba(255,255,255,0.06)" />
                      <Stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
                    </SvgLinearGradient>

                    <SvgLinearGradient id="vinylLightSheen2" x1="100%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                      <Stop offset="25%" stopColor="rgba(255,255,255,0.04)" />
                      <Stop offset="48%" stopColor="rgba(0,0,0,0)" />
                      <Stop offset="52%" stopColor="rgba(0,0,0,0)" />
                      <Stop offset="75%" stopColor="rgba(255,255,255,0.04)" />
                      <Stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
                    </SvgLinearGradient>
                  </Defs>

                  {/* Base Vinyl Slab */}
                  <Circle
                    cx={DISC_SIZE / 2}
                    cy={DISC_SIZE / 2}
                    r={DISC_SIZE / 2 - 1}
                    fill="url(#vinylBody)"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1.2"
                  />

                  {/* Concentric High-Density Audio Micro-Grooves */}
                  <G opacity="0.75">
                    <Circle cx={DISC_SIZE / 2} cy={DISC_SIZE / 2} r={DISC_SIZE * 0.468} stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" fill="none" />
                    <Circle cx={DISC_SIZE / 2} cy={DISC_SIZE / 2} r={DISC_SIZE * 0.448} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" fill="none" />
                    <Circle cx={DISC_SIZE / 2} cy={DISC_SIZE / 2} r={DISC_SIZE * 0.428} stroke="rgba(255,255,255,0.09)" strokeWidth="0.7" fill="none" />
                    {/* Track Separator 1 */}
                    <Circle cx={DISC_SIZE / 2} cy={DISC_SIZE / 2} r={DISC_SIZE * 0.405} stroke="rgba(0,0,0,0.9)" strokeWidth="2.2" fill="none" />

                    <Circle cx={DISC_SIZE / 2} cy={DISC_SIZE / 2} r={DISC_SIZE * 0.385} stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" fill="none" />
                    <Circle cx={DISC_SIZE / 2} cy={DISC_SIZE / 2} r={DISC_SIZE * 0.362} stroke="rgba(255,255,255,0.11)" strokeWidth="0.8" fill="none" />
                    <Circle cx={DISC_SIZE / 2} cy={DISC_SIZE / 2} r={DISC_SIZE * 0.338} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" fill="none" />
                    {/* Track Separator 2 */}
                    <Circle cx={DISC_SIZE / 2} cy={DISC_SIZE / 2} r={DISC_SIZE * 0.315} stroke="rgba(0,0,0,0.9)" strokeWidth="2.2" fill="none" />

                    <Circle cx={DISC_SIZE / 2} cy={DISC_SIZE / 2} r={DISC_SIZE * 0.290} stroke="rgba(255,255,255,0.07)" strokeWidth="0.6" fill="none" />
                    <Circle cx={DISC_SIZE / 2} cy={DISC_SIZE / 2} r={DISC_SIZE * 0.262} stroke="rgba(255,255,255,0.10)" strokeWidth="0.7" fill="none" />
                    <Circle cx={DISC_SIZE / 2} cy={DISC_SIZE / 2} r={DISC_SIZE * 0.235} stroke="rgba(255,255,255,0.09)" strokeWidth="0.8" fill="none" />

                    {/* Run-out groove into center */}
                    <Circle cx={DISC_SIZE / 2} cy={DISC_SIZE / 2} r={LABEL_SIZE / 2 + 5} stroke="rgba(255,255,255,0.16)" strokeWidth="1" fill="none" />
                  </G>

                  {/* Specular Dual Sheen Rings */}
                  <Circle cx={DISC_SIZE / 2} cy={DISC_SIZE / 2} r={DISC_SIZE / 2 - 2} fill="url(#vinylLightSheen1)" />
                  <Circle cx={DISC_SIZE / 2} cy={DISC_SIZE / 2} r={DISC_SIZE / 2 - 2} fill="url(#vinylLightSheen2)" />
                </Svg>

                {/* Center Album Art Label (matching .jf-vinyl-center-label) */}
                <View
                  style={[
                    styles.centerLabel,
                    {
                      width: LABEL_SIZE,
                      height: LABEL_SIZE,
                      borderRadius: LABEL_SIZE / 2,
                      marginTop: -LABEL_SIZE / 2,
                      marginLeft: -LABEL_SIZE / 2,
                    },
                  ]}
                >
                  {coverUrl ? (
                    <Image
                      source={{ uri: coverUrl }}
                      style={[styles.labelImage, { borderRadius: LABEL_SIZE / 2 }]}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.labelFallback, { borderRadius: LABEL_SIZE / 2 }]}>
                      <Ionicons name="disc" size={LABEL_SIZE * 0.45} color="rgba(255,255,255,0.85)" />
                    </View>
                  )}

                  {/* Center Spindle Hole (matching .jf-vinyl-spindle) */}
                  <View
                    style={[
                      styles.spindleHole,
                      {
                        width: SPINDLE_SIZE,
                        height: SPINDLE_SIZE,
                        borderRadius: SPINDLE_SIZE / 2,
                        marginTop: -SPINDLE_SIZE / 2,
                        marginLeft: -SPINDLE_SIZE / 2,
                      },
                    ]}
                  />
                </View>
              </Animated.View>

              {/* =========================================================================
                  2. ALBUM COVER SLEEVE (matching .jf-vinyl-sleeve in front of the disc)
                 ========================================================================= */}
              <View
                style={[
                  styles.coverSleeve,
                  {
                    width: SLEEVE_SIZE,
                    height: SLEEVE_SIZE,
                  },
                ]}
              >
                {/* Full Album Cover Image */}
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={styles.sleeveImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.sleeveFallback, { backgroundColor: palette.primary || '#181A26' }]} />
                )}

                {/* Left Cardboard Spine Highlight */}
                <View style={styles.sleeveLeftSpine} />

                {/* Right Edge Inner Pocket Shadow (Depth where vinyl emerges) */}
                <View style={styles.sleevePocketShadow} />

                {/* Diagonal Specular Cardboard Sheen (matching .jf-sleeve-sheen) */}
                <View style={styles.sleeveGlossSheen} pointerEvents="none" />
              </View>
            </View>
          </PressableFluid>

          {/* Mode Switch Badge Hint below the deck */}
          <PressableFluid onPress={onToggleMode} haptic="light" style={styles.modeHintPill}>
            <Ionicons name="disc" size={13} color="#00F0FF" />
            <Text style={styles.hintText}>Modo Vinilo · Toca para ver carátula</Text>
          </PressableFluid>
        </View>
      );
    }
  )
);

AudiophileTurntable.displayName = 'AudiophileTurntable';

const styles = StyleSheet.create({
  outerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },

  pressableDeck: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main Deck Container (jf-vinyl-deck)
  vinylDeckContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 1. Vinyl Disc (jf-vinyl-disc)
  vinylDisc: {
    position: 'absolute',
    backgroundColor: '#090A0E',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.85,
    shadowRadius: 20,
    shadowOffset: { width: 8, height: 12 },
    elevation: 8,
  },

  // Center Album Label (jf-vinyl-center-label)
  centerLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    backgroundColor: '#12131A',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.7)',
    shadowColor: '#000000',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  labelImage: {
    ...StyleSheet.absoluteFillObject,
  },
  labelFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#181924',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Center Spindle Hole (jf-vinyl-spindle)
  spindleHole: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    backgroundColor: '#07070B',
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    shadowColor: '#000000',
    shadowOpacity: 0.95,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },

  // 2. Cover Sleeve (jf-vinyl-sleeve)
  coverSleeve: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0D0D14',
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000000',
    shadowOpacity: 0.85,
    shadowRadius: 28,
    shadowOffset: { width: -3, height: 14 },
    elevation: 12,
  },
  sleeveImage: {
    width: '100%',
    height: '100%',
  },
  sleeveFallback: {
    width: '100%',
    height: '100%',
  },
  sleeveLeftSpine: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0, 0, 0, 0.4)',
  },
  sleevePocketShadow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sleeveGlossSheen: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },

  // Mode Switch Hint Pill
  modeHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 5.5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: 14,
  },
  hintText: {
    ...typography.labelMedium,
    color: 'rgba(255, 255, 255, 0.75)',
  },
});

