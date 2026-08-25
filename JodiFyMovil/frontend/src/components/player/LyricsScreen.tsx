import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, PanResponder, StyleSheet, Text, View } from 'react-native';
import type { LyricsLine, Song } from '../../lib/types';
import { formatTime, pickCoverUrl } from '../../lib/utils';
import { fetchLyrics, lyricsFromSong } from '../../services/lyrics.service';
import { usePlayerStore } from '../../store/player.store';
import { useUiStore } from '../../store/ui.store';
import { colors, typography, radius } from '../../theme';
import { KaraokeLyrics } from '../lyrics/KaraokeLyrics';
import { PressableScale } from '../ui/PressableScale';
import { EqualizerBars } from '../ui/EqualizerBars';
import { DynamicBackground } from './DynamicBackground';

const VINYL_SIZE = 200;

type LyricsMode = 'neon' | 'minimal' | 'vinyl' | 'gradient';

function hashFromString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function deriveMode(song: Song): LyricsMode {
  const h = hashFromString(`${song.id}-${song.name}`);
  const modes: readonly LyricsMode[] = ['neon', 'minimal', 'vinyl', 'gradient'];
  return modes[h % modes.length] ?? 'neon';
}

function derivePalette(song: Song): { primary: string; secondary: string; accent: string } {
  const h = hashFromString(`${song.id}-${song.artist ?? ''}`);
  const palettes = [
    { primary: '#7f00ff', secondary: '#00f0ff', accent: '#ff0080' },
    { primary: '#00ff88', secondary: '#00f0ff', accent: '#7f00ff' },
    { primary: '#ff0080', secondary: '#ff8c00', accent: '#00f0ff' },
    { primary: '#ff8c00', secondary: '#ffb800', accent: '#ff0080' },
    { primary: '#00f0ff', secondary: '#7f00ff', accent: '#ff8c00' },
    { primary: '#ff0080', secondary: '#7f00ff', accent: '#00ff88' },
  ];
  const fallback = palettes[0];
  return palettes[h % palettes.length] ?? {
    primary: fallback?.primary ?? '#7f00ff',
    secondary: fallback?.secondary ?? '#00f0ff',
    accent: fallback?.accent ?? '#ff0080',
  };
}

function deriveRotation(song: Song): number {
  return (hashFromString(`${song.id}-rotation`) % 6) * 60;
}

const SPRING_CONFIG = { damping: 16, stiffness: 280, useNativeDriver: true };

