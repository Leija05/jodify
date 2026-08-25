import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibraryStore } from '../../store/library.store';
import { usePlayerStore } from '../../store/player.store';
import { useSettingsStore } from '../../store/settings.store';
import { useUiStore } from '../../store/ui.store';
import { formatTime, resolveArtist } from '../../lib/utils';
import { colors, typography, gradients, radius, touch, motion, elevation } from '../../theme';
import { PressableFluid } from '../ui/PressableFluid';
import { EqualizerBars } from '../ui/EqualizerBars';
import { CoverArt } from './SongRow';

const EXPAND_THRESHOLD = 80;
const DISMISS_THRESHOLD = 120;
const CUBIC_EASING = Easing.bezier(0.23, 1, 0.32, 1);

export function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const openFullscreen = useUiStore((s) => s.openFullscreen);
  const openEqualizer = useUiStore((s) => s.openEqualizer);
  const likedIds = useLibraryStore((s) => s.likedIds);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const user = useSettingsStore((s) => s.user);
  const openAuth = useUiStore((s) => s.openAuth);

  const liked = currentSong ? likedIds.some((id) => String(id) === String(currentSong.id)) : false;

  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const coverScale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const coverOpacity = useRef(new Animated.Value(1)).current;
  const blurOpacity = useRef(new Animated.Value(0)).current;
  const chevronPulse = useRef(new Animated.Value(1)).current;
  const panResponderRef = useRef<ReturnType<typeof PanResponder.create> | null>(null);
  const isExpandingRef = useRef(false);
  const isDismissingRef = useRef(false);
  const expandHapticFiredRef = useRef(false);

  const handleLike = useCallback(async () => {
    if (!currentSong) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!user) {
      openAuth();
      return;
    }
    await toggleLike(currentSong);
  }, [currentSong, user, toggleLike, openAuth]);

  const springBack = useCallback(() => {
    if (isExpandingRef.current || isDismissingRef.current) return;
    expandHapticFiredRef.current = false;
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(opacity, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(coverScale, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(coverOpacity, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(glowOpacity, { toValue: isPlaying ? 1 : 0, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(blurOpacity, { toValue: 0, ...motion.springDefault, useNativeDriver: true }),
    ]).start();
  }, [translateY, scale, opacity, coverScale, coverOpacity, glowOpacity, blurOpacity, isPlaying]);

  const expand = useCallback(() => {
    isExpandingRef.current = true;
    Animated.parallel([
      Animated.timing(translateY, { toValue: -EXPAND_THRESHOLD, duration: 250, useNativeDriver: true, easing: CUBIC_EASING }),
      Animated.spring(scale, { toValue: 0.9, ...motion.springDefault, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true, easing: CUBIC_EASING }),
      Animated.spring(coverScale, { toValue: 1.08, ...motion.springDefault, useNativeDriver: true }),
      Animated.timing(coverOpacity, { toValue: 0, duration: 180, useNativeDriver: true, easing: CUBIC_EASING }),
      Animated.timing(blurOpacity, { toValue: 0.5, duration: 200, useNativeDriver: true, easing: CUBIC_EASING }),
    ]).start(() => {
      openFullscreen();
      translateY.setValue(0);
      scale.setValue(1);
      opacity.setValue(1);
      coverScale.setValue(1);
      coverOpacity.setValue(1);
      blurOpacity.setValue(0);
      isExpandingRef.current = false;
      expandHapticFiredRef.current = false;
    });
  }, [translateY, scale, opacity, coverScale, coverOpacity, blurOpacity, openFullscreen]);

  const dismiss = useCallback(() => {
    isDismissingRef.current = true;
    Animated.parallel([
      Animated.spring(translateY, { toValue: 180, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 0.8, ...motion.springDefault, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true, easing: CUBIC_EASING }),
      Animated.spring(coverScale, { toValue: 0.85, ...motion.springDefault, useNativeDriver: true }),
      Animated.timing(coverOpacity, { toValue: 0, duration: 180, useNativeDriver: true, easing: CUBIC_EASING }),
      Animated.timing(blurOpacity, { toValue: 0, duration: 150, useNativeDriver: true, easing: CUBIC_EASING }),
    ]).start(() => {
      isDismissingRef.current = false;
      translateY.setValue(0);
      scale.setValue(1);
      opacity.setValue(1);
      coverScale.setValue(1);
      coverOpacity.setValue(1);
      blurOpacity.setValue(0);
    });
  }, [translateY, scale, opacity, coverScale, coverOpacity, blurOpacity]);

  useEffect(() => {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gestureState) => Math.abs(gestureState.dy) > 3,
      onPanResponderGrant: () => {
        translateY.extractOffset();
        isExpandingRef.current = false;
        isDismissingRef.current = false;
      },
      onPanResponderMove: (_event, gestureState) => {
        const dy = gestureState.dy;
        const progress = Math.abs(dy) / EXPAND_THRESHOLD;
        
        if (dy < 0) {
          const clampedDy = Math.max(dy, -240);
          translateY.setValue(clampedDy);
          const p = Math.min(progress, 1);
          scale.setValue(1 - p * 0.1);
          opacity.setValue(1 - p * 0.8);
          coverScale.setValue(1 + p * 0.15);
          coverOpacity.setValue(1 - p * 0.3);
          glowOpacity.setValue(p * 0.6);
          blurOpacity.setValue(p * 0.4);
          if (progress >= 1 && !expandHapticFiredRef.current) {
            expandHapticFiredRef.current = true;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        } else {
          expandHapticFiredRef.current = false;
          const clampedDy = Math.min(dy, 140);
          translateY.setValue(clampedDy);
          const p = Math.min(dy / DISMISS_THRESHOLD, 1);
          scale.setValue(1 - p * 0.15);
          opacity.setValue(1 - p * 0.8);
          coverScale.setValue(1 - p * 0.1);
          coverOpacity.setValue(1 - p * 0.3);
          glowOpacity.setValue(0);
          blurOpacity.setValue(0);
        }
      },
      onPanResponderRelease: (_event, gestureState) => {
        translateY.flattenOffset();
        const { dy, vy } = gestureState;

        if (dy < -EXPAND_THRESHOLD || (dy < -40 && vy < -0.5)) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          expand();
        } else if (dy > DISMISS_THRESHOLD || (dy > 50 && vy > 0.5)) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          dismiss();
        } else {
          springBack();
        }
      },
      onPanResponderTerminate: springBack,
    });
  }, [translateY, scale, opacity, coverScale, coverOpacity, glowOpacity, expand, dismiss, springBack]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(chevronPulse, { toValue: -4, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(chevronPulse, { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [chevronPulse]);

  useEffect(() => {
    if (duration > 0) {
      Animated.timing(progressAnim, {
        toValue: Math.min(1, position / duration),
        duration: 800,
        useNativeDriver: false,
        easing: Easing.linear,
      }).start();
    } else {
      progressAnim.setValue(0);
    }
  }, [position, duration, progressAnim]);

  useEffect(() => {
    Animated.spring(glowOpacity, { toValue: isPlaying ? 1 : 0, ...motion.springDefault, useNativeDriver: true }).start();
  }, [isPlaying, glowOpacity]);

  if (!currentSong) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        { bottom: insets.bottom + 66 },
        { transform: [{ translateY }, { scale }], opacity },
      ]}
      {...panResponderRef.current?.panHandlers}
    >
      <LinearGradient colors={gradients.surface} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: blurOpacity, backgroundColor: 'rgba(5,5,7,0.45)', pointerEvents: 'none' }]} />
      <View style={styles.glowRing} />
      <Animated.View style={[styles.glowOverlay, { opacity: glowOpacity }]} />

      <PressableFluid onPress={openFullscreen} style={styles.main} scaleTo={0.99}>
        <View style={styles.coverWrap}>
          <Animated.View style={[
            styles.coverGlow,
            { opacity: glowOpacity, transform: [{ scale: coverScale }] }
          ]} />
          <Animated.View style={[styles.coverInner, { transform: [{ scale: coverScale }], opacity: coverOpacity }]}>
            <CoverArt song={currentSong} size={56} radiusSize={14} />
          </Animated.View>
        </View>

        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {currentSong.name}
            </Text>
            {isPlaying && (
              <View style={styles.waveWrap}>
                <EqualizerBars playing bars={3} height={14} barWidth={3} color={colors.secondary} />
              </View>
            )}
          </View>
          <Text style={styles.artist} numberOfLines={1}>
            {resolveArtist(currentSong) ?? 'Desconocido'}
          </Text>
        </View>

        <View style={styles.times}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeDivider}>·</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </PressableFluid>

      <PressableFluid scaleTo={0.97} style={styles.controls}>
        <PressableFluid onPress={openEqualizer} haptic="light" style={styles.controlBtn}>
          <Ionicons name="options-outline" size={18} color={colors.secondary} />
        </PressableFluid>
        <PressableFluid onPress={handleLike} haptic="light" style={styles.controlBtn}>
          <Animated.View style={{ transform: [{ scale: glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={19} color={liked ? colors.accent : colors.textMuted} />
          </Animated.View>
        </PressableFluid>
        <PressableFluid onPress={previous} haptic="light" style={styles.controlBtn}>
          <Ionicons name="play-skip-back" size={22} color={colors.text} />
        </PressableFluid>
        <PressableFluid onPress={togglePlay} haptic="medium" style={styles.controlBtn}>
          <View style={styles.playChip}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color={colors.white} />
          </View>
        </PressableFluid>
        <PressableFluid onPress={next} haptic="light" style={styles.controlBtn}>
          <Ionicons name="play-skip-forward" size={22} color={colors.text} />
        </PressableFluid>
      </PressableFluid>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        >
          <LinearGradient
            colors={[gradients.primary[0], gradients.play[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      <Animated.View style={[
        styles.swipeHint,
        { opacity: translateY.interpolate({ inputRange: [-20, 0, 20], outputRange: [0, 1, 0], extrapolate: 'clamp' }), transform: [{ translateY: chevronPulse }] }
      ]}>
        <Ionicons name="chevron-up" size={16} color={colors.textMuted} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...elevation.level4,
    borderWidth: 1,
    borderColor: 'rgba(127,0,255,0.25)',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 14,
  },
  coverWrap: {
    position: 'relative',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(127,0,255,0.4)',
    padding: 1,
  },
  coverInner: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  coverGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    color: colors.text,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    lineHeight: typography.bodyMedium.lineHeight,
    flexShrink: 1,
  },
  waveWrap: {
    height: 14,
  },
  artist: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    lineHeight: typography.bodySmall.lineHeight,
    marginTop: 1,
  },
  times: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 10,
  },
  timeText: {
    color: colors.textMuted,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
  },
  timeDivider: {
    color: 'rgba(255,255,255,0.18)',
    fontSize: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  controlBtn: {
    padding: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: touch.comfortable,
    minHeight: touch.comfortable,
  },
  playChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  swipeHint: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 2,
  },
  glowRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(127,0,255,0.3)',
    pointerEvents: 'none',
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(127,0,255,0.15)',
    pointerEvents: 'none',
  },
});