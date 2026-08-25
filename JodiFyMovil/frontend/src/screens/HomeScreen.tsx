import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CoverArt, SongRow } from '../components/player/SongRow';
import { DynamicBackground } from '../components/player/DynamicBackground';
import { EmptyState } from '../components/ui/EmptyState';
import { EqualizerBars } from '../components/ui/EqualizerBars';
import { PressableFluid } from '../components/ui/PressableFluid';
import { SkeletonList } from '../components/ui/SkeletonList';
import { LyricsPanel } from '../components/lyrics/LyricsPanel';
import type { Song } from '../lib/types';
import { pickCoverUrl, resolveArtist } from '../lib/utils';
import { fetchTopSongs } from '../services/songs.service';
import { useLibraryStore } from '../store/library.store';
import { usePlayerStore } from '../store/player.store';
import { useSettingsStore } from '../store/settings.store';
import { useUiStore } from '../store/ui.store';
import { colors, typography, gradients, radius, touch, elevation } from '../theme';

export function HomeScreen() {
  const songs = useLibraryStore((s) => s.songs);
  const loading = useLibraryStore((s) => s.loading);
  const error = useLibraryStore((s) => s.error);
  const user = useSettingsStore((s) => s.user);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const queue = usePlayerStore((s) => s.queue);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const playSong = usePlayerStore((s) => s.playSong);
  const previous = usePlayerStore((s) => s.previous);
  const next = usePlayerStore((s) => s.next);
  const openFullscreen = useUiStore((s) => s.openFullscreen);
  const openAuth = useUiStore((s) => s.openAuth);
  const openSongActions = useUiStore((s) => s.openSongActions);

  const [topIds, setTopIds] = useState<Array<number | string>>([]);
  const [topLoading, setTopLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void fetchTopSongs(10)
      .then((rows) => {
        if (!alive) return;
        setTopIds(rows.map((r) => r.song_id));
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setTopLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const topSongs = useMemo(() => {
    if (topIds.length === 0) return [];
    const byId = new Map(songs.map((s) => [String(s.id), s]));
    const ordered: Song[] = [];
    for (const id of topIds) {
      const song = byId.get(String(id));
      if (song) ordered.push(song);
    }
    if (ordered.length < 4 && songs.length > 0) {
      for (const s of songs) {
        if (ordered.length >= 4) break;
        if (!ordered.some((o) => String(o.id) === String(s.id))) ordered.push(s);
      }
    }
    return ordered.slice(0, 6);
  }, [topIds, songs]);

  const queuePreview = queue.slice(0, 20);
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  const handleQueuePlaySong = useCallback((song: Song) => {
    playSong(song, queue);
  }, [playSong, queue]);

  const MemoizedSongRow = useMemo(() => React.memo(SongRow), []);
  const nowPlaying = currentSong;
  const nowPlayingCover = useMemo(() => nowPlaying ? pickCoverUrl(nowPlaying) : null, [nowPlaying]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Buenas noches';
    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  return (
    <View style={styles.container}>
      <DynamicBackground song={nowPlaying} intensity={0.9} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>
              Jodi<Text style={styles.logoAccent}>Fy</Text>
            </Text>
            <Text style={styles.greeting} numberOfLines={1}>
              {greeting}, {user ? user.username : 'invitado'}
            </Text>
          </View>
          <PressableFluid
            onPress={user ? undefined : openAuth}
            haptic={!user ? 'light' : undefined}
            disabled={!!user}
            style={styles.headerRight}
            hitSlop={8}
          >
            {user ? (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.username.slice(0, 1).toUpperCase()}</Text>
              </View>
            ) : (
              <View style={styles.loginChip}>
                <Ionicons name="person-outline" size={16} color={colors.white} />
                <Text style={styles.loginChipText}>Entrar</Text>
              </View>
            )}
            <View style={styles.headerBadge}>
              <EqualizerBars playing={isPlaying} bars={3} height={14} barWidth={3} color={colors.secondary} />
            </View>
          </PressableFluid>
        </View>

        <LyricsPanel />

        {loading ? (
          <View style={styles.skeletonWrap}>
            <SkeletonList rows={7} />
          </View>
        ) : error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Sin conexión"
            subtitle={error}
            action={{ label: 'Reintentar', onPress: () => useLibraryStore.getState().refresh() }}
          />
        ) : nowPlaying ? (
          <PressableFluid
            onPress={openFullscreen}
            haptic="medium"
            style={styles.hero}
          >
            <View style={styles.heroBackdrop}>
              {nowPlayingCover && (
                <Image
                  source={{ uri: nowPlayingCover ?? undefined }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  blurRadius={50}
                />
              )}
              <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            </View>
            <LinearGradient colors={[gradients.primary[0], gradients.primary[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGlowLine} />
            <View style={styles.heroInner}>
              <View style={styles.heroTop}>
                <CoverArt song={nowPlaying} size={120} radiusSize={22} />
                <View style={styles.heroTexts}>
                  <Text style={styles.heroLabel}>REPRODUCIENDO</Text>
                  <Text style={styles.heroTitle} numberOfLines={2}>
                    {nowPlaying.name}
                  </Text>
                  <Text style={styles.heroArtist} numberOfLines={1}>
                    {resolveArtist(nowPlaying) ?? 'Desconocido'}
                  </Text>
                </View>
              </View>
              <View style={styles.heroControls}>
                <View style={styles.heroProgressWrap}>
                  <View style={styles.heroProgress}>
                    <LinearGradient
                      colors={[gradients.primary[0], gradients.primary[1]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.heroProgressFill, { width: `${progress * 100}%` }]}
                    />
                  </View>
                </View>
                <PressableFluid onPress={previous} haptic="light" style={styles.heroControlBtn}>
                  <Ionicons name="play-skip-back" size={24} color={colors.text} />
                </PressableFluid>
                <PressableFluid onPress={togglePlay} haptic="medium" style={styles.heroControlBtnMain}>
                  <LinearGradient colors={[gradients.play[0], gradients.play[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroPlayFill}>
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={colors.white} />
                  </LinearGradient>
                </PressableFluid>
                <PressableFluid onPress={next} haptic="light" style={styles.heroControlBtn}>
                  <Ionicons name="play-skip-forward" size={24} color={colors.text} />
                </PressableFluid>
                <PressableFluid onPress={openFullscreen} haptic="light" style={styles.heroControlBtn}>
                  <Ionicons name="expand" size={24} color={colors.secondary} />
                </PressableFluid>
              </View>
              <View style={styles.heroEqualizer}>
                <EqualizerBars playing={isPlaying} bars={5} height={18} barWidth={4} color={colors.white} />
              </View>
            </View>
          </PressableFluid>
        ) : (
          <PressableFluid
            onPress={() => useUiStore.getState().setTab('library')}
            haptic="medium"
            style={styles.hero}
          >
            <LinearGradient colors={[gradients.accent[0], gradients.primary[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.heroInner}>
              <Text style={styles.heroLabel}>BIENVENIDO</Text>
              <Text style={styles.heroTitle}>Descubre tu próxima canción favorita</Text>
              <Text style={styles.heroArtist}>Explora la biblioteca →</Text>
            </View>
          </PressableFluid>
        )}

        {!loading && topSongs.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Más escuchadas</Text>
              </View>
              <Text style={styles.sectionMeta}>{topSongs.length} canciones</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topRow}>
              {topSongs.map((song) => {
                const isCurrent = String(currentSong?.id) === String(song.id);
                return (
                  <PressableFluid
                    key={song.id}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      playSong(song, songs);
                    }}
                    haptic="light"
                    scaleTo={0.96}
                    style={styles.topCard}
                  >
                    <View style={styles.topCoverWrap}>
                      <CoverArt song={song} size={120} radiusSize={18} />
                      {isCurrent && (
                        <View style={styles.topPlayingBadge}>
                          <EqualizerBars playing={isPlaying} bars={3} height={14} barWidth={3} color={colors.white} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.topName} numberOfLines={1}>
                      {song.name}
                    </Text>
                    <Text style={styles.topArtist} numberOfLines={1}>
                      {resolveArtist(song) ?? 'Desconocido'}
                    </Text>
                  </PressableFluid>
                );
              })}
            </ScrollView>
          </>
        )}

        {topLoading && topSongs.length === 0 && !loading && (
          <View style={styles.topLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>Cola</Text>
          </View>
          {queue.length > 0 && (
            <PressableFluid onPress={togglePlay} haptic="light" style={styles.queueBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color={colors.white} />
              <Text style={styles.queueBtnText}>{isPlaying ? 'Pausar' : 'Reanudar'}</Text>
            </PressableFluid>
          )}
        </View>

        {queuePreview.length === 0 ? (
          <EmptyState
            icon="list-outline"
            title="Tu cola está vacía"
            subtitle="Toca una canción en la pestaña Biblioteca y aparecerá aquí."
          />
        ) : (
          queuePreview.map((song) => (
            <MemoizedSongRow
              key={song.id}
              song={song}
              isCurrent={String(currentSong?.id) === String(song.id)}
              isPlaying={isPlaying}
              onPress={() => handleQueuePlaySong(song)}
              onLongPress={() => openSongActions(song)}
            />
          ))
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logo: {
    color: colors.white,
    fontFamily: typography.displayMedium.fontFamily,
    fontSize: typography.displayMedium.fontSize,
    letterSpacing: typography.displayMedium.letterSpacing,
    lineHeight: typography.displayMedium.lineHeight,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  logoAccent: {
    color: colors.secondary,
  },
  greeting: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    lineHeight: typography.bodySmall.lineHeight,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: touch.comfortable,
    height: touch.comfortable,
    borderRadius: touch.comfortable / 2,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    letterSpacing: typography.labelLarge.letterSpacing,
  },
  loginChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
  },
  loginChipText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
  },
  headerBadge: {
    width: touch.comfortable,
    height: touch.comfortable,
    borderRadius: touch.comfortable / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonWrap: {
    paddingTop: 8,
  },
  hero: {
    marginHorizontal: 16,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    ...elevation.level3,
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: radius.xxl,
  },
  heroGlowLine: {
    position: 'absolute',
    top: 0,
    left: 28,
    right: 28,
    height: 2,
    borderRadius: 1,
  },
  heroInner: {
    padding: 24,
    minHeight: 220,
    justifyContent: 'flex-end',
    gap: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  heroTexts: {
    flex: 1,
  },
  heroLabel: {
    color: colors.secondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    lineHeight: typography.labelSmall.lineHeight,
    marginBottom: 6,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: typography.displaySmall.fontFamily,
    fontSize: typography.displaySmall.fontSize,
    letterSpacing: typography.displaySmall.letterSpacing,
    lineHeight: typography.displaySmall.lineHeight,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroArtist: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    letterSpacing: typography.labelLarge.letterSpacing,
    lineHeight: typography.labelLarge.lineHeight,
    marginTop: 4,
  },
  heroControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroProgressWrap: {
    flex: 1,
  },
  heroProgress: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  heroControlBtn: {
    width: touch.comfortable,
    height: touch.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(127,0,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(127,0,255,0.4)',
  },
  heroControlBtnMain: {
    width: touch.generous,
    height: touch.generous,
    borderRadius: touch.generous / 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  heroPlayFill: {
    width: '100%',
    height: '100%',
    borderRadius: touch.generous / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEqualizer: {
    marginTop: 14,
    paddingLeft: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 36,
    marginBottom: 10,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: typography.headlineMedium.fontSize,
    letterSpacing: typography.headlineMedium.letterSpacing,
    lineHeight: typography.headlineMedium.lineHeight,
  },
  sectionMeta: {
    color: colors.textMuted,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
    lineHeight: typography.labelMedium.lineHeight,
  },
  topRow: {
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 4,
  },
  topCard: {
    width: 120,
  },
  topCoverWrap: {
    position: 'relative',
  },
  topPlayingBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    backgroundColor: 'rgba(5,5,7,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topName: {
    color: colors.text,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    lineHeight: typography.bodyMedium.lineHeight,
    marginTop: 10,
  },
  topArtist: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    lineHeight: typography.bodySmall.lineHeight,
    marginTop: 2,
  },
  topLoading: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  queueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
  },
  queueBtnText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
  },
  bottomPad: {
    height: 48,
  },
});