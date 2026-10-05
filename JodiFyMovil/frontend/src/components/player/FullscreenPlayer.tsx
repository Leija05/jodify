import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Dimensions, Easing, Modal, ScrollView, StyleSheet, Text, View, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LyricsLine } from '@lib/types';
import { fetchLyrics, lyricsFromSong, getPreloadedLyrics } from '@services/lyrics.service';
import { deleteDownloadedSong } from '@services/downloads.service';
import { useDownloadStore } from '@stores/download.store';
import { useLibraryStore } from '@stores/library.store';
import { usePlayerStore } from '@stores/player.store';
import { useSettingsStore } from '@stores/settings.store';
import { useUiStore } from '@stores/ui.store';
import { useJamStore } from '@stores/jam.store';
import { isSongLiked } from '@lib/utils';
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
  const isDownloadingStore = useDownloadStore((s) => (currentSong ? s.isDownloading(currentSong.id) : false));

  const liked =
    !!currentSong &&
    isSongLiked(currentSong, new Set(likedIds.map(String)));
  const downloaded = !!currentSong && downloadedIds.some((id) => String(id) === String(currentSong.id));
  const openLyricsModal = useUiStore((s) => s.openLyricsModal);

  // Animations
  const translateY = useRef(new Animated.Value(SCREEN.height)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const coverScale = useRef(new Animated.Value(0.92)).current;
  const vinylScale = useRef(new Animated.Value(0.92)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const controlsOpacity = useRef(new Animated.Value(0)).current;
  const topBarOpacity = useRef(new Animated.Value(0)).current;

  const [isSeeking, setIsSeeking] = useState(false);

  const isAnimatingOutRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  // Lyrics loading with cache
  useEffect(() => {
    setShowLyrics(false);
    if (!currentSong) {
      setLyrics(null);
      return;
    }
    const fromSong = lyricsFromSong(currentSong.lyrics) || getPreloadedLyrics(currentSong.name, currentSong.artist);
    if (fromSong) {
      setLyrics(fromSong);
      return;
    }
    setLyrics(null);
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
    translateY.flattenOffset();
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

  const springBack = useCallback(() => {
    if (isAnimatingOutRef.current) return;
    translateY.flattenOffset();
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(coverScale, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
      Animated.spring(vinylScale, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
    ]).start();
  }, [translateY, coverScale, vinylScale]);

  const dismiss = useCallback(() => {
    translateY.flattenOffset();
    animateOut();
  }, [animateOut, translateY]);

  // Animate in when modal opens
  useEffect(() => {
    if (open) {
      animateIn();
    }
  }, [open, animateIn]);

  // Handle Android hardware back press
  useEffect(() => {
    if (!open) return;
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (queueOpen) {
        setQueueOpen(false);
        return true;
      }
      dismiss();
      return true;
    });
    return () => backSub.remove();
  }, [open, queueOpen, dismiss]);

  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  const springBackRef = useRef(springBack);
  springBackRef.current = springBack;

  // PanResponder - Stable creation on mount with offset flattening on terminate
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: () => false,
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_event, gestureState) => {
        // Solo capturar si el gesto empieza en la mitad superior (área de carátula y header)
        // y es un arrastre descendente claro
        if (gestureState.y0 > SCREEN.height * 0.48) return false;
        return gestureState.dy > 18 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2.2;
      },
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
          dismissRef.current();
        } else {
          springBackRef.current();
        }
      },
      onPanResponderTerminate: () => {
        translateY.flattenOffset();
        springBackRef.current();
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

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
    void useDownloadStore.getState().startDownload(currentSong);
  }, [currentSong, downloaded, unmarkDownloaded]);

  const handleStartRadio = useCallback(() => {
    if (!currentSong) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const allSongs = useLibraryStore.getState().songs;
    const radio = [currentSong, ...allSongs.filter((s) => String(s.id) !== String(currentSong.id)).slice(0, 30)];
    usePlayerStore.getState().playQueue(radio, 0);
  }, [currentSong]);

  const handleOpenJam = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useUiStore.getState().openJamModal();
  }, []);

  const modalOpacity = translateY.interpolate({
    inputRange: [0, SCREEN.height * 0.7],
    outputRange: [1, 0.2],
    extrapolate: 'clamp',
  });

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
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.modalRoot}>
        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY }], opacity: modalOpacity },
          ]}
        >
          <DynamicBackground song={currentSong} />

          {currentSong ? (
            <ScrollView
              ref={scrollRef}
              scrollEnabled={!isSeeking}
              contentContainerStyle={[
                styles.playerScroll,
                { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 28 },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View {...panResponder.panHandlers}>
                <ShowcaseHero
                  song={currentSong}
                  coverScale={coverScale}
                  vinylScale={vinylScale}
                  isPlaying={isPlaying}
                  displayMode={displayMode}
                  onToggleMode={() => setDisplayMode((m) => (m === 'cover' ? 'vinyl' : 'cover'))}
                />
              </View>

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
                onSeek={seek}
                onSlidingStart={() => setIsSeeking(true)}
                onSlidingComplete={() => setIsSeeking(false)}
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
                downloading={isDownloadingStore}
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

          {/* Top navigation header rendered with high zIndex so chevron and queue buttons receive taps directly */}
          <FullscreenHeader
            opacity={topBarOpacity}
            onDismiss={dismiss}
            onQueuePress={() => setQueueOpen(true)}
            displayMode={displayMode}
            onToggleDisplayMode={() => setDisplayMode((m) => (m === 'cover' ? 'vinyl' : 'cover'))}
            insets={insets}
          />

          <QueueSheet open={queueOpen} onClose={() => setQueueOpen(false)} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
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