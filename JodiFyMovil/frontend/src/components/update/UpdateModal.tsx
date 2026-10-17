import { useEffect, useRef, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { PressableFluid } from '@components/ui/PressableFluid';
import { useUpdateStore } from '@stores/update.store';
import { colors, typography, radius } from '@theme';
import { extractMobileUpdateHighlights } from '../../utils/updateNotesParser';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

// ==========================================
// DETAILED PARTICLE SYSTEM
// ==========================================
interface ParticleConfig {
  id: number;
  startX: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  swayDist: number;
}

const PARTICLE_COLORS = ['#00E5FF', '#7F00FF', '#00E676', '#E0AAFF', '#38BDF8'];

function createParticleConfigs(count: number): ParticleConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    startX: Math.random() * 320,
    size: 2 + Math.random() * 3.5,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length] || '#00E5FF',
    duration: 3200 + Math.random() * 3000,
    delay: Math.random() * 2000,
    swayDist: (Math.random() - 0.5) * 30,
  }));
}

function SingleParticle({ config }: { config: ParticleConfig }) {
  const animY = useRef(new Animated.Value(0)).current;
  const animSway = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(config.delay),
        Animated.parallel([
          Animated.timing(animY, {
            toValue: 1,
            duration: config.duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(animSway, {
              toValue: 1,
              duration: config.duration * 0.5,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(animSway, {
              toValue: 0,
              duration: config.duration * 0.5,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(animOpacity, {
              toValue: 0.85,
              duration: config.duration * 0.3,
              useNativeDriver: true,
            }),
            Animated.timing(animOpacity, {
              toValue: 0,
              duration: config.duration * 0.7,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [config, animY, animSway, animOpacity]);

  const translateY = animY.interpolate({
    inputRange: [0, 1],
    outputRange: [280, -20],
  });

  const translateX = animSway.interpolate({
    inputRange: [0, 1],
    outputRange: [0, config.swayDist],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: config.startX,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          shadowColor: config.color,
          opacity: animOpacity,
          transform: [{ translateY }, { translateX }],
        },
      ]}
    />
  );
}

// Mini Audio Equalizer Bar animation during download
function AudioEqualizerMini({ active }: { active: boolean }) {
  const bar1 = useRef(new Animated.Value(6)).current;
  const bar2 = useRef(new Animated.Value(14)).current;
  const bar3 = useRef(new Animated.Value(10)).current;
  const bar4 = useRef(new Animated.Value(18)).current;
  const bar5 = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!active) return undefined;
    const animateBar = (anim: Animated.Value, min: number, max: number, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: max, duration, easing: Easing.linear, useNativeDriver: false }),
          Animated.timing(anim, { toValue: min, duration, easing: Easing.linear, useNativeDriver: false }),
        ])
      );
    };

    const a1 = animateBar(bar1, 4, 18, 380);
    const a2 = animateBar(bar2, 6, 22, 450);
    const a3 = animateBar(bar3, 5, 20, 320);
    const a4 = animateBar(bar4, 8, 24, 490);
    const a5 = animateBar(bar5, 4, 16, 410);

    a1.start();
    a2.start();
    a3.start();
    a4.start();
    a5.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
      a4.stop();
      a5.stop();
    };
  }, [active, bar1, bar2, bar3, bar4, bar5]);

  return (
    <View style={styles.eqRow}>
      <Animated.View style={[styles.eqBar, { height: bar1 }]} />
      <Animated.View style={[styles.eqBar, { height: bar2 }]} />
      <Animated.View style={[styles.eqBar, { height: bar3 }]} />
      <Animated.View style={[styles.eqBar, { height: bar4 }]} />
      <Animated.View style={[styles.eqBar, { height: bar5 }]} />
    </View>
  );
}

