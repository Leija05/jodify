import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { PanResponder, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DEFAULT_EQ_PRESETS, EQ_BANDS, EQ_MAX, EQ_MIN, EQ_PRESET_LABELS } from '../../lib/constants';
import { clamp } from '../../lib/utils';
import { checkNativeAvailability, isEqualizerAvailable } from '../../services/equalizer.service';
import { useEqStore } from '../../store/eq.store';
import { useUiStore } from '../../store/ui.store';
import { colors, typography, gradients, radius, touch } from '../../theme';
import { BottomSheet } from '../ui/BottomSheet';
import { PressableScale } from '../ui/PressableScale';

function labelForFrequency(freq: number): string {
  return freq >= 1000 ? `${freq / 1000} kHz` : `${freq} Hz`;
}

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

function VerticalSlider({ value, onChange, label }: SliderProps) {
  const [height, setHeight] = useState(0);
  const heightRef = useRef(0);

  const fraction = (value - EQ_MIN) / (EQ_MAX - EQ_MIN);
  const markerBottom = clamp(fraction * height, 6, Math.max(6, height - 6));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const h = heightRef.current;
        if (h <= 0) return;
        const f = clamp(1 - evt.nativeEvent.locationY / h, 0, 1);
        onChange(EQ_MIN + f * (EQ_MAX - EQ_MIN));
      },
      onPanResponderMove: (evt) => {
        const h = heightRef.current;
        if (h <= 0) return;
        const f = clamp(1 - evt.nativeEvent.locationY / h, 0, 1);
        onChange(EQ_MIN + f * (EQ_MAX - EQ_MIN));
      },
    }),
  ).current;

  return (
    <View style={styles.sliderCol}>
      <Text style={[styles.sliderValue, value > 0 && styles.sliderValuePos, value < 0 && styles.sliderValueNeg]}>
        {value > 0 ? `+${Math.round(value)}` : Math.round(value)}
      </Text>
      <View
        style={styles.sliderTrack}
        onLayout={(e) => {
          heightRef.current = e.nativeEvent.layout.height;
          setHeight(e.nativeEvent.layout.height);
        }}
        {...panResponder.panHandlers}
      >
        <View style={styles.sliderZero} />
        <LinearGradient
          colors={[gradients.primary[0], gradients.play[1]] as const}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={[styles.sliderFill, { height: Math.max(0, fraction * (height || 1)) }]}
        />
        <View style={[styles.sliderMarker, { bottom: markerBottom }]} />
      </View>
      <Text style={styles.sliderLabel}>{label}</Text>
    </View>
  );
}

export function EqualizerSheet() {
  const open = useUiStore((s) => s.equalizerOpen);
  const close = useUiStore((s) => s.closeEqualizer);
  const { enabled, values, preset, setBand, setPreset, toggle, reset } = useEqStore();
  const [nativeOk, setNativeOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void checkNativeAvailability().then((res) => {
      if (alive) setNativeOk(res.available);
    });
    return () => {
      alive = false;
    };
  }, [open]);

  const unsupported = nativeOk === false || (Platform.OS !== 'android' && !isEqualizerAvailable());

  return (
    <BottomSheet visible={open} onClose={close} maxHeight={0.72}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.eqIcon}>
            <Ionicons name="options" size={16} color={colors.secondary} />
          </View>
          <View>
            <Text style={styles.title}>Ecualizador</Text>
            <Text style={styles.subtitle}>Ajusta el sonido a tu gusto</Text>
          </View>
        </View>
        <PressableScale onPress={close} haptic style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </PressableScale>
      </View>

      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>Ecualizador</Text>
          <Text style={styles.toggleHint}>{enabled ? 'Activado' : 'Desactivado'}</Text>
        </View>
        <PressableScale onPress={toggle} haptic style={[styles.switch, enabled && styles.switchOn]} scaleTo={0.92}>
          <View style={[styles.switchThumb, enabled && styles.switchThumbOn]} />
        </PressableScale>
      </View>

      {unsupported ? (
        <View style={styles.notice}>
          <Ionicons name="phone-portrait-outline" size={20} color={colors.textMuted} />
          <Text style={styles.noticeText}>
            Tu dispositivo no expone un ecualizador de sistema. La configuración se guardará igualmente para cuando esté disponible.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presets}
            style={styles.presetsScroll}
          >
            {Object.keys(DEFAULT_EQ_PRESETS).map((name) => {
              const active = preset === name;
              return (
                <PressableScale
                  key={name}
                  onPress={() => setPreset(name)}
                  haptic
                  style={[styles.preset, active && styles.presetActive]}
                  scaleTo={0.94}
                >
                  <Text style={[styles.presetText, active && styles.presetTextActive]}>
                    {EQ_PRESET_LABELS[name] ?? name}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>

          <View style={styles.slidersRow}>
            {EQ_BANDS.map((freq, i) => (
              <VerticalSlider
                key={freq}
                label={labelForFrequency(freq)}
                value={values[i] ?? 0}
                onChange={(v) => setBand(i, v)}
              />
            ))}
          </View>

          <PressableScale onPress={reset} haptic style={styles.resetBtn} scaleTo={0.97}>
            <Ionicons name="refresh" size={15} color={colors.text} />
            <Text style={styles.resetText}>Restablecer</Text>
          </PressableScale>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eqIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0,240,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
  },
  title: {
    color: colors.text,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleLabel: {
    color: colors.text,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 14,
  },
  toggleHint: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 11.5,
    marginTop: 1,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 3,
  },
  switchOn: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.textMuted,
  },
  switchThumbOn: {
    backgroundColor: colors.white,
    transform: [{ translateX: 20 }],
  },
  presetsScroll: {
    marginTop: 14,
  },
  presets: {
    paddingHorizontal: 20,
    gap: 8,
  },
  preset: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: touch.comfortable,
  },
  presetActive: {
    backgroundColor: 'rgba(127,0,255,0.22)',
    borderColor: 'rgba(127,0,255,0.6)',
  },
  presetText: {
    color: colors.textMuted,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 12.5,
  },
  presetTextActive: {
    color: colors.white,
  },
  slidersRow: {
    flexDirection: 'row',
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 16,
    gap: 4,
  },
  sliderCol: {
    flex: 1,
    alignItems: 'center',
  },
  sliderValue: {
    color: colors.textMuted,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 11,
    marginBottom: 6,
    minWidth: 30,
    textAlign: 'center',
  },
  sliderValuePos: {
    color: colors.secondary,
  },
  sliderValueNeg: {
    color: colors.accent,
  },
  sliderTrack: {
    width: 34,
    height: 168,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  sliderZero: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  sliderFill: {
    width: '100%',
    borderRadius: 17,
  },
  sliderMarker: {
    position: 'absolute',
    left: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: -11,
    shadowColor: colors.primary,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  sliderLabel: {
    color: colors.textDim,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10,
    marginTop: 8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: touch.comfortable,
  },
  resetText: {
    color: colors.text,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 13,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 12.5,
    lineHeight: 18,
  },
});