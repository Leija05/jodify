import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Animated, Dimensions, Easing, Modal, ScrollView, StyleSheet, Text, View, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LyricsLine } from '../../lib/types';
import { fetchLyrics, lyricsFromSong } from '../../services/lyrics.service';
import { downloadSong, deleteDownloadedSong } from '../../services/downloads.service';
import { useLibraryStore } from '../../store/library.store';
import { usePlayerStore } from '../../store/player.store';
import { useSettingsStore } from '../../store/settings.store';
import { useUiStore } from '../../store/ui.store';
import { colors, typography, motion } from '../../theme';
import { DynamicBackground } from './DynamicBackground';
import { FullscreenHeader } from './fullscreen/FullscreenHeader';
import { VinylZone } from './fullscreen/VinylZone';
import { SongInfo } from './fullscreen/SongInfo';
import { TimelineZone } from './fullscreen/TimelineZone';
import { ControlsRow } from './fullscreen/ControlsRow';
import { UtilityRow } from './fullscreen/UtilityRow';
import { LyricsZone } from './fullscreen/LyricsZone';
import { QueueSheet } from './fullscreen/QueueSheet';

const SCREEN = Dimensions.get('window');
const VINYL_SIZE = Math.min(260, Math.max(200, SCREEN.width * 0.62));
const DISMISS_THRESHOLD = 130;
const CUBIC_EASING = Easing.bezier(0.23, 1, 0.32, 1);

