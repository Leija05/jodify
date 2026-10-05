import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getProfileAnimationDefinition } from '../../lib/avatar';

interface ProfileInspectionAnimationProps {
  animationId?: string | null | undefined;
  showBadge?: boolean;
}

export function ProfileInspectionAnimation({
  animationId,
  showBadge = true,
}: ProfileInspectionAnimationProps) {
  const animDef = getProfileAnimationDefinition(animationId);

  // Common animated values for rich physics
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim3 = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const counterRotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animationId || animationId === 'none') return;

    // 1. Expanding energy shockwave rings
    const ringLoop = Animated.loop(
      Animated.stagger(420, [
        Animated.sequence([
          Animated.timing(pulseAnim1, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim1, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseAnim2, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim2, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseAnim3, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim3, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    ringLoop.start();

    // 2. Scanline for cyber
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    scanLoop.start();

    // 3. Continuous rotation (Clockwise)
    const rotLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotLoop.start();

    // 4. Counter rotation (Anti-clockwise)
    const counterRotLoop = Animated.loop(
      Animated.timing(counterRotateAnim, {
        toValue: 1,
        duration: 13000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    counterRotLoop.start();

    // 5. Vertical Floating / Rising loop
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();

    // 6. Lateral Swaying (Organic physics for drifting petals and embers)
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(swayAnim, {
          toValue: -1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(swayAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    swayLoop.start();

    // 7. Ambient Breathing Glow
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    return () => {
      ringLoop.stop();
      scanLoop.stop();
      rotLoop.stop();
      counterRotLoop.stop();
      floatLoop.stop();
      swayLoop.stop();
      glowLoop.stop();
    };
  }, [
    animationId,
    pulseAnim1,
    pulseAnim2,
    pulseAnim3,
    scanLineAnim,
    rotateAnim,
    counterRotateAnim,
    floatAnim,
    swayAnim,
    glowAnim,
  ]);

  if (!animationId || animationId === 'none') {
    return null;
  }

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const counterSpin = counterRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 1. Pulso Cósmico Astral */}
      {animationId === 'astral-pulse' && (
        <View style={styles.fullStage}>
          {/* Rotating celestial orbit ring */}
          <Animated.View
            style={[
              styles.astralOrbitRing,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          >
            <View style={[styles.orbitPlanet, { top: -4, left: '50%' }]} />
            <View style={[styles.orbitPlanet, { bottom: -4, left: '50%' }]} />
          </Animated.View>

          {/* Expanding shockwave pulses */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: '#38bdf8',
                transform: [
                  {
                    scale: pulseAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.35, 2.7],
                    }),
                  },
                ],
                opacity: pulseAnim1.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: [0.95, 0.5, 0],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: '#818cf8',
                transform: [
                  {
                    scale: pulseAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.25, 2.3],
                    }),
                  },
                ],
                opacity: pulseAnim2.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: [0.85, 0.4, 0],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: '#c084fc',
                transform: [
                  {
                    scale: pulseAnim3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.18, 1.9],
                    }),
                  },
                ],
                opacity: pulseAnim3.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: [0.75, 0.3, 0],
                }),
              },
            ]}
          />

          {/* Sparkling starlight particles */}
          <Animated.View
            style={[
              styles.starField,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.45, 0.95],
                }),
              },
            ]}
          >
            <Text style={[styles.starParticle, { top: '12%', left: '16%' }]}>✦</Text>
            <Text style={[styles.starParticle, { top: '20%', right: '16%' }]}>★</Text>
            <Text style={[styles.starParticle, { top: '34%', left: '10%' }]}>✦</Text>
            <Text style={[styles.starParticle, { top: '50%', right: '12%' }]}>★</Text>
            <Text style={[styles.starParticle, { top: '68%', left: '20%' }]}>✦</Text>
          </Animated.View>
        </View>
      )}

      {/* 2. Cyber Matrix Glitch */}
      {animationId === 'cyber-glitch' && (
        <View style={styles.fullStage}>
          {/* Cyber HUD corner brackets */}
          <View style={[styles.cyberCorner, { top: 12, left: 12, borderTopWidth: 2, borderLeftWidth: 2 }]} />
          <View style={[styles.cyberCorner, { top: 12, right: 12, borderTopWidth: 2, borderRightWidth: 2 }]} />
          <View style={[styles.cyberCorner, { bottom: 12, left: 12, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
          <View style={[styles.cyberCorner, { bottom: 12, right: 12, borderBottomWidth: 2, borderRightWidth: 2 }]} />

          {/* Cyber edge glow */}
          <Animated.View
            style={[
              styles.cyberBorderGlow,
              {
                borderColor: '#00f0ff',
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.75],
                }),
              },
            ]}
          />

          {/* High-speed Laser Scanline */}
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [
                  {
                    translateY: scanLineAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 480],
                    }),
                  },
                ],
                opacity: scanLineAnim.interpolate({
                  inputRange: [0, 0.1, 0.9, 1],
                  outputRange: [0, 1, 1, 0],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={['transparent', '#00f0ff', '#ff007f', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scanLineGrad}
            />
          </Animated.View>

          {/* Futuristic Telemetry Status Tags */}
          <Text style={[styles.cyberTag, { top: '16%', right: '8%' }]}>[01_SYS_SYNC]</Text>
          <Text style={[styles.cyberTag, { top: '56%', left: '8%' }]}>[DSP_STREAM_OK]</Text>
        </View>
      )}

      {/* 3. Atardecer Synthwave */}
      {animationId === 'synthwave-horizon' && (
        <View style={styles.fullStage}>
          {/* Synthwave Glowing Sun */}
          <Animated.View
            style={[
              styles.synthSun,
              {
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#ffaa00', '#ff007f', '#7928ca']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.synthSunGrad}
            />
            {/* Horizontal Sun Laser Cuts */}
            <View style={[styles.sunCut, { top: '48%' }]} />
            <View style={[styles.sunCut, { top: '62%' }]} />
            <View style={[styles.sunCut, { top: '76%' }]} />
          </Animated.View>

          {/* Perspective Retro Floor Grid with Neon Glow */}
          <LinearGradient
            colors={['transparent', 'rgba(255, 0, 127, 0.22)', 'rgba(121, 40, 202, 0.35)']}
            style={styles.gridFloor}
          />
        </View>
      )}

      {/* 4. Ondas de Espectro Neón */}
      {animationId === 'neon-equalizer' && (
        <View style={styles.fullStage}>
          <View style={styles.equalizerRow}>
            {[18, 36, 52, 28, 64, 44, 22, 58, 38, 20, 48, 32, 60, 24, 40, 16].map((baseHeight, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.eqBar,
                  {
                    height: baseHeight,
                    backgroundColor: i % 3 === 0 ? '#10b981' : i % 3 === 1 ? '#00f0ff' : '#6366f1',
                    transform: [
                      {
                        scaleY: floatAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [
                            0.3 + ((i * 7) % 5) * 0.12,
                            1.15,
                            0.4 + ((i * 3) % 4) * 0.15,
                          ],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.eqBarPeak} />
              </Animated.View>
            ))}
          </View>
        </View>
      )}

      {/* 5. Brisa Sakura Neón */}
      {animationId === 'sakura-drift' && (
        <View style={styles.fullStage}>
          {[
            { top: '14%', left: '18%', yRange: [0, 32], xRange: [-12, 12] },
            { top: '22%', right: '20%', yRange: [18, -4], xRange: [14, -14] },
            { top: '38%', left: '12%', yRange: [0, 38], xRange: [-16, 16] },
            { top: '48%', right: '16%', yRange: [24, -6], xRange: [12, -12] },
            { top: '62%', left: '22%', yRange: [0, 30], xRange: [-14, 14] },
            { top: '72%', right: '24%', yRange: [16, -8], xRange: [10, -10] },
          ].map((petal, idx) => (
            <Animated.View
              key={idx}
              style={[
                styles.glowingPetal,
                {
                  top: petal.top as any,
                  ...(petal.left ? { left: petal.left as any } : {}),
                  ...(petal.right ? { right: petal.right as any } : {}),
                  transform: [
                    {
                      translateY: floatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: petal.yRange,
                      }),
                    },
                    {
                      translateX: swayAnim.interpolate({
                        inputRange: [-1, 1],
                        outputRange: petal.xRange,
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
          {/* Subtle Pink Mist Base */}
          <LinearGradient
            colors={['transparent', 'rgba(244, 114, 182, 0.14)']}
            style={styles.abyssGround}
          />
        </View>
      )}

      {/* 6. Supernova Real Oro VIP */}
      {animationId === 'supernova-gold' && (
        <View style={styles.fullStage}>
          {/* Clockwise Radiant Sunburst Halo */}
          <Animated.View
            style={[
              styles.goldHalo,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(255,215,0,0.38)', 'transparent', 'rgba(255,170,0,0.32)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.goldHaloGrad}
            />
          </Animated.View>

          {/* Counter-Clockwise Inner Solar Flare */}
          <Animated.View
            style={[
              styles.goldInnerHalo,
              {
                transform: [{ rotate: counterSpin }],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(255,235,59,0.3)', 'transparent', 'rgba(255,152,0,0.25)']}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.goldHaloGrad}
            />
          </Animated.View>

          {/* Golden Starlight Orbs */}
          <Animated.View
            style={[
              styles.goldSparkleOrb,
              {
                top: '15%',
                left: '16%',
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.3],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.goldSparkleOrb,
              {
                top: '24%',
                right: '18%',
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.2, 0.7],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.goldSparkleOrb,
              {
                top: '42%',
                left: '12%',
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1.25],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.goldSparkleOrb,
              {
                top: '58%',
                right: '14%',
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.1, 0.75],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      )}

      {/* 7. Fuego Abisal Violeta */}
      {animationId === 'abyssal-flame' && (
        <View style={styles.fullStage}>
          {/* Ascending ember sparks with realistic buoyant physics */}
          <Animated.View
            style={[
              styles.glowingEmber,
              {
                bottom: '28%',
                left: '24%',
                backgroundColor: '#f97316',
                shadowColor: '#ea580c',
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -42],
                    }),
                  },
                  {
                    translateX: swayAnim.interpolate({
                      inputRange: [-1, 1],
                      outputRange: [-10, 10],
                    }),
                  },
                ],
                opacity: floatAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.85, 0.35, 0.85],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.glowingEmber,
              {
                bottom: '22%',
                right: '25%',
                backgroundColor: '#c084fc',
                shadowColor: '#a855f7',
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-24, 12],
                    }),
                  },
                  {
                    translateX: swayAnim.interpolate({
                      inputRange: [-1, 1],
                      outputRange: [12, -12],
                    }),
                  },
                ],
                opacity: floatAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.35, 0.9, 0.35],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.glowingEmber,
              {
                bottom: '46%',
                right: '16%',
                backgroundColor: '#ec4899',
                shadowColor: '#db2777',
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -46],
                    }),
                  },
                  {
                    translateX: swayAnim.interpolate({
                      inputRange: [-1, 1],
                      outputRange: [-14, 14],
                    }),
                  },
                ],
                opacity: floatAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.8, 0.25, 0.8],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.glowingEmber,
              {
                bottom: '54%',
                left: '18%',
                backgroundColor: '#a855f7',
                shadowColor: '#9333ea',
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 8],
                    }),
                  },
                  {
                    translateX: swayAnim.interpolate({
                      inputRange: [-1, 1],
                      outputRange: [10, -10],
                    }),
                  },
                ],
                opacity: floatAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 0.85, 0.3],
                }),
              },
            ]}
          />

          {/* Deep violet-magenta magma smoke ground aura */}
          <LinearGradient
            colors={['transparent', 'rgba(168,85,247,0.26)', 'rgba(236,72,153,0.35)']}
            style={styles.abyssGround}
          />
        </View>
      )}

      {/* Top Floating Badge Pill */}
      {showBadge && (
        <View style={styles.badgePillWrap}>
          <View style={[styles.badgePill, { borderColor: animDef.accent }]}>
            <Ionicons name="sparkles" size={11} color={animDef.accent} />
            <Text style={[styles.badgePillText, { color: animDef.accent }]} numberOfLines={1}>
              JODIFY PULSE · {animDef.name.toUpperCase()}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullStage: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    alignSelf: 'center',
  },
  astralOrbitRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderStyle: 'dashed',
  },
  orbitPlanet: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowRadius: 6,
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  starField: {
    ...StyleSheet.absoluteFillObject,
  },
  starParticle: {
    position: 'absolute',
    color: '#38bdf8',
    fontSize: 16,
    textShadowColor: 'rgba(56, 189, 248, 0.8)',
    textShadowRadius: 8,
  },
  cyberCorner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: '#00f0ff',
    opacity: 0.8,
  },
  cyberBorderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderRadius: 20,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  scanLineGrad: {
    flex: 1,
    height: '100%',
  },
  cyberTag: {
    position: 'absolute',
    color: '#00f0ff',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    letterSpacing: 1.5,
    opacity: 0.75,
  },
  synthSun: {
    position: 'absolute',
    top: 24,
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
  },
  synthSunGrad: {
    flex: 1,
    borderRadius: 45,
  },
  sunCut: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(16, 16, 26, 0.95)',
  },
  gridFloor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  equalizerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: 90,
    width: '100%',
    paddingHorizontal: 16,
  },
  eqBar: {
    width: 5,
    borderRadius: 2.5,
    position: 'relative',
  },
  eqBarPeak: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffffff',
  },
  goldHalo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  goldInnerHalo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  goldHaloGrad: {
    flex: 1,
    borderRadius: 130,
  },
  goldSparkleOrb: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffd700',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 3,
  },
  glowingPetal: {
    position: 'absolute',
    width: 11,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f472b6',
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 6,
    elevation: 3,
  },
  glowingEmber: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 4,
  },
  abyssGround: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  badgePillWrap: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 52,
    alignItems: 'center',
    zIndex: 5,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(10, 10, 18, 0.85)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  badgePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
