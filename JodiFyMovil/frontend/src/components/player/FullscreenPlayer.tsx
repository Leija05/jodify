import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LyricsLine, Song } from '../../lib/types';
import { formatTime, resolveArtist } from '../../lib/utils';
import { fetchLyrics, lyricsFromSong } from '../../services/lyrics.service';
import { downloadSong, deleteDownloadedSong } from '../../services/downloads.service';
import { useLibraryStore } from '../../store/library.store';
import { usePlayerStore } from '../../store/player.store';
import { useSettingsStore } from '../../store/settings.store';
import { useUiStore } from '../../store/ui.store';
import { colors, fonts, gradients, radius, safeArea } from '../../theme';
import { KaraokeLyrics } from '../lyrics/KaraokeLyrics';
import { PressableScale } from '../ui/PressableScale';
import { EqualizerBars } from '../ui/EqualizerBars';
import { DynamicBackground } from './DynamicBackground';
import { TimelineSlider } from './TimelineSlider';
import { VinylDisc } from './VinylDisc';
import { SongRow } from './SongRow';

const SCREEN = Dimensions.get('window');
const VINYL_SIZE = Math.min(250, Math.max(190, SCREEN.width * 0.62));

function QueueSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { queue, currentSong, isPlaying, playSong, removeFromQueue, clearQueue, error } = usePlayerStore();
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Cola de reproducción</Text>
              <Text style={styles.sheetSubtitle}>
                {queue.length} canción{queue.length === 1 ? '' : 'es'}
              </Text>
            </View>
            <View style={styles.sheetHeaderActions}>
              {queue.length > 0 && (
                <PressableScale
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    clearQueue();
                  }}
                  haptic
                  style={styles.sheetClearBtn}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.error} />
                  <Text style={styles.sheetClearText}>Vaciar</Text>
                </PressableScale>
              )}
              <PressableScale onPress={onClose} haptic style={styles.sheetCloseBtn}>
                <Ionicons name="chevron-down" size={22} color={colors.textMuted} />
              </PressableScale>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={15} color={colors.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <FlatList
            data={queue}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.sheetList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const isCurrent = String(currentSong?.id) === String(item.id);
              return (
                <View style={styles.sheetRow}>
                  <Text style={styles.sheetIndex}>{String(index + 1).padStart(2, '0')}</Text>
                  <View style={styles.sheetRowMain}>
                    <SongRow
                      song={item}
                      isCurrent={isCurrent}
                      isPlaying={isPlaying && isCurrent}
                      onPress={() => playSong(item, queue)}
                      right={
                        isCurrent ? (
                          <PressableScale onPress={togglePlay} haptic>
                            <Ionicons name={isPlaying ? 'pause' : 'play'} size={19} color={colors.secondary} />
                          </PressableScale>
                        ) : undefined
                      }
                    />
                  </View>
                  <PressableScale
                    onPress={() => removeFromQueue(item.id)}
                    haptic
                    style={styles.sheetRemoveBtn}
                  >
                    <Ionicons name="close" size={16} color={colors.textDim} />
                  </PressableScale>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.sheetEmpty}>
                <Ionicons name="list-outline" size={30} color={colors.textDim} />
                <Text style={styles.sheetEmptyText}>La cola está vacía</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

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

  const liked = currentSong ? likedIds.some((id) => String(id) === String(currentSong.id)) : false;
  const downloaded = currentSong ? downloadedIds.some((id) => String(id) === String(currentSong.id)) : false;
  const openLyricsModal = useUiStore((s) => s.openLyricsModal);

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
    void fetchLyrics(currentSong.name, currentSong.artist).then((lines) => {
      setLyrics(lines);
      setLyricsLoading(false);
    });
  }, [currentSong?.id]);

  const synced = useMemo(() => (lyrics ? lyrics.length > 0 && lyrics.every((l) => l.time >= 0) : false), [lyrics]);

  const handleTogglePlay = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    togglePlay();
  }, [togglePlay]);

  const handleLike = useCallback(async () => {
    if (!currentSong) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!user) {
      openAuth();
      return;
    }
    const ok = await toggleLike(currentSong);
    if (ok) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [currentSong, user, toggleLike, openAuth]);

  const handleDownload = useCallback(async () => {
    if (!currentSong) return;
    const id = String(currentSong.id);
    if (downloaded) {
      await deleteDownloadedSong(currentSong.id);
      unmarkDownloaded(currentSong.id);
      return;
    }
    setDownloading(true);
    try {
      const record = await downloadSong(currentSong);
      markDownloaded(record.id, record.localUri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDownloading(false);
    }
  }, [currentSong, downloaded, markDownloaded, unmarkDownloaded]);

  const sleepRemaining = sleepTimer.endAt ? Math.max(0, sleepTimer.endAt - Date.now()) : 0;

  return (
    <Modal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeFullscreen} statusBarTranslucent>
      <View style={styles.container}>
        <DynamicBackground song={currentSong} />

        <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
          <PressableScale onPress={closeFullscreen} haptic style={styles.topBtn}>
            <Ionicons name="chevron-down" size={24} color={colors.text} />
          </PressableScale>
          <Text style={styles.topLabel} numberOfLines={1}>
            {currentSong ? 'Reproduciendo' : 'Reproductor'}
          </Text>
          <PressableScale onPress={() => setQueueOpen(true)} haptic style={styles.topBtn}>
            <Ionicons name="list" size={21} color={colors.text} />
          </PressableScale>
        </View>

        {currentSong ? (
          <ScrollView contentContainerStyle={[styles.playerScroll, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
            <View style={styles.vinylZone}>
              <VinylDisc song={currentSong} size={VINYL_SIZE} playing={isPlaying} />
            </View>

            <View style={styles.songInfo}>
              <Text style={styles.title} numberOfLines={2}>
                {currentSong.name}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {resolveArtist(currentSong) ?? 'Desconocido'}
                {currentSong.album ? ` · ${currentSong.album}` : ''}
              </Text>
              <View style={styles.chips}>
                {isBuffering ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>Cargando…</Text>
                  </View>
                ) : (
                  <EqualizerBars playing={isPlaying} bars={5} height={14} barWidth={2.5} color={colors.secondary} />
                )}
                {sleepRemaining > 0 && (
                  <PressableScale onPress={cancelSleepTimer} haptic style={styles.chip}>
                    <Ionicons name="moon" size={12} color={colors.warning} />
                    <Text style={styles.chipText}>{formatTime(sleepRemaining / 1000)}</Text>
                  </PressableScale>
                )}
                {error ? (
                  <View style={[styles.chip, styles.chipError]}>
                    <Ionicons name="alert-circle" size={12} color={colors.error} />
                    <Text style={[styles.chipText, styles.chipTextError]} numberOfLines={1}>
                      {error}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.timelineZone}>
              <TimelineSlider position={position} duration={duration} onSeek={seek} />
              <View style={styles.timeRow}>
                <Text style={styles.time}>{formatTime(position)}</Text>
                <Text style={styles.time}>{formatTime(duration)}</Text>
              </View>
            </View>

            <View style={styles.controlsRow}>
              <PressableScale onPress={toggleShuffle} haptic style={styles.sideBtn}>
                <Ionicons name="shuffle" size={20} color={shuffle ? colors.secondary : colors.textMuted} />
              </PressableScale>
              <PressableScale onPress={previous} haptic style={styles.sideBtn}>
                <Ionicons name="play-skip-back" size={30} color={colors.text} />
              </PressableScale>
              <PressableScale onPress={handleTogglePlay} haptic style={styles.playBtnWrap}>
                <LinearGradient colors={[gradients.play[0], gradients.play[1]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.playBtn}>
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color={colors.white} />
                </LinearGradient>
              </PressableScale>
              <PressableScale onPress={next} haptic style={styles.sideBtn}>
                <Ionicons name="play-skip-forward" size={30} color={colors.text} />
              </PressableScale>
              <PressableScale onPress={cycleRepeat} haptic style={styles.sideBtn}>
                <Ionicons
                  name={repeat === 'one' ? 'repeat' : 'repeat-outline'}
                  size={20}
                  color={repeat === 'off' ? colors.textMuted : colors.secondary}
                />
                {repeat === 'one' && <Text style={styles.repeatOne}>1</Text>}
              </PressableScale>
            </View>

            <View style={styles.utilityRow}>
              <PressableScale onPress={handleLike} haptic style={styles.utilityBtn}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? colors.accent : colors.textMuted} />
              </PressableScale>
              <PressableScale onPress={() => void handleDownload()} haptic style={styles.utilityBtn}>
                {downloading ? (
                  <EqualizerBars playing bars={3} height={14} barWidth={2.5} color={colors.textMuted} />
                ) : (
                  <Ionicons name={downloaded ? 'cloud-done' : 'cloud-download-outline'} size={22} color={downloaded ? colors.success : colors.textMuted} />
                )}
              </PressableScale>
              <PressableScale onPress={openEqualizer} haptic style={styles.utilityBtn}>
                <Ionicons name="options-outline" size={22} color={colors.secondary} />
              </PressableScale>
              <PressableScale onPress={() => setShowLyrics((v) => !v)} haptic style={styles.utilityBtn}>
                <Ionicons name={showLyrics ? 'mic' : 'mic-outline'} size={22} color={showLyrics ? colors.secondary : colors.textMuted} />
              </PressableScale>
              {lyrics && lyrics.length > 0 && (
                <PressableScale onPress={openLyricsModal} haptic style={styles.utilityBtn}>
                  <Ionicons name="expand-outline" size={20} color={colors.textMuted} />
                </PressableScale>
              )}
            </View>

            <View style={[styles.lyricsZone, showLyrics && styles.lyricsZoneVisible]}>
              {showLyrics ? (
                lyricsLoading ? (
                  <View style={styles.lyricsEmpty}>
                    <EqualizerBars playing bars={5} height={16} color={colors.primary} />
                    <Text style={styles.lyricsEmptyText}>Buscando letras…</Text>
                  </View>
                ) : lyrics && lyrics.length > 0 ? (
                  <KaraokeLyrics lines={lyrics} currentTime={position} synced={synced} onSeek={seek} />
                ) : (
                  <View style={styles.lyricsEmpty}>
                    <Ionicons name="document-text-outline" size={26} color={colors.textMuted} />
                    <Text style={styles.lyricsEmptyText}>No se encontraron letras para esta canción</Text>
                  </View>
                )
              ) : (
                <PressableScale onPress={() => setShowLyrics(true)} haptic style={styles.lyricsHint}>
                  <Ionicons name="mic-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.lyricsHintText}>Letras</Text>
                </PressableScale>
              )}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>Elige una canción para empezar</Text>
          </View>
        )}
      </View>

      <QueueSheet open={queueOpen} onClose={() => setQueueOpen(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 12,
  },
  topBtn: {
    padding: 6,
  },
  topLabel: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    textAlign: 'center',
  },
  playerScroll: {
    flexGrow: 1,
  },
  vinylZone: {
    alignItems: 'center',
    paddingTop: 8,
  },
  songInfo: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 18,
  },
  title: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.6,
    lineHeight: 32,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  artist: {
    color: colors.secondary,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    marginTop: 5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    minHeight: 24,
    maxWidth: '90%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,184,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.35)',
  },
  chipError: {
    backgroundColor: 'rgba(255,51,102,0.12)',
    borderColor: 'rgba(255,51,102,0.4)',
    maxWidth: 160,
  },
  chipText: {
    color: colors.warning,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
  },
  chipTextError: {
    color: colors.error,
  },
  timelineZone: {
    paddingHorizontal: 22,
    marginTop: 14,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  time: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    marginTop: 10,
  },
  sideBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnWrap: {
    shadowColor: colors.primary,
    shadowOpacity: 0.65,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  repeatOne: {
    position: 'absolute',
    top: 2,
    right: 2,
    color: colors.secondary,
    fontFamily: fonts.bodyBold,
    fontSize: 9,
  },
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 12,
  },
  utilityBtn: {
    padding: 8,
  },
  lyricsZone: {
    minHeight: 58,
    marginTop: 10,
  },
  lyricsZoneVisible: {
    backgroundColor: 'rgba(8,8,14,0.66)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lyricsEmpty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 30,
  },
  lyricsEmptyText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  lyricsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  lyricsHintText: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  // Hoja de cola
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5,5,7,0.72)',
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: colors.surfaceSolid,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    maxHeight: '78%',
    paddingBottom: safeArea.bottom + 12,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: fonts.title,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  sheetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,51,102,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,51,102,0.3)',
  },
  sheetClearText: {
    color: colors.error,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetList: {
    paddingBottom: 8,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  sheetIndex: {
    width: 32,
    textAlign: 'center',
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  sheetRowMain: {
    flex: 1,
  },
  sheetRemoveBtn: {
    padding: 8,
  },
  sheetEmpty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  sheetEmptyText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,51,102,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,51,102,0.3)',
  },
  errorBannerText: {
    flex: 1,
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
});