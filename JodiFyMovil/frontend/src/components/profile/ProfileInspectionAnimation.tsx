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

  // Common animated values
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim3 = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animationId || animationId === 'none') return;

    // 1. Astral / Supernova pulses
    const ringLoop = Animated.loop(
      Animated.stagger(450, [
        Animated.sequence([
          Animated.timing(pulseAnim1, {
            toValue: 1,
            duration: 2200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim1, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseAnim2, {
            toValue: 1,
            duration: 2200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim2, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseAnim3, {
            toValue: 1,
            duration: 2200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim3, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    ringLoop.start();

    // 2. Scanline for cyber
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    scanLoop.start();

    // 3. Continuous rotation
    const rotLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotLoop.start();

    // 4. Floating bounce
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();

    return () => {
      ringLoop.stop();
      scanLoop.stop();
      rotLoop.stop();
      floatLoop.stop();
    };
  }, [animationId, pulseAnim1, pulseAnim2, pulseAnim3, scanLineAnim, rotateAnim, floatAnim]);

  if (!animationId || animationId === 'none') {
    return null;
  }

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 1. Pulso Cósmico Astral */}
      {animationId === 'astral-pulse' && (
        <View style={styles.fullStage}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: '#38bdf8',
                transform: [
                  {
                    scale: pulseAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 2.5],
                    }),
                  },
                ],
                opacity: pulseAnim1.interpolate({
                  inputRange: [0, 0.4, 1],
                  outputRange: [0.9, 0.5, 0],
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
                      outputRange: [0.3, 2.2],
                    }),
                  },
                ],
                opacity: pulseAnim2.interpolate({
                  inputRange: [0, 0.4, 1],
                  outputRange: [0.8, 0.4, 0],
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
                      outputRange: [0.2, 1.8],
                    }),
                  },
                ],
                opacity: pulseAnim3.interpolate({
                  inputRange: [0, 0.4, 1],
                  outputRange: [0.7, 0.3, 0],
                }),
              },
            ]}
          />
          {/* Nebula stars */}
          <Text style={[styles.starParticle, { top: '14%', left: '18%' }]}>✦</Text>
          <Text style={[styles.starParticle, { top: '22%', right: '15%' }]}>✦</Text>
          <Text style={[styles.starParticle, { top: '35%', left: '12%' }]}>★</Text>
          <Text style={[styles.starParticle, { top: '48%', right: '20%' }]}>✦</Text>
          <Text style={[styles.starParticle, { top: '65%', left: '22%' }]}>★</Text>
        </View>
      )}

      {/* 2. Cyber Matrix Glitch */}
      {animationId === 'cyber-glitch' && (
        <View style={styles.fullStage}>
          {/* Cyber edge glow */}
          <View style={[styles.cyberBorderGlow, { borderColor: '#00f0ff' }]} />
          {/* Moving Laser Scanline */}
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
          <Text style={[styles.cyberTag, { top: '18%', right: '8%' }]}>01_ONLINE</Text>
          <Text style={[styles.cyberTag, { top: '55%', left: '8%' }]}>SYS_SYNC</Text>
        </View>
      )}

      {/* 3. Atardecer Synthwave */}
      {animationId === 'synthwave-horizon' && (
        <View style={styles.fullStage}>
          {/* Synthwave Sun */}
          <Animated.View
            style={[
              styles.synthSun,
              {
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -12],
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
          </Animated.View>
          {/* Perspective Floor Grid */}
          <LinearGradient
            colors={['transparent', 'rgba(255, 0, 127, 0.18)', 'rgba(121, 40, 202, 0.25)']}
            style={styles.gridFloor}
          />
        </View>
      )}

      {/* 4. Ondas de Espectro Neón */}
      {animationId === 'neon-equalizer' && (
        <View style={styles.fullStage}>
          <View style={styles.equalizerRow}>
            {[14, 28, 42, 22, 50, 35, 18, 45, 30, 15, 38, 25].map((h, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.eqBar,
                  {
                    height: h * 1.5,
                    backgroundColor: i % 2 === 0 ? '#10b981' : '#00f0ff',
                    transform: [
                      {
                        scaleY: floatAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.4 + (i % 3) * 0.2, 1.1, 0.5 + (i % 4) * 0.15],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* 5. Brisa Sakura Neón */}
      {animationId === 'sakura-drift' && (
        <View style={styles.fullStage}>
          <Animated.Text
            style={[
              styles.petalText,
              {
                top: '16%',
                left: '20%',
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 24],
                    }),
                  },
                ],
              },
            ]}
          >
            🌸
          </Animated.Text>
          <Animated.Text
            style={[
              styles.petalText,
              {
                top: '25%',
                right: '22%',
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            🌸
          </Animated.Text>
          <Animated.Text
            style={[
              styles.petalText,
              {
                top: '45%',
                left: '14%',
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 30],
                    }),
                  },
                ],
              },
            ]}
          >
            🌸
          </Animated.Text>
          <Animated.Text
            style={[
              styles.petalText,
              {
                top: '60%',
                right: '18%',
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [24, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            🌸
          </Animated.Text>
        </View>
      )}

      {/* 6. Supernova Real Oro VIP */}
      {animationId === 'supernova-gold' && (
        <View style={styles.fullStage}>
          {/* Rotating gold halo */}
          <Animated.View
            style={[
              styles.goldHalo,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(255,215,0,0.35)', 'transparent', 'rgba(255,170,0,0.3)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.goldHaloGrad}
            />
          </Animated.View>
          <Text style={[styles.goldSparkle, { top: '15%', left: '16%' }]}>✨</Text>
          <Text style={[styles.goldSparkle, { top: '24%', right: '18%' }]}>⭐</Text>
          <Text style={[styles.goldSparkle, { top: '40%', left: '10%' }]}>✨</Text>
          <Text style={[styles.goldSparkle, { top: '56%', right: '14%' }]}>✨</Text>
        </View>
      )}

      {/* 7. Fuego Abisal Violeta */}
      {animationId === 'abyssal-flame' && (
        <View style={styles.fullStage}>
          {/* Ascending ember sparks */}
          <Animated.Text
            style={[
              styles.emberText,
              {
                bottom: '30%',
                left: '25%',
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -35],
                    }),
                  },
                ],
                opacity: floatAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.9, 0.4, 0.9],
                }),
              },
            ]}
          >
            🔥
          </Animated.Text>
          <Animated.Text
            style={[
              styles.emberText,
              {
                bottom: '22%',
                right: '25%',
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 10],
                    }),
                  },
                ],
                opacity: floatAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 0.9, 0.3],
                }),
              },
            ]}
          >
            ✨
          </Animated.Text>
          <Animated.Text
            style={[
              styles.emberText,
              {
                bottom: '45%',
                right: '15%',
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -40],
                    }),
                  },
                ],
              },
            ]}
          >
            🟣
          </Animated.Text>
          {/* Ground violet aura */}
          <LinearGradient
            colors={['transparent', 'rgba(168,85,247,0.22)', 'rgba(236,72,153,0.3)']}
            style={styles.abyssGround}
          />
        </View>
      )}

      {/* Top Floating Badge Pill */}
      {showBadge && (
        <View style={styles.badgePillWrap}>
          <View style={[styles.badgePill, { borderColor: animDef.accent }]}>
            <Ionicons name="sparkles" size={11} color={animDef.accent} />
            <Text style={[styles.badgePillText, { color: animDef.accent }]}>
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
    borderWidth: 2.5,
    alignSelf: 'center',
  },
  starParticle: {
    position: 'absolute',
    color: '#38bdf8',
    fontSize: 16,
    textShadowColor: 'rgba(56, 189, 248, 0.8)',
    textShadowRadius: 8,
  },
  cyberBorderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderRadius: 20,
    opacity: 0.45,
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
    gap: 5,
    height: 90,
    width: '100%',
    paddingHorizontal: 20,
  },
  eqBar: {
    width: 6,
    borderRadius: 3,
  },
  petalText: {
    position: 'absolute',
    fontSize: 20,
    opacity: 0.85,
  },
  goldHalo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  goldHaloGrad: {
    flex: 1,
    borderRadius: 130,
  },
  goldSparkle: {
    position: 'absolute',
    fontSize: 18,
    textShadowColor: 'rgba(255, 215, 0, 0.9)',
    textShadowRadius: 10,
  },
  emberText: {
    position: 'absolute',
    fontSize: 18,
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
    top: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
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
