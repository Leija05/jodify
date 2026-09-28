import { useEffect, useRef, useMemo } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Dimensions,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { PressableFluid } from '@components/ui/PressableFluid';
import { useUpdateStore } from '@stores/update.store';
import { colors, typography, radius } from '@theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
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

  // Entrance animations
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Pulse & spin animations for download state
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.92, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Pulsing animation loop during downloading
  useEffect(() => {
    if (status === 'downloading') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      const spin = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })
      );
      pulse.start();
      spin.start();
      return () => {
        pulse.stop();
        spin.stop();
      };
    } else {
      pulseAnim.setValue(1);
      spinAnim.setValue(0);
    }
    return undefined;
  }, [status]);

  // Smooth progress bar animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: Math.max(0, Math.min(100, progress.percent)),
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress.percent]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const notesList = useMemo(() => {
    if (!info?.notes) return ['Mejoras de rendimiento y estabilidad'];
    return info.notes
      .split('\n')
      .map((line) => line.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
  }, [info?.notes]);

  if (!visible && ((opacity as any)._value ?? 0) === 0) return null;

  const isDownloading = status === 'downloading';
  const isReady = status === 'ready_to_install';
  const isInstalling = status === 'installing';
  const isError = status === 'error';

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={closeModal}>
      <View style={styles.backdrop}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdropDim, { opacity }]} />

        <Animated.View style={[styles.dialog, { opacity, transform: [{ scale }] }]}>
          {/* Obsidian Glass Gradient Border */}
          <LinearGradient
            colors={['#1F1A3A', '#0F0D1A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cardGradient}
          >
            {/* Header Glow Banner */}
            <LinearGradient
              colors={['rgba(127, 0, 255, 0.25)', 'rgba(0, 229, 255, 0.1)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGlow}
            />

            {/* Icon Graphic Container */}
            <View style={styles.iconContainer}>
              <Animated.View
                style={[
                  styles.iconGlowHalo,
                  isDownloading && { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <LinearGradient
                  colors={isReady ? ['#00E676', '#00B0FF'] : isError ? ['#FF3D5C', '#7F00FF'] : ['#7F00FF', '#00E5FF']}
                  style={styles.iconCircle}
                >
                  {isDownloading ? (
                    <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                      <Ionicons name="sync" size={32} color={colors.white} />
                    </Animated.View>
                  ) : isReady ? (
                    <Ionicons name="checkmark-done" size={34} color={colors.white} />
                  ) : isError ? (
                    <Ionicons name="alert-circle" size={34} color={colors.white} />
                  ) : (
                    <Ionicons name="cloud-download" size={32} color={colors.white} />
                  )}
                </LinearGradient>
              </Animated.View>
            </View>

            {/* Modal Titles */}
            <View style={styles.titleWrap}>
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
                  ? 'Obteniendo el paquete APK oficial desde la base de datos'
                  : isReady
                  ? 'El paquete está verificado y listo para ser instalado'
                  : isError
                  ? (error || 'No se pudo completar la operación')
                  : 'Una nueva versión de JodiFy Mobile está lista para instalar'}
              </Text>
            </View>

            {/* Version Transition Badge */}
            <View style={styles.versionBadgeRow}>
              <View style={styles.versionBadge}>
                <Text style={styles.versionBadgeLabel}>ACTUAL</Text>
                <Text style={styles.versionBadgeText}>v{info?.current || '1.0.0'}</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.secondary} />
              <View style={[styles.versionBadge, styles.versionBadgeActive]}>
                <Text style={[styles.versionBadgeLabel, { color: colors.secondary }]}>NUEVA</Text>
                <Text style={[styles.versionBadgeText, { color: colors.white }]}>v{info?.latest || '2.0.0'}</Text>
              </View>
              {info?.sizeBytes && info.sizeBytes > 0 ? (
                <View style={styles.sizePill}>
                  <Text style={styles.sizePillText}>{formatBytes(info.sizeBytes)}</Text>
                </View>
              ) : null}
            </View>

            {/* Download Progress Box */}
            {isDownloading && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarTrack}>
                  <Animated.View style={[styles.progressBarFill, { width: progressWidth }]}>
                    <LinearGradient
                      colors={['#7F00FF', '#00E5FF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                </View>

                <View style={styles.progressMetricsRow}>
                  <Text style={styles.progressPercentText}>{progress.percent}%</Text>
                  <Text style={styles.progressBytesText}>
                    {formatBytes(progress.downloadedBytes)} de {formatBytes(progress.totalBytes)}
                  </Text>
                </View>

                <View style={styles.speedRow}>
                  <Text style={styles.speedText}>
                    <Ionicons name="flash" size={11} color={colors.secondary} /> {progress.speedMBps} MB/s
                  </Text>
                  {progress.remainingSeconds > 0 && (
                    <Text style={styles.speedText}>
                      <Ionicons name="time-outline" size={11} color={colors.textMuted} /> ~{progress.remainingSeconds}s restantes
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Release Notes / Changelog List */}
            {!isDownloading && notesList.length > 0 && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesHeader}>NOVEDADES DE ESTA VERSIÓN</Text>
                <ScrollView style={styles.notesScroll} showsVerticalScrollIndicator={false}>
                  {notesList.map((item, index) => (
                    <View key={index} style={styles.noteItem}>
                      <Ionicons name="sparkles" size={12} color={colors.secondary} style={styles.noteIcon} />
                      <Text style={styles.noteText}>{item}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              {isReady ? (
                <PressableFluid
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                    <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                    <Text style={styles.primaryBtnText}>Instalar Actualización</Text>
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
                    <Ionicons name="cloud-download-outline" size={18} color={colors.white} />
                    <Text style={styles.primaryBtnText}>Descargar e Instalar</Text>
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
                  <Text style={styles.dismissBtnText}>Más tarde</Text>
                </PressableFluid>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  dialog: {
    width: Math.min(SCREEN_WIDTH - 36, 400),
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(127, 0, 255, 0.35)',
    elevation: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
  cardGradient: {
    padding: 24,
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  iconGlowHalo: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127, 0, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  versionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 18,
  },
  versionBadge: {
    alignItems: 'center',
  },
  versionBadgeActive: {
    backgroundColor: 'rgba(127, 0, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.md,
  },
  versionBadgeLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  versionBadgeText: {
    color: colors.textSecondary,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
  sizePill: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  sizePillText: {
    color: colors.secondary,
    fontSize: 10.5,
    fontWeight: '700',
  },
  progressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(127, 0, 255, 0.25)',
    marginBottom: 18,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPercentText: {
    color: colors.white,
    fontFamily: typography.displaySmall.fontFamily,
    fontSize: 16,
    fontWeight: '700',
  },
  progressBytesText: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11.5,
  },
  speedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  speedText: {
    color: colors.textSecondary,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
  },
  notesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
    maxHeight: 120,
  },
  notesHeader: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  notesScroll: {
    maxHeight: 85,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  noteIcon: {
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    color: colors.textSecondary,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
    lineHeight: 16,
  },
  actionContainer: {
    gap: 10,
  },
  primaryBtn: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  primaryBtnFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  primaryBtnText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 61, 92, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 61, 92, 0.3)',
  },
  cancelBtnText: {
    color: colors.error,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 13,
    fontWeight: '600',
  },
  dismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dismissBtnText: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 13,
  },
});