export function UpdateModal() {
  const visible = useUpdateStore((s) => s.modalOpen);
  const status = useUpdateStore((s) => s.status);
  const info = useUpdateStore((s) => s.info);
  const progress = useUpdateStore((s) => s.progress);
  const error = useUpdateStore((s) => s.error);
  const startDownload = useUpdateStore((s) => s.startDownload);
  const doInstall = useUpdateStore((s) => s.doInstall);
  const closeModal = useUpdateStore((s) => s.closeModal);
  const cancelDownload = useUpdateStore((s) => s.cancelDownload);

  const [showAllNotes, setShowAllNotes] = useState(false);

  // Entrance spring & opacity
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Concentric radar waves
  const radar1 = useRef(new Animated.Value(0)).current;
  const radar2 = useRef(new Animated.Value(0)).current;

  // Icon spinner & pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;

  // Shimmer ray over progress bar
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Celebration burst when complete
  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;

  const particles = useMemo(() => createParticleConfigs(18), []);

  // Modal entrance
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 65, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.88, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, scale, opacity]);

  // Continuous background animations (radar pulses, cyber ring rotate)
  useEffect(() => {
    if (!visible) return undefined;

    // Cyber ring rotation
    const ringLoop = Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
    );
    ringLoop.start();

    // Radar pulses
    const makeRadar = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, { toValue: 1, duration: 2200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          ]),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    };

    const r1 = makeRadar(radar1, 0);
    const r2 = makeRadar(radar2, 1100);
    r1.start();
    r2.start();

    return () => {
      ringLoop.stop();
      r1.stop();
      r2.stop();
    };
  }, [visible, ringRotate, radar1, radar2]);

  // Pulsing & spinner loop during download
  useEffect(() => {
    if (status === 'downloading') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      const spin = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true })
      );
      const shimmer = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.delay(600),
        ])
      );

      pulse.start();
      spin.start();
      shimmer.start();

      return () => {
        pulse.stop();
        spin.stop();
        shimmer.stop();
      };
    } else {
      pulseAnim.setValue(1);
      spinAnim.setValue(0);
      shimmerAnim.setValue(0);
    }
    return undefined;
  }, [status, pulseAnim, spinAnim, shimmerAnim]);

  // Smooth progress bar interpolation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: Math.max(0, Math.min(100, progress.percent)),
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [progress.percent, progressAnim]);

  // Celebration burst when ready to install
  useEffect(() => {
    if (status === 'ready_to_install') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      burstScale.setValue(0.5);
      burstOpacity.setValue(1);
      Animated.parallel([
        Animated.spring(burstScale, { toValue: 1.6, friction: 5, tension: 40, useNativeDriver: true }),
        Animated.timing(burstOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]).start();
    }
  }, [status, burstScale, burstOpacity]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const ringRotateInterpolate = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const radar1Scale = radar1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] });
  const radar1Opacity = radar1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] });

  const radar2Scale = radar2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] });
  const radar2Opacity = radar2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const parsedHighlights = useMemo(() => {
    return extractMobileUpdateHighlights(info?.notes, info?.latest);
  }, [info?.notes, info?.latest]);

  if (!visible && ((opacity as any)._value ?? 0) === 0) return null;

  const isDownloading = status === 'downloading';
  const isReady = status === 'ready_to_install';
  const isInstalling = status === 'installing';
  const isError = status === 'error';

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={closeModal}>
      <View style={styles.backdrop}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdropDim, { opacity }]} />

        {/* Double-Bezel Outer Casing with Ambient Aura */}
        <Animated.View style={[styles.dialogShell, { opacity, transform: [{ scale }] }]}>
          <LinearGradient
            colors={
              isReady
                ? ['rgba(0, 230, 118, 0.55)', 'rgba(0, 229, 255, 0.35)', 'rgba(127, 0, 255, 0.25)']
                : isError
                ? ['rgba(255, 61, 92, 0.55)', 'rgba(127, 0, 255, 0.35)', 'rgba(0, 229, 255, 0.25)']
                : ['rgba(127, 0, 255, 0.55)', 'rgba(0, 229, 255, 0.4)', 'rgba(127, 0, 255, 0.25)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dialogBorderGlow}
          >
            <View style={styles.dialog}>
              {/* Obsidian Space Glass Background */}
              <LinearGradient
                colors={['#151028', '#0b0818', '#05040a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={styles.cardGradient}
              >
            {/* Ambient Nebula Glow Behind Icon */}
            <LinearGradient
              colors={
                isReady
                  ? ['rgba(0, 230, 118, 0.35)', 'rgba(0, 229, 255, 0.15)', 'transparent']
                  : isError
                  ? ['rgba(255, 61, 92, 0.35)', 'rgba(127, 0, 255, 0.15)', 'transparent']
                  : ['rgba(127, 0, 255, 0.35)', 'rgba(0, 229, 255, 0.2)', 'transparent']
              }
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.headerGlow}
            />

            {/* Floating Particles Engine */}
            <View pointerEvents="none" style={styles.particlesContainer}>
              {particles.map((p) => (
                <SingleParticle key={p.id} config={p} />
              ))}
            </View>

            {/* Celebration Burst Ring */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.celebrationBurst,
                {
                  transform: [{ scale: burstScale }],
                  opacity: burstOpacity,
                },
              ]}
            />

            {/* Holographic Icon with Concentric Radar Waves */}
            <View style={styles.iconContainer}>
              {/* Concentric Sonar Pulses */}
              <Animated.View
                style={[
                  styles.radarRing,
                  {
                    transform: [{ scale: radar1Scale }],
                    opacity: radar1Opacity,
                    borderColor: isReady ? '#00E676' : '#00E5FF',
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.radarRing,
                  {
                    transform: [{ scale: radar2Scale }],
                    opacity: radar2Opacity,
                    borderColor: isReady ? '#00E676' : '#7F00FF',
                  },
                ]}
              />

              {/* Rotating Cyber Outer Ring */}
              <Animated.View
                style={[
                  styles.cyberRing,
                  {
                    transform: [{ rotate: ringRotateInterpolate }],
                    borderColor: isReady ? 'rgba(0, 230, 118, 0.5)' : 'rgba(0, 229, 255, 0.4)',
                  },
                ]}
              />

              {/* Core Icon Circle */}
              <Animated.View
                style={[
                  styles.iconGlowHalo,
                  isDownloading && { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <LinearGradient
                  colors={
                    isReady
                      ? ['#00E676', '#00B0FF']
                      : isError
                      ? ['#FF3D5C', '#7F00FF']
                      : isDownloading
                      ? ['#00E5FF', '#7F00FF']
                      : ['#7F00FF', '#00E5FF']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconCircle}
                >
                  {isDownloading ? (
                    <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                      <Ionicons name="sync" size={32} color={colors.white} />
                    </Animated.View>
                  ) : isReady ? (
                    <Ionicons name="checkmark-done-circle" size={36} color={colors.white} />
                  ) : isError ? (
                    <Ionicons name="alert-circle" size={34} color={colors.white} />
                  ) : (
                    <Ionicons name="sparkles" size={32} color={colors.white} />
                  )}
                </LinearGradient>
              </Animated.View>
            </View>

            {/* Modal Titles & Status Subtitle */}
            <View style={styles.titleWrap}>
              <View style={styles.badgeTopWrap}>
                <View
                  style={[
                    styles.badgeTop,
                    {
                      borderColor: isReady ? '#00E676' : isError ? '#FF3D5C' : '#00E5FF',
                      backgroundColor: isReady ? 'rgba(0,230,118,0.15)' : 'rgba(0,229,255,0.12)',
                    },
                  ]}
                >
                  <Ionicons
                    name={isReady ? 'shield-checkmark' : 'rocket'}
                    size={11}
                    color={isReady ? '#00E676' : '#00E5FF'}
                  />
                  <Text
                    style={[
                      styles.badgeTopText,
                      { color: isReady ? '#00E676' : '#00E5FF' },
                    ]}
                  >
                    {isReady
                      ? 'PAQUETE VERIFICADO Y LISTO'
                      : isDownloading
                      ? 'DESCARGA EN CURSO'
                      : 'ACTUALIZACIÓN OFICIAL JODIFY'}
                  </Text>
                </View>
              </View>

              <Text style={styles.title}>
                {isDownloading
                  ? 'Descargando Actualización…'
                  : isReady
                  ? '¡Descarga Completa!'
                  : isInstalling
                  ? 'Instalando en el Sistema…'
                  : isError
                  ? 'Error de Actualización'
                  : 'Nueva Versión Disponible'}
              </Text>
              <Text style={styles.subtitle}>
                {isDownloading
                  ? 'Transfiriendo el archivo APK oficial desde el servidor de alta velocidad'
                  : isReady
                  ? 'El instalador de Android está listo para aplicar las mejoras sin perder tus datos'
                  : isError
                  ? (error || 'No se pudo completar la operación')
                  : 'Una nueva versión optimizada de JodiFy Mobile está lista para instalar'}
              </Text>
            </View>

            {/* Holographic Version Leap Capsule */}
            <View style={styles.versionCapsule}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.versionCol}>
                <Text style={styles.versionTag}>INSTALADA</Text>
                <Text style={styles.versionNumber}>v{info?.current || '1.0.1'}</Text>
              </View>

              <View style={styles.versionDividerWrap}>
                <LinearGradient
                  colors={['#7F00FF', '#00E5FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.versionArrowGlow}
                >
                  <Ionicons name="arrow-forward" size={14} color="#FFF" />
                </LinearGradient>
              </View>

              <View style={[styles.versionCol, styles.versionColActive]}>
                <Text style={[styles.versionTag, { color: '#00E5FF' }]}>NUEVA</Text>
                <Text style={[styles.versionNumber, styles.versionNumberActive]}>
                  v{info?.latest || '1.0.1'}
                </Text>
              </View>

              {info?.sizeBytes && info.sizeBytes > 0 ? (
                <View style={styles.sizeBadge}>
                  <Ionicons name="file-tray-full-outline" size={11} color="#00E5FF" />
                  <Text style={styles.sizeBadgeText}>{formatBytes(info.sizeBytes)}</Text>
                </View>
              ) : null}
            </View>

            {/* Kinetic Download Progress Box */}
            {isDownloading && (
              <View style={styles.progressContainer}>
                {/* Audio Equalizer Mini Bars for Music Identity */}
                <View style={styles.eqHeaderRow}>
                  <Text style={styles.eqLabel}>TRANSMITIENDO DATOS</Text>
                  <AudioEqualizerMini active={isDownloading} />
                </View>

                {/* Progress Bar Track */}
                <View style={styles.progressBarTrack}>
                  <Animated.View style={[styles.progressBarFill, { width: progressWidth }]}>
                    <LinearGradient
                      colors={['#7F00FF', '#00E5FF', '#00E676']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                </View>

                {/* Telemetry Grid */}
                <View style={styles.telemetryGrid}>
                  <View style={styles.telemetryItem}>
                    <Ionicons name="flash" size={13} color="#00E5FF" />
                    <Text style={styles.telemetryValue}>{progress.speedMBps} MB/s</Text>
                  </View>

                  <View style={styles.telemetryItemCenter}>
                    <Text style={styles.telemetryPercentText}>{progress.percent}%</Text>
                    <Text style={styles.telemetryBytesText}>
                      {formatBytes(progress.downloadedBytes)} de {formatBytes(progress.totalBytes)}
                    </Text>
                  </View>

                  <View style={styles.telemetryItemRight}>
                    <Ionicons name="time-outline" size={13} color="#A78BFA" />
                    <Text style={styles.telemetryValue}>
                      {progress.remainingSeconds > 0 ? `~${progress.remainingSeconds}s` : 'Finalizando'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Novedades de actualización Automáticas */}
            {!isDownloading && parsedHighlights.items.length > 0 && (
              <View style={styles.highlightsContainer}>
                <View style={styles.highlightsHeaderRow}>
                  <View style={styles.highlightsHeaderLeft}>
                    <Ionicons name="sparkles" size={13} color="#00E5FF" />
                    <Text style={styles.highlightsHeader}>NOVEDADES DE ACTUALIZACIÓN</Text>
                  </View>
                  <View style={styles.highlightsCountPill}>
                    <Text style={styles.highlightsCountText}>
                      {parsedHighlights.totalCount} {parsedHighlights.totalCount === 1 ? 'mejora' : 'mejoras'}
                    </Text>
                  </View>
                </View>

                <View style={styles.highlightsList}>
                  {(showAllNotes ? parsedHighlights.allItems : parsedHighlights.items).map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.highlightCard,
                        { borderLeftColor: item.accentColor },
                      ]}
                    >
                      <View
                        style={[
                          styles.highlightIconWrap,
                          {
                            backgroundColor: item.bgGlow,
                            borderColor: item.accentColor + '40',
                          },
                        ]}
                      >
                        <Ionicons name={item.iconName} size={15} color={item.accentColor} />
                      </View>
                      <View style={styles.highlightContent}>
                        <View style={styles.highlightTitleRow}>
                          <Text style={styles.highlightTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <View
                            style={[
                              styles.highlightTagWrap,
                              {
                                backgroundColor: item.bgGlow,
                                borderColor: item.accentColor + '50',
                              },
                            ]}
                          >
                            <Text style={[styles.highlightTagText, { color: item.accentColor }]}>
                              {item.tag}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.highlightDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {parsedHighlights.hasMore && (
                  <PressableFluid
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowAllNotes(!showAllNotes);
                    }}
                    haptic="light"
                    style={styles.expandHighlightsBtn}
                  >
                    <Text style={styles.expandHighlightsText}>
                      {showAllNotes
                        ? 'Mostrar solo lo principal'
                        : `Ver todas las mejoras (+${parsedHighlights.totalCount - 3})`}
                    </Text>
                    <Ionicons
                      name={showAllNotes ? 'chevron-up' : 'chevron-down'}
                      size={12}
                      color="#00E5FF"
                    />
                  </PressableFluid>
                )}
              </View>
            )}

            {/* Action Buttons con patrón Button-in-Button */}
            <View style={styles.actionContainer}>
              {isReady ? (
                <PressableFluid
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    void doInstall();
                  }}
                  haptic="medium"
                  style={styles.primaryBtn}
                >
                  <LinearGradient
                    colors={['#00E676', '#00B0FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtnFill}
                  >
                    <View style={styles.btnContentWrap}>
                      <Text style={styles.primaryBtnText}>Instalar Actualización Ahora</Text>
                      <View style={styles.btnNestedIconCircle}>
                        <Ionicons name="checkmark-circle" size={17} color={colors.white} />
                      </View>
                    </View>
                  </LinearGradient>
                </PressableFluid>
              ) : isDownloading ? (
                <PressableFluid
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    cancelDownload();
                  }}
                  haptic="light"
                  style={styles.cancelBtn}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#FF5252" style={{ marginRight: 6 }} />
                  <Text style={styles.cancelBtnText}>Cancelar Descarga</Text>
                </PressableFluid>
              ) : (
                <PressableFluid
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    void startDownload();
                  }}
                  haptic="medium"
                  style={styles.primaryBtn}
                >
                  <LinearGradient
                    colors={['#7F00FF', '#00E5FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtnFill}
                  >
                    <View style={styles.btnContentWrap}>
                      <Text style={styles.primaryBtnText}>Descargar e Instalar</Text>
                      <View style={styles.btnNestedIconCircle}>
                        <Ionicons name="cloud-download-outline" size={17} color={colors.white} />
                      </View>
                    </View>
                  </LinearGradient>
                </PressableFluid>
              )}

              {!info?.mandatory && !isDownloading && (
                <PressableFluid
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    closeModal();
                  }}
                  haptic="light"
                  style={styles.dismissBtn}
                >
                  <Text style={styles.dismissBtnText}>Recordarme más tarde</Text>
                </PressableFluid>
              )}
            </View>
              </LinearGradient>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  backdropDim: {
    backgroundColor: 'rgba(3, 3, 5, 0.88)',
  },
  dialogShell: {
    width: Math.min(SCREEN_WIDTH - 24, 420),
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 32,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
  },
  dialogBorderGlow: {
    padding: 2,
    borderRadius: 28,
  },
  dialog: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#070510',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardGradient: {
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 170,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 2,
  },
  celebrationBurst: {
    position: 'absolute',
    top: 30,
    left: '50%',
    marginLeft: -60,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#00E676',
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 16,
    position: 'relative',
    height: 86,
  },
  radarRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1.5,
  },
  cyberRing: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1.2,
    borderStyle: 'dashed',
  },
  iconGlowHalo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127, 0, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeTopWrap: {
    marginBottom: 8,
  },
  badgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeTopText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17.5,
    paddingHorizontal: 8,
  },
  versionCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  versionCol: {
    alignItems: 'flex-start',
  },
  versionColActive: {
    alignItems: 'flex-start',
  },
  versionTag: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  versionNumber: {
    color: colors.textSecondary,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 14.5,
    fontWeight: '700',
    marginTop: 1,
  },
  versionNumberActive: {
    color: colors.white,
    fontWeight: '800',
  },
  versionDividerWrap: {
    paddingHorizontal: 4,
  },
  versionArrowGlow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  sizeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
  },
  sizeBadgeText: {
    color: '#00E5FF',
    fontSize: 11,
    fontWeight: '800',
  },
  progressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    marginBottom: 18,
  },
  eqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eqLabel: {
    color: '#00E5FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  eqRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 24,
  },
  eqBar: {
    width: 3.5,
    borderRadius: 2,
    backgroundColor: '#00E5FF',
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  telemetryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  telemetryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  telemetryItemCenter: {
    alignItems: 'center',
    flex: 1.5,
  },
  telemetryItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    flex: 1,
  },
  telemetryValue: {
    color: colors.white,
    fontSize: 11.5,
    fontWeight: '700',
  },
  telemetryPercentText: {
    color: '#00E5FF',
    fontFamily: typography.displaySmall.fontFamily,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 229, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  telemetryBytesText: {
    color: colors.textMuted,
    fontSize: 10.5,
  },
  /* Novedades de actualización Automáticas */
  highlightsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  highlightsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  highlightsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlightsHeader: {
    color: '#E0E7FF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  highlightsCountPill: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.28)',
  },
  highlightsCountText: {
    color: '#00E5FF',
    fontSize: 9.5,
    fontWeight: '800',
    fontFamily: typography.labelSmall.fontFamily,
  },
  highlightsList: {
    gap: 7,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderLeftWidth: 3,
  },
  highlightIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 1,
  },
  highlightContent: {
    flex: 1,
    gap: 2,
  },
  highlightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  highlightTitle: {
    flex: 1,
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 12,
    fontWeight: '700',
  },
  highlightTagWrap: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  highlightTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  highlightDesc: {
    color: colors.textSecondary,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
    lineHeight: 15,
  },
  expandHighlightsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    marginTop: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderStyle: 'dashed',
  },
  expandHighlightsText: {
    color: '#00E5FF',
    fontSize: 11,
    fontWeight: '700',
  },
  actionContainer: {
    gap: 10,
  },
  primaryBtn: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryBtnFill: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  btnContentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 4,
    height: 40,
  },
  btnNestedIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.35)',
  },
  cancelBtnText: {
    color: '#FF5252',
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
  dismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dismissBtnText: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12.5,
  },
});