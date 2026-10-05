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
import { pickCoverUrl, resolveArtist, resolveSongTitle } from '@lib/utils';
import { typography } from '@theme';

interface AudiophileTurntableProps {
  song: Song;
  isPlaying: boolean;
  vinylScale?: Animated.Value;
  onToggleMode: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DECK_SIZE = Math.min(340, Math.max(280, SCREEN_WIDTH * 0.88));
const PLATTER_SIZE = Math.round(DECK_SIZE * 0.74);
const VINYL_SIZE = Math.round(PLATTER_SIZE * 0.94);
const LABEL_SIZE = Math.round(VINYL_SIZE * 0.35);
const SPINDLE_SIZE = Math.round(VINYL_SIZE * 0.056);

export const AudiophileTurntable = React.memo(
  React.forwardRef<View, AudiophileTurntableProps>(
    ({ song, isPlaying, vinylScale, onToggleMode }, ref) => {
      const coverUrl = useMemo(() => pickCoverUrl(song), [song]);
      const title = useMemo(() => resolveSongTitle(song), [song]);
      const artist = useMemo(() => resolveArtist(song) ?? 'JodiFy Master', [song]);

      // Vinyl continuous rotation
      const rotation = useRef(new Animated.Value(0)).current;
      // Tonearm kinematic pivot angle (0 deg = arm rest, 1 = on vinyl groove)
      const tonearmAnim = useRef(new Animated.Value(isPlaying ? 1 : 0)).current;
      // Strobe light pulse animation
      const strobePulse = useRef(new Animated.Value(1)).current;

      // Vinyl rotation loop
      useEffect(() => {
        let anim: Animated.CompositeAnimation | null = null;
        if (isPlaying) {
          anim = Animated.loop(
            Animated.timing(rotation, {
              toValue: 1,
              duration: 3800,
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

      // Tonearm motion with physical inertia
      useEffect(() => {
        Animated.spring(tonearmAnim, {
          toValue: isPlaying ? 1 : 0,
          damping: 16,
          stiffness: 70,
          mass: 1.1,
          useNativeDriver: true,
        }).start();
      }, [isPlaying, tonearmAnim]);

      // Strobe LED pulse
      useEffect(() => {
        let pulseLoop: Animated.CompositeAnimation | null = null;
        if (isPlaying) {
          pulseLoop = Animated.loop(
            Animated.sequence([
              Animated.timing(strobePulse, {
                toValue: 0.55,
                duration: 900,
                easing: Easing.inOut(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(strobePulse, {
                toValue: 1,
                duration: 900,
                easing: Easing.inOut(Easing.quad),
                useNativeDriver: true,
              }),
            ])
          );
          pulseLoop.start();
        } else {
          strobePulse.setValue(0.3);
        }
        return () => {
          if (pulseLoop) pulseLoop.stop();
        };
      }, [isPlaying, strobePulse]);

      const rotateInterpolation = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      });

      // Tonearm rotates from 0deg (parked on rest) to 23.5deg (resting on groove)
      const tonearmRotation = tonearmAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '23.5deg'],
      });

      // Strobe rim dots calculation
      const strobeDotsCount = 28;
      const strobeRadius = PLATTER_SIZE / 2 - 3;
      const strobeDots = useMemo(() => {
        const dots = [];
        for (let i = 0; i < strobeDotsCount; i++) {
          const angle = (i * 2 * Math.PI) / strobeDotsCount;
          const cx = PLATTER_SIZE / 2 + strobeRadius * Math.cos(angle);
          const cy = PLATTER_SIZE / 2 + strobeRadius * Math.sin(angle);
          dots.push({ cx, cy, key: i });
        }
        return dots;
      }, [strobeRadius]);

      const vinylTransform = vinylScale
        ? [{ scale: vinylScale }, { rotate: rotateInterpolation }]
        : [{ rotate: rotateInterpolation }];

      return (
        <View ref={ref} style={styles.outerWrapper}>
          {/* Vinyl Jacket / Album Sleeve peeking behind turntable */}
          <View style={[styles.sleeveBackdrop, { width: DECK_SIZE * 0.72, height: DECK_SIZE * 0.72 }]}>
            <View style={styles.sleeveInner}>
              {coverUrl ? (
                <Image source={{ uri: coverUrl }} style={styles.sleeveCover} resizeMode="cover" />
              ) : (
                <View style={[styles.sleeveFallback, { backgroundColor: '#1A0E2A' }]} />
              )}
              {/* Cardboard sleeve edge gradient */}
              <View style={styles.sleeveSpine} />
              <View style={styles.sleeveSheen} />
            </View>
          </View>

          {/* Master Turntable Plinth / Chassis */}
          <PressableFluid onPress={onToggleMode} haptic="medium" style={styles.deckTouchTarget}>
            <View
              style={[
                styles.turntablePlinth,
                {
                  width: DECK_SIZE,
                  height: DECK_SIZE,
                },
              ]}
            >
              {/* Ambient Platter Rim Glow */}
              <View
                style={[
                  styles.deckAmbientGlow,
                  {
                    width: PLATTER_SIZE + 24,
                    height: PLATTER_SIZE + 24,
                    borderRadius: (PLATTER_SIZE + 24) / 2,
                  },
                ]}
              />

              {/* 4 CNC Machined Corner Hex Screws */}
              <View style={[styles.screw, styles.screwTL]}>
                <View style={styles.screwSlot} />
              </View>
              <View style={[styles.screw, styles.screwTR]}>
                <View style={[styles.screwSlot, { transform: [{ rotate: '45deg' }] }]} />
              </View>
              <View style={[styles.screw, styles.screwBL]}>
                <View style={[styles.screwSlot, { transform: [{ rotate: '90deg' }] }]} />
              </View>
              <View style={[styles.screw, styles.screwBR]}>
                <View style={[styles.screwSlot, { transform: [{ rotate: '135deg' }] }]} />
              </View>

              {/* Laser-Etched Branding Header */}
              <View style={styles.deckHeader}>
                <View style={styles.modelBadgeWrap}>
                  <Text style={styles.deckBrand} numberOfLines={1}>{title.toUpperCase()}</Text>
                  <Text style={styles.deckModel} numberOfLines={1}>{artist.toUpperCase()} · 33⅓ RPM</Text>
                </View>

                {/* Strobe Light Tower & 33 1/3 RPM Indicator */}
                <View style={styles.speedCluster}>
                  <Animated.View
                    style={[
                      styles.speedLed,
                      {
                        opacity: strobePulse,
                        backgroundColor: isPlaying ? '#00F0FF' : '#555566',
                        shadowColor: isPlaying ? '#00F0FF' : 'transparent',
                      },
                    ]}
                  />
                  <Text style={[styles.speedText, isPlaying && styles.speedTextActive]}>
                    33⅓ RPM
                  </Text>
                </View>
              </View>

              {/* Platter & Vinyl Well */}
              <View
                style={[
                  styles.platterWell,
                  {
                    width: PLATTER_SIZE,
                    height: PLATTER_SIZE,
                    borderRadius: PLATTER_SIZE / 2,
                  },
                ]}
              >
                {/* Machined Metal Platter with Strobe Calibration Rim (SVG) */}
                <Svg
                  width={PLATTER_SIZE}
                  height={PLATTER_SIZE}
                  viewBox={`0 0 ${PLATTER_SIZE} ${PLATTER_SIZE}`}
                  style={StyleSheet.absoluteFill}
                >
                  <Defs>
                    {/* Metallic Platter Radial Finish */}
                    <RadialGradient id="platterRim" cx="50%" cy="50%" rx="50%" ry="50%">
                      <Stop offset="0%" stopColor="#1E202B" />
                      <Stop offset="75%" stopColor="#14151D" />
                      <Stop offset="92%" stopColor="#2A2D3C" />
                      <Stop offset="98%" stopColor="#3A3E52" />
                      <Stop offset="100%" stopColor="#101118" />
                    </RadialGradient>
                  </Defs>

                  {/* Outer Machined Platter Rim */}
                  <Circle
                    cx={PLATTER_SIZE / 2}
                    cy={PLATTER_SIZE / 2}
                    r={PLATTER_SIZE / 2 - 1}
                    fill="url(#platterRim)"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="1.5"
                  />

                  {/* Strobe Calibration Dots */}
                  <G opacity={isPlaying ? '0.85' : '0.45'}>
                    {strobeDots.map((dot) => (
                      <Circle
                        key={dot.key}
                        cx={dot.cx}
                        cy={dot.cy}
                        r={1.7}
                        fill={isPlaying ? '#00E5FF' : '#888899'}
                      />
                    ))}
                  </G>
                </Svg>

                {/* Strobe Tower Spot Lamp Casting Beam on Platter */}
                <View style={styles.strobeTower}>
                  <Animated.View
                    style={[
                      styles.strobeBeam,
                      {
                        opacity: strobePulse,
                      },
                    ]}
                  />
                  <View style={styles.strobePrism} />
                </View>

                {/* Spinning Master Vinyl Record */}
                <Animated.View
                  style={[
                    styles.vinylDisc,
                    {
                      width: VINYL_SIZE,
                      height: VINYL_SIZE,
                      borderRadius: VINYL_SIZE / 2,
                      transform: vinylTransform,
                    },
                  ]}
                >
                  <Svg
                    width={VINYL_SIZE}
                    height={VINYL_SIZE}
                    viewBox={`0 0 ${VINYL_SIZE} ${VINYL_SIZE}`}
                    style={StyleSheet.absoluteFill}
                  >
                    <Defs>
                      {/* Deep Acetate Grooves Radial Gradient */}
                      <RadialGradient id="vinylGrooves" cx="50%" cy="50%" rx="50%" ry="50%">
                        <Stop offset="0%" stopColor="#08080C" />
                        <Stop offset="28%" stopColor="#0C0D14" />
                        <Stop offset="34%" stopColor="#08080D" />
                        <Stop offset="55%" stopColor="#12131D" />
                        <Stop offset="72%" stopColor="#0A0B10" />
                        <Stop offset="90%" stopColor="#141520" />
                        <Stop offset="97%" stopColor="#1A1C28" />
                        <Stop offset="100%" stopColor="#050508" />
                      </RadialGradient>

                      {/* Dynamic Specular Sheen (Butterfly light reflection of authentic vinyl) */}
                      <SvgLinearGradient id="vinylSheen" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                        <Stop offset="25%" stopColor="rgba(140,50,255,0.15)" />
                        <Stop offset="48%" stopColor="rgba(0,0,0,0)" />
                        <Stop offset="52%" stopColor="rgba(0,0,0,0)" />
                        <Stop offset="75%" stopColor="rgba(0,240,255,0.12)" />
                        <Stop offset="100%" stopColor="rgba(255,255,255,0.07)" />
                      </SvgLinearGradient>

                      <SvgLinearGradient id="vinylSheenOpposite" x1="100%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                        <Stop offset="35%" stopColor="rgba(0,240,255,0.09)" />
                        <Stop offset="50%" stopColor="rgba(0,0,0,0)" />
                        <Stop offset="65%" stopColor="rgba(140,50,255,0.1)" />
                        <Stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                      </SvgLinearGradient>
                    </Defs>

                    {/* Vinyl Base Body */}
                    <Circle
                      cx={VINYL_SIZE / 2}
                      cy={VINYL_SIZE / 2}
                      r={VINYL_SIZE / 2 - 1}
                      fill="url(#vinylGrooves)"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="1.2"
                    />

                    {/* Concentric High-Density Audio Grooves */}
                    <G opacity="0.68">
                      <Circle cx={VINYL_SIZE / 2} cy={VINYL_SIZE / 2} r={VINYL_SIZE * 0.47} stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" fill="none" />
                      <Circle cx={VINYL_SIZE / 2} cy={VINYL_SIZE / 2} r={VINYL_SIZE * 0.45} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" fill="none" />
                      <Circle cx={VINYL_SIZE / 2} cy={VINYL_SIZE / 2} r={VINYL_SIZE * 0.43} stroke="rgba(0,240,255,0.08)" strokeWidth="0.6" fill="none" />
                      {/* Track Gap 1 */}
                      <Circle cx={VINYL_SIZE / 2} cy={VINYL_SIZE / 2} r={VINYL_SIZE * 0.40} stroke="rgba(0,0,0,0.6)" strokeWidth="1.4" fill="none" />

                      <Circle cx={VINYL_SIZE / 2} cy={VINYL_SIZE / 2} r={VINYL_SIZE * 0.38} stroke="rgba(255,255,255,0.09)" strokeWidth="0.7" fill="none" />
                      <Circle cx={VINYL_SIZE / 2} cy={VINYL_SIZE / 2} r={VINYL_SIZE * 0.35} stroke="rgba(140,50,255,0.12)" strokeWidth="0.9" fill="none" />
                      <Circle cx={VINYL_SIZE / 2} cy={VINYL_SIZE / 2} r={VINYL_SIZE * 0.32} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" fill="none" />
                      {/* Track Gap 2 */}
                      <Circle cx={VINYL_SIZE / 2} cy={VINYL_SIZE / 2} r={VINYL_SIZE * 0.29} stroke="rgba(0,0,0,0.6)" strokeWidth="1.4" fill="none" />

                      <Circle cx={VINYL_SIZE / 2} cy={VINYL_SIZE / 2} r={VINYL_SIZE * 0.26} stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" fill="none" />
                      <Circle cx={VINYL_SIZE / 2} cy={VINYL_SIZE / 2} r={VINYL_SIZE * 0.23} stroke="rgba(0,240,255,0.1)" strokeWidth="0.8" fill="none" />
                      {/* Lead-Out Groove */}
                      <Circle cx={VINYL_SIZE / 2} cy={VINYL_SIZE / 2} r={VINYL_SIZE * 0.20} stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" fill="none" />
                    </G>

                    {/* Specular Light Overlays */}
                    <Circle cx={VINYL_SIZE / 2} cy={VINYL_SIZE / 2} r={VINYL_SIZE / 2 - 2} fill="url(#vinylSheen)" />
                    <Circle cx={VINYL_SIZE / 2} cy={VINYL_SIZE / 2} r={VINYL_SIZE / 2 - 2} fill="url(#vinylSheenOpposite)" />

                    {/* Run-Out Groove Border */}
                    <Circle
                      cx={VINYL_SIZE / 2}
                      cy={VINYL_SIZE / 2}
                      r={LABEL_SIZE / 2 + 3}
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth="1.2"
                      fill="none"
                    />
                  </Svg>

                  {/* High-Fidelity Center Album Label */}
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
                        <Ionicons name="disc" size={LABEL_SIZE * 0.45} color="rgba(255,255,255,0.7)" />
                      </View>
                    )}

                    {/* Authentic Vintage Label Graphic & Typography Ring */}
                    <View style={[styles.labelTypographyRing, { borderRadius: LABEL_SIZE / 2 }]}>
                      <View style={styles.labelCurvedBadge}>
                        <Text style={styles.labelSideText}>SIDE A · 33⅓</Text>
                      </View>
                      <View style={styles.labelBottomBadge}>
                        <Text style={styles.labelMasterText}>STEREO</Text>
                      </View>
                    </View>

                    {/* Glass Bevel Highlight on Label */}
                    <View style={[styles.labelBevel, { borderRadius: LABEL_SIZE / 2 }]} />
                  </View>

                  {/* Solid Brass Center Spindle Bushing with Chrome Pin */}
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
                  >
                    <View
                      style={[
                        styles.spindlePin,
                        {
                          width: SPINDLE_SIZE * 0.55,
                          height: SPINDLE_SIZE * 0.55,
                          borderRadius: (SPINDLE_SIZE * 0.55) / 2,
                        },
                      ]}
                    />
                  </View>
                </Animated.View>
              </View>

              {/* Audiophile Mechanical Tonearm Assembly */}
              <View style={styles.tonearmAssembly} pointerEvents="none">
                {/* Fixed Gimbal Pivot Base with Counterweight */}
                <View style={styles.gimbalBase}>
                  <View style={styles.counterWeight}>
                    <View style={styles.counterWeightRing} />
                  </View>
                  <View style={styles.gimbalRing}>
                    <View style={styles.gimbalCenterDot} />
                  </View>
                  <View style={styles.antiSkateDial} />
                  {/* Rest clip */}
                  <View style={styles.armRestPost}>
                    <View style={styles.armRestClip} />
                  </View>
                </View>

                {/* Animated Kinematic Tonearm Wand & Headshell */}
                <Animated.View
                  style={[
                    styles.tonearmWandContainer,
                    {
                      transform: [
                        { rotate: tonearmRotation },
                      ],
                    },
                  ]}
                >
                  {/* Chrome S-Curved Tonearm Tube */}
                  <View style={styles.armTube}>
                    <View style={styles.armTubeHighlight} />
                  </View>

                  {/* Cartridge Headshell & Stylus Needle */}
                  <View style={styles.headshell}>
                    <View style={styles.headshellBody}>
                      {/* Stylus Cue LED Light */}
                      <Animated.View
                        style={[
                          styles.stylusLed,
                          {
                            opacity: isPlaying ? strobePulse : 0.2,
                            backgroundColor: isPlaying ? '#00F0FF' : '#555566',
                          },
                        ]}
                      />
                      <View style={styles.headshellStripe} />
                    </View>
                    {/* Micro Stylus Diamond Needle Pointing Down */}
                    <View style={styles.stylusNeedle} />
                  </View>
                </Animated.View>
              </View>

              {/* Pitch Fader Slot on the Right Plinth */}
              <View style={styles.pitchFaderSlot}>
                <View style={styles.pitchTrack} />
                <View style={styles.pitchZeroMark} />
                <View style={styles.pitchKnob} />
                <Text style={styles.pitchLabel}>0%</Text>
              </View>

              {/* Bottom Plinth Footer Status */}
              <View style={styles.deckFooter}>
                <View style={styles.driveStatusWrap}>
                  <View style={[styles.driveDot, { backgroundColor: isPlaying ? '#00E5FF' : '#666677' }]} />
                  <Text style={styles.driveText}>
                    {isPlaying ? 'MOTOR ENGAGED' : 'STANDBY'}
                  </Text>
                </View>
                <Text style={styles.plinthBadge}>QUARTZ DIRECT DRIVE</Text>
              </View>
            </View>
          </PressableFluid>

          {/* Interactive Mode Badge Hint */}
          <PressableFluid onPress={onToggleMode} haptic="light" style={styles.hintPill}>
            <Ionicons name="disc" size={13} color="#00F0FF" />
            <Text style={styles.hintText}>Modo Vinilo Audiófilo · Toca para ver carátula</Text>
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
    marginVertical: 10,
    position: 'relative',
  },
  sleeveBackdrop: {
    position: 'absolute',
    top: -14,
    left: 12,
    borderRadius: 16,
    overflow: 'hidden',
    transform: [{ rotate: '-7deg' }],
    shadowColor: '#000000',
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: -4, height: 6 },
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sleeveInner: {
    flex: 1,
    position: 'relative',
  },
  sleeveCover: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  sleeveFallback: {
    width: '100%',
    height: '100%',
  },
  sleeveSpine: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0, 0, 0, 0.4)',
  },
  sleeveSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
  },
  deckTouchTarget: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  turntablePlinth: {
    backgroundColor: '#0D0E15',
    borderRadius: 26,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#00F0FF',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  deckAmbientGlow: {
    position: 'absolute',
    top: 26,
    left: 12,
    backgroundColor: '#00F0FF',
    opacity: 0.05,
    filter: 'blur(30px)',
  },
  screw: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#262936',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  screwSlot: {
    width: 5,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  screwTL: { top: 9, left: 9 },
  screwTR: { top: 9, right: 9 },
  screwBL: { bottom: 9, left: 9 },
  screwBR: { bottom: 9, right: 9 },
  deckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
    zIndex: 3,
  },
  modelBadgeWrap: {
    flexDirection: 'column',
  },
  deckBrand: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono_700Bold',
    color: '#00F0FF',
    letterSpacing: 1.2,
  },
  deckModel: {
    fontSize: 7.5,
    fontFamily: 'JetBrainsMono_400Regular',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  speedCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  speedLed: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  speedText: {
    fontSize: 8.5,
    fontFamily: 'JetBrainsMono_700Bold',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.6,
  },
  speedTextActive: {
    color: '#FFFFFF',
  },
  platterWell: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07080C',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  strobeTower: {
    position: 'absolute',
    left: -2,
    top: '38%',
    width: 14,
    height: 28,
    zIndex: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strobePrism: {
    width: 6,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#1E2230',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
  },
  strobeBeam: {
    position: 'absolute',
    left: 8,
    width: 22,
    height: 18,
    backgroundColor: 'rgba(0, 240, 255, 0.25)',
    borderRadius: 9,
    filter: 'blur(6px)',
  },
  vinylDisc: {
    position: 'relative',
    backgroundColor: '#050609',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    backgroundColor: '#11121A',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  labelImage: {
    ...StyleSheet.absoluteFillObject,
  },
  labelFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#7F00FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelTypographyRing: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  labelCurvedBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  labelSideText: {
    fontSize: 6.5,
    fontFamily: 'JetBrainsMono_700Bold',
    color: '#00F0FF',
    letterSpacing: 0.5,
  },
  labelBottomBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  labelMasterText: {
    fontSize: 6,
    fontFamily: 'JetBrainsMono_700Bold',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.6,
  },
  labelBevel: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  spindleHole: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    backgroundColor: '#1E1B10',
    borderWidth: 1.5,
    borderColor: '#D4AF37', // Gold brass ring
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.9,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  spindlePin: {
    backgroundColor: '#E6E9F0', // Polished Chrome
    borderWidth: 0.5,
    borderColor: '#FFFFFF',
  },
  tonearmAssembly: {
    position: 'absolute',
    top: 24,
    right: 18,
    width: 60,
    height: 180,
    zIndex: 10,
  },
  gimbalBase: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterWeight: {
    position: 'absolute',
    top: -10,
    right: 8,
    width: 20,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#2A2E3D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
  },
  counterWeightRing: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  gimbalRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1C26',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  gimbalCenterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D4DC',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  antiSkateDial: {
    position: 'absolute',
    bottom: -2,
    left: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2C3040',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  armRestPost: {
    position: 'absolute',
    bottom: -18,
    right: 4,
    width: 6,
    height: 14,
    backgroundColor: '#1E202B',
    borderRadius: 2,
  },
  armRestClip: {
    position: 'absolute',
    top: 2,
    left: -2,
    width: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#383E54',
  },
  tonearmWandContainer: {
    position: 'absolute',
    top: 16,
    right: 18,
    width: 18,
    height: 145,
    transformOrigin: 'top center',
  },
  armTube: {
    width: 3.5,
    height: 120,
    backgroundColor: '#B4B8C5',
    borderRadius: 2,
    position: 'relative',
    left: 7,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 3,
    shadowOffset: { width: 2, height: 2 },
  },
  armTubeHighlight: {
    position: 'absolute',
    top: 0,
    left: 0.5,
    width: 1,
    height: '100%',
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  headshell: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    width: 18,
    height: 24,
    alignItems: 'center',
  },
  headshellBody: {
    width: 14,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#181A24',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  stylusLed: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  headshellStripe: {
    width: 8,
    height: 2,
    backgroundColor: '#FF2A6D', // Audiophile cartridge accent line (Ortofon style)
    borderRadius: 1,
  },
  stylusNeedle: {
    width: 1.5,
    height: 5,
    backgroundColor: '#E6E9F0',
    borderRadius: 0.75,
  },
  pitchFaderSlot: {
    position: 'absolute',
    right: 8,
    bottom: 28,
    width: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pitchTrack: {
    width: 2.5,
    height: 36,
    borderRadius: 1.25,
    backgroundColor: '#090A0E',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pitchZeroMark: {
    position: 'absolute',
    left: 2,
    width: 4,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  pitchKnob: {
    position: 'absolute',
    width: 10,
    height: 5,
    borderRadius: 1.5,
    backgroundColor: '#35394A',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  pitchLabel: {
    position: 'absolute',
    bottom: -1,
    fontSize: 6.5,
    fontFamily: 'JetBrainsMono_400Regular',
    color: 'rgba(255, 255, 255, 0.3)',
  },
  deckFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 8,
    zIndex: 3,
  },
  driveStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  driveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  driveText: {
    fontSize: 7.5,
    fontFamily: 'JetBrainsMono_700Bold',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.8,
  },
  plinthBadge: {
    fontSize: 7,
    fontFamily: 'JetBrainsMono_400Regular',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 0.8,
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 10,
  },
  hintText: {
    ...typography.labelMedium,
    color: 'rgba(255, 255, 255, 0.65)',
  },
});
