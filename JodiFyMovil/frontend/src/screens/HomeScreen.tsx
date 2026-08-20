import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CoverArt, SongRow } from '../components/player/SongRow';
import { DynamicBackground } from '../components/player/DynamicBackground';
import { EmptyState } from '../components/ui/EmptyState';
import { EqualizerBars } from '../components/ui/EqualizerBars';
import { PressableScale } from '../components/ui/PressableScale';
import { SkeletonList } from '../components/ui/SkeletonList';
import { LyricsPanel } from '../components/lyrics/LyricsPanel';
import type { Song } from '../lib/types';
import { pickCoverUrl, resolveArtist } from '../lib/utils';
import { fetchTopSongs } from '../services/songs.service';
import { useLibraryStore } from '../store/library.store';
import { usePlayerStore } from '../store/player.store';
import { useSettingsStore } from '../store/settings.store';
import { useUiStore } from '../store/ui.store';
import { colors, fonts, gradients, radius } from '../theme';

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
  const nowPlaying = currentSong;

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
          <PressableScale onPress={user ? undefined : openAuth} haptic={!user} style={styles.headerRight}>
            {user ? (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.username.slice(0, 1).toUpperCase()}</Text>
              </View>
            ) : (
              <View style={styles.loginChip}>
                <Ionicons name="person-outline" size={14} color={colors.white} />
                <Text style={styles.loginChipText}>Entrar</Text>
              </View>
            )}
            <View style={styles.headerBadge}>
              <EqualizerBars playing={isPlaying} bars={3} height={12} barWidth={2.5} color={colors.secondary} />
            </View>
          </PressableScale>
        </View>

        <LyricsPanel />

        {loading ? (
          <View style={styles.skeletonWrap}>
            <SkeletonList rows={7} />
          </View>
        ) : error ? (
          <EmptyState icon="cloud-offline-outline" title="Sin conexión" subtitle={error} />
        ) : nowPlaying ? (
          <PressableScale onPress={openFullscreen} style={styles.hero} haptic>
            <View style={styles.heroBackdrop}>
              {pickCoverUrl(nowPlaying) && (
                <Image
                  source={{ uri: pickCoverUrl(nowPlaying) ?? undefined }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  blurRadius={40}
                />
              )}
              <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            </View>
            <LinearGradient colors={[gradients.primary[0], gradients.primary[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGlowLine} />
            <View style={styles.heroInner}>
              <View style={styles.heroTop}>
                <CoverArt song={nowPlaying} size={92} radiusSize={20} />
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
                <PressableScale onPress={previous} haptic style={styles.heroControlBtn}>
                  <Ionicons name="play-skip-back" size={20} color={colors.text} />
                </PressableScale>
                <PressableScale onPress={togglePlay} haptic style={styles.heroControlBtn}>
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={colors.white} />
                </PressableScale>
                <PressableScale onPress={next} haptic style={styles.heroControlBtn}>
                  <Ionicons name="play-skip-forward" size={20} color={colors.text} />
                </PressableScale>
                <PressableScale onPress={openFullscreen} haptic style={styles.heroControlBtn}>
                  <Ionicons name="expand" size={20} color={colors.primary} />
                </PressableScale>
              </View>
              <View style={styles.heroEqualizer}>
                <EqualizerBars playing={isPlaying} bars={5} height={16} barWidth={3} color={colors.white} />
              </View>
            </View>
          </PressableScale>
        ) : (
          <PressableScale onPress={() => useUiStore.getState().setTab('library')} style={styles.hero} haptic>
            <LinearGradient colors={[gradients.accent[0], gradients.primary[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.heroInner}>
              <Text style={styles.heroLabel}>BIENVENIDO</Text>
              <Text style={styles.heroTitle}>Descubre tu próxima canción favorita</Text>
              <Text style={styles.heroArtist}>Explora la biblioteca →</Text>
            </View>
          </PressableScale>
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
                  <PressableScale
                    key={song.id}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      playSong(song, songs);
                    }}
                    haptic
                    scaleTo={0.96}
                    style={styles.topCard}
                  >
                    <View style={styles.topCoverWrap}>
                      <CoverArt song={song} size={108} radiusSize={16} />
                      {isCurrent && (
                        <View style={styles.topPlayingBadge}>
                          <EqualizerBars playing={isPlaying} bars={3} height={12} barWidth={2.5} color={colors.white} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.topName} numberOfLines={1}>
                      {song.name}
                    </Text>
                    <Text style={styles.topArtist} numberOfLines={1}>
                      {resolveArtist(song) ?? 'Desconocido'}
                    </Text>
                  </PressableScale>
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
            <PressableScale onPress={togglePlay} haptic style={styles.queueBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={15} color={colors.white} />
              <Text style={styles.queueBtnText}>{isPlaying ? 'Pausar' : 'Reanudar'}</Text>
            </PressableScale>
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
            <SongRow
              key={song.id}
              song={song}
              isCurrent={String(currentSong?.id) === String(song.id)}
              isPlaying={isPlaying}
              onPress={() => playSong(song, queue)}
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
    paddingTop: 14,
    paddingBottom: 190,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  logo: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: -0.5,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  logoAccent: {
    color: colors.secondary,
  },
  greeting: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12.5,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(127,0,255,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(127,0,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  loginChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(127,0,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(127,0,255,0.5)',
  },
  loginChipText: {
    color: colors.white,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
  },
  headerBadge: {
    padding: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(16,16,22,0.7)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonWrap: {
    paddingTop: 8,
  },
  hero: {
    marginHorizontal: 16,
    borderRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  heroGlowLine: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 2,
    borderRadius: 1,
  },
  heroInner: {
    padding: 20,
    minHeight: 168,
    justifyContent: 'flex-end',
    gap: 14,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroTexts: {
    flex: 1,
  },
  heroLabel: {
    color: colors.secondary,
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    letterSpacing: 2.2,
    marginBottom: 5,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: -0.6,
    lineHeight: 29,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroArtist: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: fonts.bodySemiBold,
    fontSize: 13.5,
    marginTop: 4,
  },
  heroControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroProgressWrap: {
    flex: 1,
  },
  heroProgress: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  heroControlBtn: {
    padding: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(127,0,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(127,0,255,0.4)',
  },
  heroEqualizer: {
    marginTop: 12,
    paddingLeft: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 6,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.title,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  sectionMeta: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
  },
  topRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  topCard: {
    width: 108,
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
    borderRadius: 16,
    backgroundColor: 'rgba(5,5,7,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topName: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    marginTop: 8,
  },
  topArtist: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 1,
  },
  topLoading: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  queueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(127,0,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(127,0,255,0.4)',
  },
  queueBtnText: {
    color: colors.white,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
  },
  bottomPad: {
    height: 40,
  },
});