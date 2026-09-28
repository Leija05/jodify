import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Animated, Dimensions, Easing, Modal, ScrollView, StyleSheet, Text, View, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LyricsLine } from '@lib/types';
import { fetchLyrics, lyricsFromSong } from '@services/lyrics.service';
import { downloadSong, deleteDownloadedSong } from '@services/downloads.service';
import { useLibraryStore } from '@stores/library.store';
import { usePlayerStore } from '@stores/player.store';
import { useSettingsStore } from '@stores/settings.store';
import { useUiStore } from '@stores/ui.store';
import { useJamStore } from '@stores/jam.store';
import { colors, typography, motion } from '@theme';
import { DynamicBackground } from '@components/player/DynamicBackground';
import { FullscreenHeader } from './fullscreen/FullscreenHeader';
import { ShowcaseHero } from './fullscreen/ShowcaseHero';
import { SongInfo } from './fullscreen/SongInfo';
import { TimelineZone } from './fullscreen/TimelineZone';
import { ControlsRow } from './fullscreen/ControlsRow';
import { UtilityRow } from './fullscreen/UtilityRow';
import { LyricsZone } from './fullscreen/LyricsZone';
import { QueueSheet } from './fullscreen/QueueSheet';

const SCREEN = Dimensions.get('window');
const DISMISS_THRESHOLD = 130;
const CUBIC_EASING = Easing.bezier(0.23, 1, 0.32, 1);

export default function FullscreenPlayer() {
  const open = useUiStore((s) => s.fullscreenOpen);
  const closeFullscreen = useUiStore((s) => s.closeFullscreen);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const error = usePlayerStore((s) => s.error);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seek = usePlayerStore((s) => s.seek);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
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
  const jamActive = useJamStore((s) => s.active);
  const insets = useSafeAreaInsets();

  const [displayMode, setDisplayMode] = useState<'cover' | 'vinyl'>('cover');
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<LyricsLine[] | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const liked = !!currentSong && likedIds.some((id) => String(id) === String(currentSong.id));
  const downloaded = !!currentSong && downloadedIds.some((id) => String(id) === String(currentSong.id));
  const openLyricsModal = useUiStore((s) => s.openLyricsModal);

  const translateY = useRef(new Animated.Value(SCREEN.height)).current;
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
    backgroundOpacity.setValue(1);
    coverScale.setValue(0.92);
    vinylScale.setValue(0.92);
    titleOpacity.setValue(1);
    controlsOpacity.setValue(1);
    topBarOpacity.setValue(1);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(coverScale, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(vinylScale, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
    ]).start();
  }, [translateY, coverScale, vinylScale]);

  const animateOut = useCallback(() => {
    if (isAnimatingOutRef.current) return;
    isAnimatingOutRef.current = true;
    Animated.parallel([
      Animated.timing(translateY, { toValue: SCREEN.height, duration: 220, easing: CUBIC_EASING, useNativeDriver: true }),
      Animated.timing(coverScale, { toValue: 0.9, duration: 180, useNativeDriver: true }),
      Animated.timing(vinylScale, { toValue: 0.9, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      closeFullscreen();
      translateY.setValue(SCREEN.height);
      isAnimatingOutRef.current = false;
    });
  }, [translateY, coverScale, vinylScale, closeFullscreen]);

  useEffect(() => {
    if (open) {
      animateIn();
    }
  }, [open, animateIn]);

  const springBack = useCallback(() => {
    if (isAnimatingOutRef.current) return;
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(coverScale, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(vinylScale, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
    ]).start();
  }, [translateY, coverScale, vinylScale]);

  const dismiss = useCallback(() => {
    animateOut();
  }, [animateOut]);

  useEffect(() => {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_event, gestureState) => gestureState.dy > 20 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2.2,
      onPanResponderGrant: () => {
        translateY.extractOffset();
        isAnimatingOutRef.current = false;
      },
      onPanResponderMove: (_event, gestureState) => {
        const dy = gestureState.dy;
        if (dy > 0) {
          const clampedDy = Math.min(dy, SCREEN.height * 0.7);
          translateY.setValue(clampedDy);
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
  }, [translateY, coverScale, vinylScale, dismiss, springBack]);

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

  const handleStartRadio = useCallback(() => {
    if (!currentSong) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const allSongs = useLibraryStore.getState().songs;
    const radio = [currentSong, ...allSongs.filter((s) => String(s.id) !== String(currentSong.id)).slice(0, 30)];
    usePlayerStore.getState().playQueue(radio, 0);
  }, [currentSong]);

  const handleOpenJam = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useUiStore.getState().setTab('community');
    closeFullscreen();
  }, [closeFullscreen]);

  const sleepRemaining = sleepTimer.endAt ? Math.max(0, sleepTimer.endAt - Date.now()) : 0;

  if (!open) return null;

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateY }] },
        ]}
        {...panResponderRef.current?.panHandlers}
      >
        <DynamicBackground song={currentSong} />

        <FullscreenHeader
          opacity={topBarOpacity}
          onDismiss={dismiss}
          onQueuePress={() => setQueueOpen(true)}
          displayMode={displayMode}
          onToggleDisplayMode={() => setDisplayMode((m) => (m === 'cover' ? 'vinyl' : 'cover'))}
          insets={insets}
        />

        {currentSong ? (
          <ScrollView
            contentContainerStyle={[
              styles.playerScroll,
              { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 28 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <ShowcaseHero
              song={currentSong}
              coverScale={coverScale}
              vinylScale={vinylScale}
              isPlaying={isPlaying}
              displayMode={displayMode}
              onToggleMode={() => setDisplayMode((m) => (m === 'cover' ? 'vinyl' : 'cover'))}
            />

            <SongInfo
              song={currentSong}
              titleOpacity={titleOpacity}
              isBuffering={isBuffering}
              sleepRemaining={sleepRemaining}
              cancelSleepTimer={cancelSleepTimer}
              error={error}
              liked={liked}
              onLike={handleLike}
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
              downloaded={downloaded}
              downloading={downloading}
              onDownload={handleDownload}
              onEqualizer={openEqualizer}
              onLyricsToggle={() => setShowLyrics((v) => !v)}
              showLyrics={showLyrics}
              onLyricsFullscreen={openLyricsModal}
              hasLyrics={!!lyrics && lyrics.length > 0}
              onStartRadio={handleStartRadio}
              onOpenJam={handleOpenJam}
              jamActive={jamActive}
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

export { FullscreenPlayer };