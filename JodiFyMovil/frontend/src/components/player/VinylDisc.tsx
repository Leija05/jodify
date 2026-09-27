import React, { useEffect, useRef } from 'react';
import { View, Image, StyleProp, ViewStyle, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, LinearGradient as SvgLinearGradient, Stop, G } from 'react-native-svg';
import type { Song } from '@lib/types';
import { pickCoverUrl } from '@lib/utils';
import { colors } from '@theme';

interface VinylDiscProps {
  song: Song;
  size: number;
  isPlaying: boolean;
  style?: StyleProp<ViewStyle>;
  vinylScale?: Animated.Value;
}

const LABEL_SIZE_RATIO = 0.35;
const HOLE_SIZE_RATIO = 0.055;

export const VinylDisc = React.forwardRef<View, VinylDiscProps>(
  ({ song, size, isPlaying, style, vinylScale }, ref) => {
    const rotation = useRef(new Animated.Value(0)).current;
    const currentAngle = useRef(0);
    const coverUrl = pickCoverUrl(song);
    const labelSize = size * LABEL_SIZE_RATIO;
    const holeSize = size * HOLE_SIZE_RATIO;
    const radius = size / 2;

    useEffect(() => {
      let anim: Animated.CompositeAnimation | null = null;
      if (isPlaying) {
        anim = Animated.loop(
          Animated.timing(rotation, {
            toValue: 1,
            duration: 4000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );
        anim.start();
      } else {
        rotation.stopAnimation((value) => {
          currentAngle.current = value;
        });
      }
      return () => {
        if (anim) anim.stop();
      };
    }, [isPlaying, rotation]);

    const rotateInterpolation = rotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const discTransform = vinylScale
      ? [{ scale: vinylScale }, { rotate: rotateInterpolation }]
      : [{ rotate: rotateInterpolation }];

    return (
      <View
        ref={ref}
        style={[
          styles.outerContainer,
          { width: size, height: size },
          style,
        ]}
      >
        {/* Soft Ambient Depth Shadow */}
        <View
          style={[
            styles.ambientShadow,
            {
              width: size * 0.9,
              height: size * 0.9,
              borderRadius: (size * 0.9) / 2,
            },
          ]}
        />

        {/* Rotating Vinyl Core */}
        <Animated.View
          style={[
            styles.disc,
            {
              width: size,
              height: size,
              borderRadius: radius,
              transform: discTransform,
            },
          ]}
        >
          {/* High-Performance SVG Grooves & Specular Sheen (Single GPU Draw Call) */}
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
            <Defs>
              {/* Radial Grooves Gradient */}
              <RadialGradient id="grooveGradient" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#08080C" stopOpacity="1" />
                <Stop offset="30%" stopColor="#0E0E16" stopOpacity="1" />
                <Stop offset="36%" stopColor="#09090E" stopOpacity="1" />
                <Stop offset="65%" stopColor="#14141E" stopOpacity="1" />
                <Stop offset="88%" stopColor="#0A0A10" stopOpacity="1" />
                <Stop offset="97%" stopColor="#181824" stopOpacity="1" />
                <Stop offset="100%" stopColor="#040407" stopOpacity="1" />
              </RadialGradient>

              {/* Specular Light Reflection (Butterfly sheen of real vinyl) */}
              <SvgLinearGradient id="specularSheen" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="rgba(255,255,255,0.07)" />
                <Stop offset="30%" stopColor="rgba(127,0,255,0.12)" />
                <Stop offset="50%" stopColor="rgba(0,0,0,0)" />
                <Stop offset="70%" stopColor="rgba(0,229,255,0.08)" />
                <Stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
              </SvgLinearGradient>
            </Defs>

            {/* Base Vinyl Body */}
            <Circle cx={radius} cy={radius} r={radius - 1} fill="url(#grooveGradient)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

            {/* Concentric Precision Audio Grooves */}
            <G opacity="0.6">
              <Circle cx={radius} cy={radius} r={radius * 0.95} stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" fill="none" />
              <Circle cx={radius} cy={radius} r={radius * 0.88} stroke="rgba(127,0,255,0.12)" strokeWidth="1" fill="none" />
              <Circle cx={radius} cy={radius} r={radius * 0.82} stroke="rgba(255,255,255,0.05)" strokeWidth="0.6" fill="none" />
              <Circle cx={radius} cy={radius} r={radius * 0.74} stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" fill="none" />
              <Circle cx={radius} cy={radius} r={radius * 0.65} stroke="rgba(0,229,255,0.09)" strokeWidth="1" fill="none" />
              <Circle cx={radius} cy={radius} r={radius * 0.56} stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" fill="none" />
              <Circle cx={radius} cy={radius} r={radius * 0.48} stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" fill="none" />
              <Circle cx={radius} cy={radius} r={radius * 0.42} stroke="rgba(127,0,255,0.15)" strokeWidth="1" fill="none" />
              <Circle cx={radius} cy={radius} r={radius * 0.38} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" fill="none" />
            </G>

            {/* Dynamic Specular Sheen Overlay */}
            <Circle cx={radius} cy={radius} r={radius - 2} fill="url(#specularSheen)" />

            {/* Run-out Groove Zone & Label Rim */}
            <Circle cx={radius} cy={radius} r={labelSize / 2 + 6} stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" fill="none" />
            <Circle cx={radius} cy={radius} r={labelSize / 2 + 1} stroke="rgba(127,0,255,0.3)" strokeWidth="0.8" fill="none" />
          </Svg>

          {/* Center Album Art Label (Apple Music / Audiophile Turntable) */}
          <View
            style={[
              styles.label,
              {
                width: labelSize,
                height: labelSize,
                borderRadius: labelSize / 2,
                marginTop: -labelSize / 2,
                marginLeft: -labelSize / 2,
              },
            ]}
          >
            {coverUrl ? (
              <Image
                source={{ uri: coverUrl }}
                style={[styles.labelImage, { borderRadius: labelSize / 2 }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.labelFallback, { borderRadius: labelSize / 2 }]} />
            )}

            {/* Specular Glass Ring on Label */}
            <View
              style={[
                styles.labelGloss,
                {
                  borderRadius: labelSize / 2,
                },
              ]}
            />
          </View>

          {/* Precision Spindle Center Hole */}
          <View
            style={[
              styles.spindleHole,
              {
                width: holeSize,
                height: holeSize,
                borderRadius: holeSize / 2,
                marginTop: -holeSize / 2,
                marginLeft: -holeSize / 2,
              },
            ]}
          >
            {/* Metallic Brass Inner Ring */}
            <View
              style={[
                styles.brassRing,
                {
                  width: holeSize - 4,
                  height: holeSize - 4,
                  borderRadius: (holeSize - 4) / 2,
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    position: 'relative',
    backgroundColor: '#07070A',
    overflow: 'hidden',
  },
  ambientShadow: {
    position: 'absolute',
    backgroundColor: colors.glowPrimary,
    opacity: 0.25,
    shadowColor: '#7F00FF',
    shadowOpacity: 0.6,
    shadowRadius: 35,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  label: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#121218',
  },
  labelImage: {
    ...StyleSheet.absoluteFillObject,
  },
  labelFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
  },
  labelGloss: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  spindleHole: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    backgroundColor: '#020204',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  brassRing: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.4)',
  },
});

VinylDisc.displayName = 'VinylDisc';