export function FullscreenPlayer() {
  const open = useUiStore((s) => s.fullscreenOpen);
  const closeFullscreen = useUiStore((s) => s.closeFullscreen);
  const { currentSong, isPlaying, position, duration, shuffle, repeat, isBuffering, error } = usePlayerStore();
  const { togglePlay, next, previous, seek, toggleShuffle, cycleRepeat } = usePlayerStore();
  const likedIds = useLibraryStore((s) => s.likedIds);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const markDownloaded = useLibraryStore((s) => s.markDownloaded);
  const unmarkDownloaded = useLibraryStore((s) => s.unmarkDownloaded);
  const user = useSettingsStore((s) => s.user);
  const sleepTimer = useSettingsStore((s) => s.sleepTimer);
  const cancelSleepTimer = useSettingsStore((s) => s.cancelSleepTimer);
  const openAuth = useUiStore((s) => s.openAuth);
  const openEqualizer = useUiStore((s) => s.openEqualizer);
  const insets = useSafeAreaInsets();

  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<LyricsLine[] | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const liked = !!currentSong && likedIds.some((id) => String(id) === String(currentSong.id));
  const downloaded = !!currentSong && downloadedIds.some((id) => String(id) === String(currentSong.id));
  const openLyricsModal = useUiStore((s) => s.openLyricsModal);

  const translateY = useRef(new Animated.Value(SCREEN.height)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const coverScale = useRef(new Animated.Value(0.85)).current;
  const vinylScale = useRef(new Animated.Value(0.9)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const controlsOpacity = useRef(new Animated.Value(0)).current;
  const topBarOpacity = useRef(new Animated.Value(0)).current;
  const panResponderRef = useRef<ReturnType<typeof PanResponder.create> | null>(null);
  const isAnimatingOutRef = useRef(false);

  useEffect(() => {
    setLyrics(null);
    setShowLyrics(false);
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

  const synced = useMemo(() => (lyrics ? lyrics.length > 0 && lyrics.every((l) => l.time >= 0) : false), [lyrics]);

  const animateIn = useCallback(() => {
    isAnimatingOutRef.current = false;
    translateY.setValue(SCREEN.height);
    opacity.setValue(0);
    backgroundOpacity.setValue(0);
    coverScale.setValue(0.85);
    vinylScale.setValue(0.9);
    titleOpacity.setValue(0);
    controlsOpacity.setValue(0);
    topBarOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(opacity, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(backgroundOpacity, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(coverScale, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(vinylScale, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.delay(120),
      Animated.spring(titleOpacity, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(controlsOpacity, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(topBarOpacity, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
    ]).start();
  }, [translateY, opacity, backgroundOpacity, coverScale, vinylScale, titleOpacity, controlsOpacity, topBarOpacity]);

  const animateOut = useCallback(() => {
    if (isAnimatingOutRef.current) return;
    isAnimatingOutRef.current = true;
    Animated.parallel([
      Animated.spring(translateY, { toValue: SCREEN.height, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(opacity, { toValue: 0, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(backgroundOpacity, { toValue: 0, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(coverScale, { toValue: 0.85, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(vinylScale, { toValue: 0.9, ...motion.springDefault, useNativeDriver: true }),
      Animated.timing(titleOpacity, { toValue: 0, duration: 120, useNativeDriver: true, easing: CUBIC_EASING }),
      Animated.timing(controlsOpacity, { toValue: 0, duration: 120, useNativeDriver: true, easing: CUBIC_EASING }),
      Animated.timing(topBarOpacity, { toValue: 0, duration: 120, useNativeDriver: true, easing: CUBIC_EASING }),
    ]).start(() => {
      closeFullscreen();
      translateY.setValue(SCREEN.height);
      opacity.setValue(0);
      backgroundOpacity.setValue(0);
      coverScale.setValue(0.85);
      vinylScale.setValue(0.9);
      titleOpacity.setValue(0);
      controlsOpacity.setValue(0);
      topBarOpacity.setValue(0);
      isAnimatingOutRef.current = false;
    });
  }, [translateY, opacity, backgroundOpacity, coverScale, vinylScale, titleOpacity, controlsOpacity, topBarOpacity, closeFullscreen]);

  useEffect(() => {
    if (open) {
      animateIn();
    }
  }, [open, animateIn]);

  const springBack = useCallback(() => {
    if (isAnimatingOutRef.current) return;
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(opacity, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(backgroundOpacity, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(coverScale, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(vinylScale, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
    ]).start();
  }, [translateY, opacity, backgroundOpacity, coverScale, vinylScale]);

  const dismiss = useCallback(() => {
    animateOut();
  }, [animateOut]);

  useEffect(() => {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gestureState) => gestureState.dy > 3,
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
          backgroundOpacity.setValue(1 - easedProgress * 0.85);
          coverScale.setValue(1 - easedProgress * 0.18);
          vinylScale.setValue(1 - easedProgress * 0.15);
          titleOpacity.setValue(1 - easedProgress * 0.9);
          controlsOpacity.setValue(1 - easedProgress * 0.9);
          topBarOpacity.setValue(1 - easedProgress * 0.9);
        }
      },
      onPanResponderRelease: (_event, gestureState) => {
        translateY.flattenOffset();
        const { dy, vy } = gestureState;

        if (dy > DISMISS_THRESHOLD || (dy > 60 && vy > 0.45)) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          dismiss();
        } else {
          springBack();
        }
      },
      onPanResponderTerminate: springBack,
    });
  }, [translateY, opacity, backgroundOpacity, coverScale, vinylScale, titleOpacity, controlsOpacity, topBarOpacity, dismiss, springBack]);

  const handleTogglePlay = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    togglePlay();
  }, [togglePlay]);

  const handleLike = useCallback(async () => {
    if (!currentSong) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!user) {
      openAuth();
      return;
    }
    const ok = await toggleLike(currentSong);
    if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [currentSong, user, toggleLike, openAuth]);

  const handleDownload = useCallback(async () => {
    if (!currentSong) return;
    if (downloaded) {
      await deleteDownloadedSong(currentSong.id);
      unmarkDownloaded(currentSong.id);
      return;
    }
    setDownloading(true);
    try {
      const record = await downloadSong(currentSong);
      markDownloaded(record.id, record.localUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDownloading(false);
    }
  }, [currentSong, downloaded, markDownloaded, unmarkDownloaded]);

  const sleepRemaining = sleepTimer.endAt ? Math.max(0, sleepTimer.endAt - Date.now()) : 0;

  if (!open) return null;

  return (
    <Modal visible={open} animationType="none" presentationStyle="fullScreen" onRequestClose={dismiss} statusBarTranslucent>
      <Animated.View
        style={[
          styles.container,
          { opacity, transform: [{ translateY }] },
        ]}
        {...panResponderRef.current?.panHandlers}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backgroundOpacity }]}>
          <DynamicBackground song={currentSong} />
        </Animated.View>

        <FullscreenHeader
          opacity={topBarOpacity}
          onDismiss={dismiss}
          onQueuePress={() => setQueueOpen(true)}
          insets={insets}
        />

        {currentSong ? (
          <ScrollView contentContainerStyle={[styles.playerScroll, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
            <VinylZone
              song={currentSong}
              vinylScale={vinylScale}
              size={VINYL_SIZE}
              isPlaying={isPlaying}
            />

            <SongInfo
              song={currentSong}
              titleOpacity={titleOpacity}
              coverScale={coverScale}
              isBuffering={isBuffering}
              sleepRemaining={sleepRemaining}
              cancelSleepTimer={cancelSleepTimer}
              error={error}
            />

            <TimelineZone
              controlsOpacity={controlsOpacity}
              position={position}
              duration={duration}
              onSeek={seek}
            />

            <ControlsRow
              controlsOpacity={controlsOpacity}
              isPlaying={isPlaying}
              shuffle={shuffle}
              repeat={repeat}
              onToggleShuffle={toggleShuffle}
              onPrevious={previous}
              onTogglePlay={handleTogglePlay}
              onNext={next}
              onCycleRepeat={cycleRepeat}
            />

            <UtilityRow
              liked={liked}
              downloaded={downloaded}
              downloading={downloading}
              onLike={handleLike}
              onDownload={handleDownload}
              onEqualizer={openEqualizer}
              onLyricsToggle={() => setShowLyrics((v) => !v)}
              showLyrics={showLyrics}
              onLyricsFullscreen={openLyricsModal}
              hasLyrics={!!lyrics && lyrics.length > 0}
            />

            <LyricsZone
              showLyrics={showLyrics}
              lyricsLoading={lyricsLoading}
              lyrics={lyrics}
              synced={synced}
              position={position}
              onSeek={seek}
              onLyricsToggle={() => setShowLyrics((v) => !v)}
            />
          </ScrollView>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>Elige una canción para empezar</Text>
          </View>
        )}
      </Animated.View>

      <QueueSheet open={queueOpen} onClose={() => setQueueOpen(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  playerScroll: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    lineHeight: typography.bodyMedium.lineHeight,
  },
});