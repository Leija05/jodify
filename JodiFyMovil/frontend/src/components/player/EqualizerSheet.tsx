import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, ScrollView, StyleSheet, Text, View, PanResponder, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableFluid } from '@components/ui/PressableFluid';
import { EqualizerBars } from '@components/ui/EqualizerBars';
import { Slider } from '@components/ui/Slider';
import { useEqStore } from '@stores/eq.store';
import { useUiStore } from '@stores/ui.store';
import { usePlayerStore } from '@stores/player.store';
import { useLibraryStore } from '@stores/library.store';
import { colors, typography, radius, motion } from '@theme';

const SCREEN = Dimensions.get('window');
const DISMISS_THRESHOLD = 130;

const BAND_LABELS = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];

const EQ_PRESETS: Record<string, { name: string; values: number[] }> = {
  flat: { name: 'Flat', values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  bass: { name: 'Bass Boost', values: [6, 4, 2, 1, 0, -1, -2, -3, -4, -5] },
  vocal: { name: 'Vocal', values: [-3, -2, 0, 2, 4, 5, 4, 2, 0, -2] },
  rock: { name: 'Rock', values: [4, 3, 2, 0, -2, -1, 1, 3, 4, 5] },
  electronic: { name: 'Electronic', values: [5, 3, 1, -1, -2, -1, 1, 3, 5, 6] },
  classical: { name: 'Classical', values: [2, 1, 0, -1, 0, 1, 2, 3, 4, 3] },
  pop: { name: 'Pop', values: [2, 1, 0, 1, 3, 4, 3, 2, 1, 0] },
  jazz: { name: 'Jazz', values: [3, 2, 1, 0, 1, 2, 3, 2, 1, 0] },
};

export const EqualizerSheet = React.forwardRef<{ open: () => void; close: () => void }, any>(
  ({ ...props }, _ref) => {
    const open = useUiStore((s) => s.equalizerOpen);
    const closeEqualizer = useUiStore((s) => s.closeEqualizer);
    const enabled = useEqStore((s) => s.enabled);
    const preset = useEqStore((s) => s.preset);
    const values = useEqStore((s) => s.values);
    const bassBoost = useEqStore((s) => s.bassBoost);
    const virtualizer = useEqStore((s) => s.virtualizer);
    const setEnabled = useEqStore((s) => s.setEnabled);
    const setPreset = useEqStore((s) => s.setPreset);
    const setBand = useEqStore((s) => s.setBand);
    const setBassBoost = useEqStore((s) => s.setBassBoost);
    const setVirtualizer = useEqStore((s) => s.setVirtualizer);
    const smooth = useEqStore((s) => s.smooth);
    const vibe = useEqStore((s) => s.vibe);
    const reset = useEqStore((s) => s.reset);
    const insets = useSafeAreaInsets();

    const currentSong = usePlayerStore((s) => s.currentSong);
    const isPlaying = usePlayerStore((s) => s.isPlaying);
    const togglePlay = usePlayerStore((s) => s.togglePlay);
    const playSong = usePlayerStore((s) => s.playSong);
    const librarySongs = useLibraryStore((s) => s.songs);

    const translateY = useRef(new Animated.Value(SCREEN.height)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const panResponderRef = useRef<ReturnType<typeof PanResponder.create> | null>(null);
    const isAnimatingOutRef = useRef(false);

    const animateIn = useCallback(() => {
      isAnimatingOutRef.current = false;
      translateY.setValue(SCREEN.height);
      opacity.setValue(0);
      Animated.spring(translateY, { toValue: 0, ...motion.springDrawer, useNativeDriver: true }).start();
      Animated.spring(opacity, { toValue: 1, ...motion.springDrawer, useNativeDriver: true }).start();
    }, [translateY, opacity]);

    const animateOut = useCallback(() => {
      if (isAnimatingOutRef.current) return;
      isAnimatingOutRef.current = true;
      Animated.parallel([
        Animated.spring(translateY, { toValue: SCREEN.height, ...motion.springDrawer, useNativeDriver: true }),
        Animated.spring(opacity, { toValue: 0, ...motion.springDrawer, useNativeDriver: true }),
      ]).start(() => {
        closeEqualizer();
        translateY.setValue(SCREEN.height);
        opacity.setValue(0);
        isAnimatingOutRef.current = false;
      });
    }, [translateY, opacity, closeEqualizer]);

    useEffect(() => {
      if (open) animateIn();
    }, [open, animateIn]);

    const springBack = useCallback(() => {
      if (isAnimatingOutRef.current) return;
      Animated.spring(translateY, { toValue: 0, ...motion.springDrawer, useNativeDriver: true }).start();
    }, [translateY]);

    const dismiss = useCallback(() => {
      animateOut();
    }, [animateOut]);

    useEffect(() => {
      panResponderRef.current = PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_event, gestureState) => gestureState.dy > 18 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2.2,
        onPanResponderGrant: () => {
          translateY.extractOffset();
          isAnimatingOutRef.current = false;
        },
        onPanResponderMove: (_event, gestureState) => {
          const dy = gestureState.dy;
          if (dy > 0) {
            const clampedDy = Math.min(dy, SCREEN.height * 0.55);
            translateY.setValue(clampedDy);
            const progress = Math.min(dy / DISMISS_THRESHOLD, 1);
            const easedProgress = progress * progress;
            opacity.setValue(1 - easedProgress * 0.5);
          }
        },
        onPanResponderRelease: (_event, gestureState) => {
          translateY.flattenOffset();
          const { dy, vy } = gestureState;
          if (dy > DISMISS_THRESHOLD || (dy > 60 && vy > 0.45)) {
            dismiss();
          } else {
            springBack();
          }
        },
        onPanResponderTerminate: springBack,
      });
    }, [dismiss, springBack]);

    if (!open) return null;

    return (
      <Modal
        visible={open}
        transparent
        animationType="none"
        presentationStyle="overFullScreen"
        onRequestClose={dismiss}
        statusBarTranslucent
        {...props}
      >
        <Animated.View
          style={[
            styles.container,
            { opacity, transform: [{ translateY }] },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10, 10, 16, 0.96)' }]} />
          )}

          {/* Drag Handle Bar and Header with Dismiss Gesture */}
          <View {...panResponderRef.current?.panHandlers} style={[styles.header, { paddingTop: Math.max(44, insets.top) }]}>
            <PressableFluid onPress={dismiss} haptic="light" hitSlop={12} style={styles.dismissBtn}>
              <Ionicons name="chevron-down-outline" size={28} color={colors.white} />
            </PressableFluid>
            <View style={styles.headerCenter}>
              <View style={styles.headerDragPill} />
              <Text style={styles.headerTitle}>Ecualizador de Estudio</Text>
            </View>
            <PressableFluid
              onPress={() => setEnabled(!enabled)}
              haptic="selection"
              style={[
                styles.toggleBtn,
                enabled && styles.toggleBtnOn,
              ]}
              hitSlop={8}
            >
              <Ionicons name={enabled ? 'toggle' : 'toggle-outline'} size={28} color={enabled ? colors.secondary : colors.textMuted} />
            </PressableFluid>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Visualizer & Status */}
            <View style={styles.visualizer}>
              <EqualizerBars
                playing={enabled && isPlaying}
                bars={12}
                height={64}
                barWidth={10}
                gap={5}
                color={enabled ? colors.secondary : colors.textMuted}
              />
              <Text style={[styles.statusIndicatorText, { color: enabled ? colors.secondary : colors.warning }]}>
                {enabled ? '● PROCESADOR DSP ACTIVO' : '○ EN BYPASS DIRECTO (DESACTIVADO)'}
              </Text>
            </View>

            {/* Test Audio Preview Bar */}
            <View style={styles.testBarCard}>
              <View style={styles.testBarLeft}>
                <Ionicons name="musical-notes" size={20} color={colors.secondary} />
                <View style={styles.testBarTexts}>
                  <Text style={styles.testBarTitle} numberOfLines={1}>
                    {currentSong ? currentSong.name : 'Probar Ecualización'}
                  </Text>
                  <Text style={styles.testBarSubtitle}>
                    {currentSong ? (isPlaying ? 'Reproduciendo audio en vivo' : 'En pausa · Toca play para probar') : 'Toca el botón para cargar una pista de prueba'}
                  </Text>
                </View>
              </View>
              <PressableFluid
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (currentSong) {
                    togglePlay();
                  } else if (librarySongs.length > 0) {
                    const first = librarySongs[0];
                    if (first) playSong(first, librarySongs);
                  }
                }}
                haptic="medium"
                style={styles.testPlayBtn}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={18}
                  color={colors.white}
                />
              </PressableFluid>
            </View>

            {!enabled && (
              <View style={styles.bypassWarning}>
                <Ionicons name="information-circle" size={18} color={colors.warning} />
                <Text style={styles.bypassWarningText}>
                  El ecualizador está apagado. Toca el interruptor arriba a la derecha para activar las 10 bandas y los efectos DSP.
                </Text>
              </View>
            )}

            {/* Master FX DSP: Bass Boost & Surround 3D */}
            <View style={styles.fxGrid}>
              <View style={styles.fxCard}>
                <View style={styles.fxHeader}>
                  <View style={styles.fxHeaderLeft}>
                    <Ionicons name="flame" size={18} color="#FF007A" />
                    <Text style={styles.fxTitle}>BASS BOOST</Text>
                  </View>
                  <Text style={[styles.fxValue, { color: '#FF007A' }]}>{bassBoost}%</Text>
                </View>
                <Slider
                  value={bassBoost}
                  onValueChange={setBassBoost}
                  min={0}
                  max={100}
                  step={1}
                  disabled={!enabled}
                  trackHeight={5}
                  thumbSize={18}
                  style={styles.fxSlider}
                  activeTrackStyle={{ backgroundColor: '#FF007A' }}
                />
              </View>

              <View style={styles.fxCard}>
                <View style={styles.fxHeader}>
                  <View style={styles.fxHeaderLeft}>
                    <Ionicons name="headset" size={18} color={colors.secondary} />
                    <Text style={styles.fxTitle}>SURROUND 3D</Text>
                  </View>
                  <Text style={[styles.fxValue, { color: colors.secondary }]}>{virtualizer}%</Text>
                </View>
                <Slider
                  value={virtualizer}
                  onValueChange={setVirtualizer}
                  min={0}
                  max={100}
                  step={1}
                  disabled={!enabled}
                  trackHeight={5}
                  thumbSize={18}
                  style={styles.fxSlider}
                  activeTrackStyle={{ backgroundColor: colors.secondary }}
                />
              </View>
            </View>

            <View style={styles.bands}>
              {values.map((value, index) => (
                <View key={index} style={styles.band}>
                  <Text style={styles.bandLabel}>{BAND_LABELS[index]}</Text>
                  <Slider
                    value={value}
                    onValueChange={(v) => setBand(index, v)}
                    min={-12}
                    max={12}
                    step={0.5}
                    disabled={!enabled}
                    trackHeight={5}
                    thumbSize={18}
                    style={styles.slider}
                    activeTrackStyle={styles.activeTrack}
                  />
                  <Text style={styles.bandValue}>{value > 0 ? '+' : ''}{value.toFixed(1)} dB</Text>
                </View>
              ))}
            </View>

            <View style={styles.presets}>
              <Text style={styles.presetsTitle}>Presets</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
                {Object.entries(EQ_PRESETS).map(([key]) => {
                  const presetData = EQ_PRESETS[key];
                  return (
                    <PressableFluid
                      key={key}
                      onPress={() => setPreset(key)}
                      haptic="selection"
                      style={[
                        styles.presetBtn,
                        key === preset && styles.presetBtnActive,
                      ]}
                      hitSlop={8}
                    >
                      <Text style={[
                        styles.presetBtnText,
                        key === preset && styles.presetBtnTextActive,
                      ]}>
                        {presetData?.name ?? key}
                      </Text>
                    </PressableFluid>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.actionRow}>
              <PressableFluid
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  smooth();
                }}
                haptic="light"
                style={styles.actionPill}
              >
                <Ionicons name="pulse" size={16} color={colors.secondary} />
                <Text style={styles.actionPillText}>Suavizar</Text>
              </PressableFluid>

              <PressableFluid
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  vibe();
                }}
                haptic="medium"
                style={styles.actionPill}
              >
                <Ionicons name="sparkles" size={16} color={colors.accent} />
                <Text style={styles.actionPillText}>Vibe</Text>
              </PressableFluid>

              <PressableFluid
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  reset();
                }}
                haptic="light"
                style={styles.actionPill}
              >
                <Ionicons name="refresh" size={16} color={colors.textMuted} />
                <Text style={styles.actionPillText}>Reset</Text>
              </PressableFluid>
            </View>

            {/* Informative Frequency Calibration Guide */}
            <View style={styles.guideCard}>
              <View style={styles.guideHeader}>
                <Ionicons name="information-circle-outline" size={18} color={colors.secondary} />
                <Text style={styles.guideTitle}>Calibración de Frecuencias</Text>
              </View>
              <Text style={styles.guideDesc}>
                • <Text style={styles.guideBold}>32Hz - 64Hz</Text>: Sub-graves profundos y vibración.{'\n'}
                • <Text style={styles.guideBold}>125Hz - 250Hz</Text>: Pegada de bombos y cuerpo del bajo.{'\n'}
                • <Text style={styles.guideBold}>500Hz - 2kHz</Text>: Presencia vocal e instrumentos.{'\n'}
                • <Text style={styles.guideBold}>4kHz - 16kHz</Text>: Nitidez de platillos, brillo y aire.
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 16,
    zIndex: 10,
  },
  dismissBtn: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerDragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    marginBottom: 6,
  },
  headerTitle: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: typography.headlineMedium.fontSize,
    letterSpacing: typography.headlineMedium.letterSpacing,
  },
  toggleBtn: {
    padding: 8,
  },
  toggleBtnOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryStrong,
  },
  content: {
    flexGrow: 1,
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: 20,
    gap: 20,
  },
  visualizer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  statusIndicatorText: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
  },
  testBarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  testBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  testBarTexts: {
    flex: 1,
  },
  testBarTitle: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13.5,
    fontWeight: '700',
  },
  testBarSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
    marginTop: 2,
  },
  testPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bypassWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 179, 0, 0.12)',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.3)',
  },
  bypassWarningText: {
    flex: 1,
    color: colors.warning,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
    lineHeight: 16,
  },
  bands: {
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 2,
  },
  bandLabel: {
    color: colors.textSecondary,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 13,
    width: 44,
  },
  slider: {
    flex: 1,
  },
  activeTrack: {
    backgroundColor: colors.secondary,
  },
  bandValue: {
    color: colors.textMuted,
    fontFamily: typography.monoSmall.fontFamily,
    fontSize: 12,
    width: 58,
    textAlign: 'right',
  },
  presets: {
    gap: 12,
  },
  presetsTitle: {
    color: colors.textSecondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  presetsRow: {
    gap: 10,
    paddingHorizontal: 4,
  },
  presetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryStrong,
  },
  presetBtnText: {
    color: colors.text,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
  },
  presetBtnTextActive: {
    color: colors.white,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    paddingBottom: 24,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPillText: {
    color: colors.text,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
  },
  fxGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  fxCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  fxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fxHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fxTitle: {
    color: colors.textSecondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  fxValue: {
    fontFamily: typography.monoSmall.fontFamily,
    fontSize: 12,
    fontWeight: '700',
  },
  fxSlider: {
    marginTop: 4,
  },
  guideCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 8,
    marginBottom: 24,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  guideTitle: {
    color: colors.text,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13,
  },
  guideDesc: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
    lineHeight: 18,
  },
  guideBold: {
    color: colors.white,
    fontWeight: '600',
  },
});