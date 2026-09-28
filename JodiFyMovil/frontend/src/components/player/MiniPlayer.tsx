import React, { useRef, useMemo } from 'react';
import { View, Text, Image, StyleProp, ViewStyle, StyleSheet, Animated, PanResponder, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PressableFluid } from '@components/ui/PressableFluid';
import { LinearGradient } from 'expo-linear-gradient';
import { EqualizerBars } from '@components/ui/EqualizerBars';
import { colors, typography, motion, radius } from '@theme';
import { pickCoverUrl, resolveArtist, resolveSongTitle } from '@lib/utils';
import { getSongPalette } from '@lib/palette';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '@stores/player.store';
import { useUiStore } from '@stores/ui.store';
import { useSettingsStore } from '@stores/settings.store';

const MINI_PLAYER_HEIGHT = 68;

interface MiniPlayerProps {
  style?: StyleProp<ViewStyle>;
}

export const MiniPlayer = React.forwardRef<View, MiniPlayerProps>(({ style }, ref) => {
  const insets = useSafeAreaInsets();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const previous = usePlayerStore((s) => s.previous);
  const next = usePlayerStore((s) => s.next);
  const openFullscreen = useUiStore((s) => s.openFullscreen);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  const translateY = useRef(new Animated.Value(0)).current;

  const coverUrl = useMemo(() => (currentSong ? pickCoverUrl(currentSong) : null), [currentSong]);
  const artist = useMemo(() => (currentSong ? resolveArtist(currentSong) : null), [currentSong]);
  const title = useMemo(() => (currentSong ? resolveSongTitle(currentSong) : ''), [currentSong]);
  const palette = useMemo(() => getSongPalette(currentSong), [currentSong]);
  const progressPercent = duration > 0 ? Math.min(Math.max((position / duration) * 100, 0), 100) : 0;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_event, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_event, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_event, gestureState) => {
        if (gestureState.dy < -35 || gestureState.vy < -0.4) {
          openFullscreen();
        }
        Animated.spring(translateY, { toValue: 0, ...motion.springQuick, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, ...motion.springQuick, useNativeDriver: true }).start();
      },
    })
  ).current;

  if (!currentSong) return null;

  return (
    <Animated.View
      ref={ref}
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          bottom: Math.max(insets.bottom, 8) + 76,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      <View style={styles.cardInner}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14, 14, 20, 0.96)', borderRadius: radius.lg }]} />
        )}
        {/* Progress Bar Hairline */}
        <View style={styles.progressContainer}>
          <LinearGradient
            colors={[palette.primary, palette.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>

        <PressableFluid
          onPress={openFullscreen}
          haptic={false}
          style={styles.clickableZone}
          contentStyle={styles.clickableInner}
          testID="mini-player-expand"
        >
          {/* Cover Art with Doppelrand */}
          <View style={styles.coverWrapper}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.coverImg} resizeMode="cover" />
            ) : (
              <LinearGradient colors={[palette.primary, palette.secondary]} style={styles.coverPlaceholder}>
                <Ionicons name="musical-notes" size={20} color={colors.white} />
              </LinearGradient>
            )}
            {isPlaying && (
              <View style={styles.miniEqualizerBadge}>
                <EqualizerBars playing={isPlaying} bars={3} height={10} barWidth={2} color={palette.secondary} />
              </View>
            )}
          </View>

          {/* Song Metadata */}
          <View style={styles.meta}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {artist ?? 'Artista Desconocido'}
            </Text>
          </View>
        </PressableFluid>

        {/* Action Controls */}
        <View style={styles.controls}>
          <PressableFluid
            onPress={previous}
            haptic="light"
            hitSlop={6}
            style={styles.iconBtn}
            testID="mini-prev"
          >
            <Ionicons name="play-skip-back" size={20} color={colors.textMuted} />
          </PressableFluid>

          <PressableFluid
            onPress={togglePlay}
            haptic={hapticsEnabled ? 'medium' : false}
            style={styles.playBtn}
            testID="mini-play-toggle"
          >
            <LinearGradient
              colors={[palette.primary, palette.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.playBtnFill, { shadowColor: palette.primary }]}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={20}
                color={colors.white}
                style={{ marginLeft: isPlaying ? 0 : 2 }}
              />
            </LinearGradient>
          </PressableFluid>

          <PressableFluid
            onPress={next}
            haptic="light"
            hitSlop={6}
            style={styles.iconBtn}
            testID="mini-next"
          >
            <Ionicons name="play-skip-forward" size={20} color={colors.textMuted} />
          </PressableFluid>
        </View>
      </View>
    </Animated.View>
  );
});

MiniPlayer.displayName = 'MiniPlayer';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: MINI_PLAYER_HEIGHT,
    zIndex: 99,
  },
  cardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 28, 0.96)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 14,
    overflow: 'hidden',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  clickableZone: {
    flex: 1,
    minWidth: 0,
  },
  clickableInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    minWidth: 0,
  },
  coverWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: '#101018',
    position: 'relative',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniEqualizerBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 4,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  meta: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  title: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  artist: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
  },
  iconBtn: {
    padding: 6,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnFill: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
});