import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CoverArt, SongRow } from '@components/player/SongRow';
import { DynamicBackground } from '@components/player/DynamicBackground';
import { EmptyState } from '@components/ui/EmptyState';
import { EqualizerBars } from '@components/ui/EqualizerBars';
import { PressableFluid } from '@components/ui/PressableFluid';
import { SkeletonList } from '@components/ui/SkeletonList';
import { UserAvatar } from '@components/ui/UserAvatar';
import { UserProfileModal } from '@components/profile/UserProfileModal';
import { EditProfileModal } from '@components/profile/EditProfileModal';
import type { Song } from '@lib/types';
import { pickCoverUrl, resolveArtist } from '@lib/utils';
import { fetchTopSongs } from '@services/songs.service';
import { useLibraryStore } from '@stores/library.store';
import { usePlayerStore } from '@stores/player.store';
import { useSettingsStore } from '@stores/settings.store';
import { useUiStore } from '@stores/ui.store';
import { colors, gradients } from '@theme';

type HomeTab = 'foryou' | 'top' | 'recent' | 'all';

const HeroProgressBar = React.memo(() => {
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
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
  );
});

export default function HomeScreen() {
  const songs = useLibraryStore((s) => s.songs);
  const loading = useLibraryStore((s) => s.loading);
  const error = useLibraryStore((s) => s.error);
  const refreshLibrary = useLibraryStore((s) => s.refresh);

  const user = useSettingsStore((s) => s.user);
  const logout = useSettingsStore((s) => s.logout);

  const [profileOpen, setProfileOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTab>('foryou');

  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const queue = usePlayerStore((s) => s.queue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const playSong = usePlayerStore((s) => s.playSong);
  const previous = usePlayerStore((s) => s.previous);
  const next = usePlayerStore((s) => s.next);
  const openFullscreen = useUiStore((s) => s.openFullscreen);
  const openAuth = useUiStore((s) => s.openAuth);
  const openSongActions = useUiStore((s) => s.openSongActions);

  const [topIds, setTopIds] = useState<Array<number | string>>([]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshLibrary();
      const rows = await fetchTopSongs(10);
      setTopIds(rows.map((r) => r.song_id));
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [refreshLibrary]);

  useEffect(() => {
    let alive = true;
    void fetchTopSongs(10)
      .then((rows) => {
        if (!alive) return;
        setTopIds(rows.map((r) => r.song_id));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const topSongs = useMemo(() => {
    if (topIds.length === 0) return songs.slice(0, 6);
    const byId = new Map(songs.map((s) => [String(s.id), s]));
    const ordered: Song[] = [];
    for (const id of topIds) {
      const song = byId.get(String(id));
      if (song) ordered.push(song);
    }
    if (ordered.length < 4 && songs.length > 0) {
      for (const s of songs) {
        if (ordered.length >= 6) break;
        if (!ordered.some((o) => String(o.id) === String(s.id))) ordered.push(s);
      }
    }
    return ordered.slice(0, 8);
  }, [topIds, songs]);

  const featuredSong = useMemo(() => {
    if (currentSong) return currentSong;
    if (topSongs.length > 0) return topSongs[0];
    if (songs.length > 0) return songs[0];
    return null;
  }, [currentSong, topSongs, songs]);

  const displayedSongs = useMemo(() => {
    if (activeTab === 'top') {
      return topSongs;
    }
    if (activeTab === 'recent') {
      return [...songs].reverse().slice(0, 30);
    }
    if (activeTab === 'foryou') {
      return songs.slice(0, 25);
    }
    return songs;
  }, [activeTab, topSongs, songs]);

  const MemoizedSongRow = useMemo(() => React.memo(SongRow), []);
  const nowPlaying = currentSong;
  const nowPlayingCover = useMemo(() => (nowPlaying ? pickCoverUrl(nowPlaying) : null), [nowPlaying]);
  const featuredCover = useMemo(() => (featuredSong ? pickCoverUrl(featuredSong) : null), [featuredSong]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Buenas noches';
    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const handlePlaySongItem = useCallback(
    (song: Song) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      playSong(song, songs.length > 0 ? songs : [song]);
    },
    [playSong, songs]
  );

  return (
    <View style={styles.container}>
      <DynamicBackground song={nowPlaying} intensity={0.9} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surfaceSolid}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}>
              Jodi<Text style={styles.logoAccent}>Fy</Text>
            </Text>
            <Text style={styles.greeting} numberOfLines={1}>
              {greeting}, {user ? user.display_name || user.username : 'melómano'}
            </Text>
          </View>

          <PressableFluid
            onPress={() => {
              if (user) {
                setProfileOpen(true);
              } else {
                openAuth();
              }
            }}
            haptic="light"
            style={styles.headerRight}
            hitSlop={8}
          >
            {user ? (
              <UserAvatar
                user={user}
                size={44}
                showPresence
                presence="online"
              />
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

        {/* Loading State */}
        {loading && songs.length === 0 ? (
          <View style={styles.skeletonWrap}>
            <SkeletonList rows={7} />
          </View>
        ) : error && songs.length === 0 ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Sin conexión"
            subtitle={error}
            action={{ label: 'Reintentar', onPress: () => useLibraryStore.getState().refresh() }}
          />
        ) : (
          <>
            {/* HERO SECTION */}
            {nowPlaying ? (
              <PressableFluid
                onPress={openFullscreen}
                haptic="medium"
                style={styles.hero}
              >
                <View style={styles.heroBackdrop}>
                  {nowPlayingCover && (
                    <Image
                      source={{ uri: nowPlayingCover }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                      blurRadius={50}
                    />
                  )}
                  <LinearGradient
                    colors={gradients.hero}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>

                <LinearGradient
                  colors={[gradients.primary[0], gradients.primary[1]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroGlowLine}
                />

                <View style={styles.heroInner}>
                  <View style={styles.heroTop}>
                    <CoverArt
                      source={nowPlayingCover ? { uri: nowPlayingCover } : undefined}
                      size={110}
                      radiusSize={20}
                    />
                    <View style={styles.heroTexts}>
                      <View style={styles.heroBadgeRow}>
                        <EqualizerBars playing={isPlaying} bars={3} height={11} barWidth={2.5} color={colors.secondary} />
                        <Text style={styles.heroLabel}>REPRODUCIENDO AHORA</Text>
                      </View>
                      <Text style={styles.heroTitle} numberOfLines={2}>
                        {nowPlaying.name}
                      </Text>
                      <Text style={styles.heroArtist} numberOfLines={1}>
                        {resolveArtist(nowPlaying) ?? 'Desconocido'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.heroControls}>
                    <HeroProgressBar />
                    <PressableFluid onPress={previous} haptic="light" style={styles.heroControlBtn}>
                      <Ionicons name="play-skip-back" size={22} color={colors.text} />
                    </PressableFluid>
                    <PressableFluid onPress={togglePlay} haptic="medium" style={styles.heroControlBtnMain}>
                      <LinearGradient
                        colors={[gradients.play[0], gradients.play[1]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroPlayFill}
                      >
                        <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color={colors.white} />
                      </LinearGradient>
                    </PressableFluid>
                    <PressableFluid onPress={next} haptic="light" style={styles.heroControlBtn}>
                      <Ionicons name="play-skip-forward" size={22} color={colors.text} />
                    </PressableFluid>
                    <PressableFluid onPress={openFullscreen} haptic="light" style={styles.heroControlBtn}>
                      <Ionicons name="expand" size={20} color={colors.secondary} />
                    </PressableFluid>
                  </View>
                </View>
              </PressableFluid>
            ) : featuredSong ? (
              <PressableFluid
                onPress={() => handlePlaySongItem(featuredSong)}
                haptic="medium"
                style={styles.hero}
              >
                <View style={styles.heroBackdrop}>
                  {featuredCover && (
                    <Image
                      source={{ uri: featuredCover }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                      blurRadius={40}
                    />
                  )}
                  <LinearGradient
                    colors={['rgba(20, 10, 35, 0.9)', 'rgba(10, 10, 20, 0.95)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>

                <LinearGradient
                  colors={['#7F00FF', '#00E5FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.heroGlowLine}
                />

                <View style={styles.heroInner}>
                  <View style={styles.heroTop}>
                    <CoverArt
                      source={featuredCover ? { uri: featuredCover } : undefined}
                      size={100}
                      radiusSize={18}
                    />
                    <View style={styles.heroTexts}>
                      <Text style={styles.heroLabel}>DESTACADO DE HOY</Text>
                      <Text style={styles.heroTitle} numberOfLines={2}>
                        {featuredSong.name}
                      </Text>
                      <Text style={styles.heroArtist} numberOfLines={1}>
                        {resolveArtist(featuredSong) ?? 'JodiFy Live'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.discoveryActions}>
                    <View style={styles.playNowBtn}>
                      <LinearGradient
                        colors={['#7F00FF', '#00E5FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.playNowGradient}
                      >
                        <Ionicons name="play" size={16} color={colors.white} />
                        <Text style={styles.playNowText}>Reproducir ahora</Text>
                      </LinearGradient>
                    </View>
                    <Text style={styles.discoveryHint}>{songs.length} pistas en alta fidelidad</Text>
                  </View>
                </View>
              </PressableFluid>
            ) : null}

            {/* HORIZONTAL CAROUSEL: MÁS ESCUCHADAS */}
            {topSongs.length > 0 && (
              <View style={styles.carouselSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleWrap}>
                    <View style={styles.sectionDot} />
                    <Text style={styles.sectionTitle}>Tendencias & Más escuchadas</Text>
                  </View>
                  <Text style={styles.sectionMeta}>{topSongs.length} pistas</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.topRow}
                >
                  {topSongs.map((song) => {
                    const isCurrent = String(currentSong?.id) === String(song.id);
                    const cover = pickCoverUrl(song);
                    return (
                      <PressableFluid
                        key={song.id}
                        onPress={() => handlePlaySongItem(song)}
                        onLongPress={() => openSongActions(song)}
                        haptic="light"
                        scaleTo={0.95}
                        style={styles.topCard}
                      >
                        <View style={styles.topCoverWrap}>
                          <CoverArt
                            source={cover ? { uri: cover } : undefined}
                            size={124}
                            radiusSize={18}
                          />
                          {isCurrent ? (
                            <View style={styles.topPlayingBadge}>
                              <EqualizerBars playing={isPlaying} bars={3} height={14} barWidth={3} color={colors.white} />
                            </View>
                          ) : (
                            <View style={styles.topPlayHoverBtn}>
                              <Ionicons name="play" size={16} color={colors.white} />
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
              </View>
            )}

            {/* EXPLORE TABS */}
            <View style={styles.filterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
                <PressableFluid
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab('foryou');
                  }}
                  style={[styles.tabChip, activeTab === 'foryou' && styles.tabChipActive]}
                >
                  <Ionicons
                    name="sparkles"
                    size={13}
                    color={activeTab === 'foryou' ? colors.white : colors.textMuted}
                  />
                  <Text style={[styles.tabChipText, activeTab === 'foryou' && styles.tabChipTextActive]}>
                    Para ti
                  </Text>
                </PressableFluid>

                <PressableFluid
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab('top');
                  }}
                  style={[styles.tabChip, activeTab === 'top' && styles.tabChipActive]}
                >
                  <Ionicons
                    name="flame"
                    size={13}
                    color={activeTab === 'top' ? colors.white : colors.textMuted}
                  />
                  <Text style={[styles.tabChipText, activeTab === 'top' && styles.tabChipTextActive]}>
                    Top Hits
                  </Text>
                </PressableFluid>

                <PressableFluid
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab('recent');
                  }}
                  style={[styles.tabChip, activeTab === 'recent' && styles.tabChipActive]}
                >
                  <Ionicons
                    name="time"
                    size={13}
                    color={activeTab === 'recent' ? colors.white : colors.textMuted}
                  />
                  <Text style={[styles.tabChipText, activeTab === 'recent' && styles.tabChipTextActive]}>
                    Recientes
                  </Text>
                </PressableFluid>

                <PressableFluid
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab('all');
                  }}
                  style={[styles.tabChip, activeTab === 'all' && styles.tabChipActive]}
                >
                  <Ionicons
                    name="musical-notes"
                    size={13}
                    color={activeTab === 'all' ? colors.white : colors.textMuted}
                  />
                  <Text style={[styles.tabChipText, activeTab === 'all' && styles.tabChipTextActive]}>
                    Todas ({songs.length})
                  </Text>
                </PressableFluid>
              </ScrollView>
            </View>

            {/* CANCIONES LIST */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <View style={[styles.sectionDot, { backgroundColor: colors.secondary }]} />
                <Text style={styles.sectionTitle}>
                  {activeTab === 'all'
                    ? 'Todas las canciones'
                    : activeTab === 'top'
                    ? 'Canciones más escuchadas'
                    : activeTab === 'recent'
                    ? 'Nuevas incorporaciones'
                    : 'Recomendadas para ti'}
                </Text>
              </View>
              <Text style={styles.sectionMeta}>{displayedSongs.length} temas</Text>
            </View>

            {displayedSongs.length === 0 ? (
              <EmptyState
                icon="musical-notes-outline"
                title="No hay canciones disponibles"
                subtitle="Comprueba tu conexión o vuelve a cargar la biblioteca."
                action={{ label: 'Recargar', onPress: handleRefresh }}
              />
            ) : (
              displayedSongs.map((song) => (
                <MemoizedSongRow
                  key={song.id}
                  song={song}
                  isCurrent={String(currentSong?.id) === String(song.id)}
                  isPlaying={isPlaying}
                  onPress={() => handlePlaySongItem(song)}
                  onLongPress={() => openSongActions(song)}
                />
              ))
            )}

            {/* QUEUE PREVIEW SECTION */}
            {queue.length > 0 && (
              <View style={styles.queueSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleWrap}>
                    <Ionicons name="list" size={16} color={colors.secondary} />
                    <Text style={styles.sectionTitle}>Cola de Reproducción ({queue.length})</Text>
                  </View>
                  <PressableFluid onPress={togglePlay} haptic="light" style={styles.queueBtn}>
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={14} color={colors.white} />
                    <Text style={styles.queueBtnText}>{isPlaying ? 'Pausar' : 'Reanudar'}</Text>
                  </PressableFluid>
                </View>

                {queue.slice(0, 5).map((song) => (
                  <MemoizedSongRow
                    key={'q_' + song.id}
                    song={song}
                    isCurrent={String(currentSong?.id) === String(song.id)}
                    isPlaying={isPlaying}
                    onPress={() => handlePlaySongItem(song)}
                    onLongPress={() => openSongActions(song)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* User Profile Modal with native animation and decor */}
      <UserProfileModal
        user={user}
        isCurrentUser
        visible={profileOpen && !!user}
        onClose={() => setProfileOpen(false)}
        onOpenAccountDetails={() => {
          setProfileOpen(false);
          setEditProfileOpen(true);
        }}
        onLogout={() => {
          setProfileOpen(false);
          void logout();
        }}
      />

      {/* Edit Profile & Avatar Decorator Modal */}
      <EditProfileModal
        visible={editProfileOpen && !!user}
        onClose={() => setEditProfileOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: colors.secondary,
  },
  greeting: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(127, 0, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(127, 0, 255, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  loginChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  skeletonWrap: {
    paddingVertical: 12,
  },
  hero: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 20,
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGlowLine: {
    height: 3,
    width: '100%',
  },
  heroInner: {
    padding: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroTexts: {
    flex: 1,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.3,
  },
  heroArtist: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heroControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroProgressWrap: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    height: 3,
  },
  heroProgress: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
  },
  heroControlBtn: {
    padding: 8,
  },
  heroControlBtnMain: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroPlayFill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoveryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  playNowBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  playNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  playNowText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  discoveryHint: {
    fontSize: 11,
    color: colors.textMuted,
  },
  carouselSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sectionMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  topRow: {
    gap: 12,
    paddingBottom: 4,
  },
  topCard: {
    width: 124,
  },
  topCoverWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  topPlayingBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topPlayHoverBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(127, 0, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  topArtist: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  filterSection: {
    marginBottom: 14,
  },
  tabsRow: {
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabChipActive: {
    backgroundColor: 'rgba(127, 0, 255, 0.25)',
    borderColor: 'rgba(127, 0, 255, 0.6)',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  queueSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  queueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  queueBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  bottomPad: {
    height: 30,
  },
});