export function LyricsScreen() {
  const open = useUiStore((s) => s.lyricsModalOpen);
  const closeLyricsModal = useUiStore((s) => s.closeLyricsModal);
  const { currentSong, isPlaying, position, duration, togglePlay, next, previous, seek } = usePlayerStore();
  const [lyrics, setLyrics] = useState<LyricsLine[] | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  const mode = useMemo(() => currentSong ? deriveMode(currentSong) : 'neon', [currentSong?.id]);
  const palette = useMemo(() => currentSong ? derivePalette(currentSong) : { primary: colors.primary, secondary: colors.secondary, accent: colors.accent }, [currentSong?.id]);
  const rotation = useMemo(() => currentSong ? deriveRotation(currentSong) : 0, [currentSong?.id]);
  const synced = useMemo(() => (lyrics ? lyrics.length > 0 && lyrics.every((l) => l.time >= 0) : false), [lyrics]);

  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.8) {
          handleClose();
        } else {
          Animated.spring(panY, { toValue: 0, damping: 16, stiffness: 280, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (!open) return;
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.95);
    Animated.parallel([
      Animated.spring(fadeAnim, { toValue: 1, ...SPRING_CONFIG }),
      Animated.spring(slideAnim, { toValue: 0, ...SPRING_CONFIG }),
      Animated.spring(scaleAnim, { toValue: 1, ...SPRING_CONFIG }),
    ]).start();
  }, [open, fadeAnim, slideAnim, scaleAnim]);

  useEffect(() => {
    setLyrics(null);
    if (!currentSong) return;
    const fromSong = lyricsFromSong(currentSong.lyrics);
    if (fromSong) {
      setLyrics(fromSong);
      return;
    }
    setLyricsLoading(true);
    fetchLyrics(currentSong.name, currentSong.artist).then((lines) => {
      setLyrics(lines);
      setLyricsLoading(false);
    });
  }, [currentSong?.id]);

  const handleClose = () => {
    Animated.parallel([
      Animated.spring(fadeAnim, { toValue: 0, ...SPRING_CONFIG }),
      Animated.spring(slideAnim, { toValue: 50, ...SPRING_CONFIG }),
      Animated.spring(scaleAnim, { toValue: 0.95, ...SPRING_CONFIG }),
    ]).start(() => closeLyricsModal());
  };

  const renderBackground = () => {
    if (!currentSong) return null;

    switch (mode) {
      case 'vinyl':
        return (
          <View style={styles.vinylBg}>
            <Image
              source={{ uri: pickCoverUrl(currentSong) ?? undefined }}
              style={styles.vinylCover}
              resizeMode="cover"
              blurRadius={50}
            />
            <View style={[styles.vinylOverlay, { backgroundColor: palette.primary }]} />
            <View style={[styles.vinylRotation, { transform: [{ rotate: `${rotation}deg` }] }]}>
              {[0.28, 0.42, 0.56, 0.7].map((r, i) => (
                <View
                  key={i}
                  style={[
                    styles.vinylGroove,
                    {
                      width: VINYL_SIZE * r,
                      height: VINYL_SIZE * r,
                      borderRadius: (VINYL_SIZE * r) / 2,
                      borderColor: `${palette.secondary}30`,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        );
      case 'gradient':
        return (
          <LinearGradient
            colors={[palette.primary, palette.secondary, palette.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        );
      case 'minimal':
        return (
          <View style={[styles.minimalBg, { backgroundColor: palette.primary }]}>
            {currentSong ? (
              <Image
                source={{ uri: pickCoverUrl(currentSong) ?? undefined }}
                style={styles.minimalCover}
                resizeMode="cover"
              />
            ) : null}
            <View style={[styles.minimalOverlay, { backgroundColor: palette.secondary }]} />
          </View>
        );
      case 'neon':
      default:
        return (
          <>
            <DynamicBackground song={currentSong} intensity={0.92} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `${palette.primary}10` }] } />
          </>
        );
    }
  };

  if (!open) return null;

  return (
    <Modal visible={open} animationType="none" presentationStyle="fullScreen" onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.screenContainer,
          { opacity: fadeAnim, transform: [{ translateY: Animated.add(slideAnim, panY) }, { scale: scaleAnim }] }
        ]}
      >
        {renderBackground()}

        <View style={styles.topBar}>
          <PressableScale onPress={handleClose} haptic style={styles.topBtn}>
            <Ionicons name="chevron-down" size={26} color={colors.text} />
          </PressableScale>
          <Text style={styles.topLabel}>Letra</Text>
          <View style={styles.topSpacer} />
        </View>

        {currentSong && (
          <>
            <View style={styles.songHeader}>
              {mode === 'minimal' && (
                <View style={[styles.minimalBadge, { backgroundColor: `${palette.accent}20`, borderColor: `${palette.accent}60` }]}>
                  <Text style={[styles.minimalBadgeText, { color: palette.accent }]}>{mode.toUpperCase()}</Text>
                </View>
              )}
              <Text style={[styles.songTitle, { color: colors.white, textShadowColor: 'rgba(0,0,0,0.6)' }]} numberOfLines={2}>
                {currentSong.name}
              </Text>
              <Text style={[styles.songArtist, { color: palette.secondary }]} numberOfLines={1}>
                {currentSong.artist ?? 'Desconocido'}
              </Text>
            </View>

            <View style={styles.lyricsContainer}>
              {lyricsLoading ? (
                <View style={styles.lyricsLoading}>
                  <EqualizerBars playing bars={5} height={20} barWidth={3} color={palette.secondary} />
                  <Text style={styles.lyricsLoadingText}>Buscando letras…</Text>
                </View>
              ) : lyrics && lyrics.length > 0 ? (
                <KaraokeLyrics
                  lines={lyrics}
                  currentTime={position}
                  synced={synced}
                  onSeek={seek}
                />
              ) : (
                <View style={styles.lyricsEmpty}>
                  <Ionicons name="document-text-outline" size={30} color={colors.textMuted} />
                  <Text style={styles.lyricsEmptyText}>No se encontraron letras para esta canción</Text>
                </View>
              )}
            </View>

            <View style={styles.controlsContainer}>
              <View style={styles.progressBar}>
                <View style={styles.progressTrack}>
                  <LinearGradient
                    colors={[palette.primary, palette.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }]}
                  />
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatTime(position)}</Text>
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
              </View>

              <View style={styles.controlsRow}>
                <PressableScale onPress={previous} haptic style={styles.controlBtn}>
                  <Ionicons name="play-skip-back" size={28} color={colors.text} />
                </PressableScale>
                <PressableScale onPress={togglePlay} haptic style={styles.playBtn}>
                  <LinearGradient
                    colors={[palette.primary, palette.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.playBtnInner}
                  >
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={colors.white} />
                  </LinearGradient>
                </PressableScale>
                <PressableScale onPress={next} haptic style={styles.controlBtn}>
                  <Ionicons name="play-skip-forward" size={28} color={colors.text} />
                </PressableScale>
              </View>
            </View>
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  vinylBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylCover: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  vinylOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  vinylRotation: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylGroove: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  minimalBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalCover: {
    width: '100%',
    height: '100%',
    opacity: 0.15,
  },
  minimalOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  minimalBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginBottom: 16,
  },
  minimalBadgeText: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 8,
    gap: 12,
  },
  topBtn: {
    padding: 6,
  },
  topLabel: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13,
    textAlign: 'center',
  },
  topSpacer: {
    width: 36,
  },
  songHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
  },
  songTitle: {
    fontFamily: typography.displaySmall.fontFamily,
    fontSize: 24,
    letterSpacing: -0.6,
    lineHeight: 30,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  songArtist: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 14,
    marginTop: 4,
  },
  lyricsContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  lyricsLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  lyricsLoadingText: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 13,
  },
  lyricsEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  lyricsEmptyText: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  controlsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    gap: 18,
  },
  progressBar: {
    gap: 6,
  },
  progressTrack: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: colors.textDim,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 11,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
  },
  controlBtn: {
    padding: 8,
  },
  playBtn: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  playBtnInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});