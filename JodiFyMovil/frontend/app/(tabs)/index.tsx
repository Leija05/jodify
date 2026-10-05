import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CoverArt, SongRow } from '@components/player/SongRow';
import { DynamicBackground } from '@components/player/DynamicBackground';
import { EmptyState } from '@components/ui/EmptyState';
import { EqualizerBars } from '@components/ui/EqualizerBars';
import { PressableFluid } from '@components/ui/PressableFluid';
import { SkeletonList } from '@components/ui/SkeletonList';
import { UserAvatar } from '@components/ui/UserAvatar';
import { UserProfileModal } from '@components/profile/UserProfileModal';
import { EditProfileModal } from '@components/profile/EditProfileModal';
import { PixelPet } from '@components/social/PixelPet';
import type { Song } from '@lib/types';
import { pickCoverUrl, resolveArtist, calculateMelomanoLevel } from '@lib/utils';
import { getSongPalette } from '@lib/palette';
import { fetchTopSongs } from '@services/songs.service';
import { useLibraryStore } from '@stores/library.store';
import { usePlayerStore } from '@stores/player.store';
import { useSettingsStore } from '@stores/settings.store';
import { useUiStore } from '@stores/ui.store';
import { colors, gradients, typography } from '@theme';

type HomeTab = 'foryou' | 'top' | 'recent' | 'all';

const HeroProgressBar = React.memo(({ primaryColor, secondaryColor }: { primaryColor?: string; secondaryColor?: string }) => {
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const col1 = primaryColor || gradients.primary[0];
  const col2 = secondaryColor || gradients.primary[1];

  return (
    <View style={styles.heroProgressWrap}>
      <View style={styles.heroProgress}>
        <LinearGradient
          colors={[col1, col2]}
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
  const refreshProfile = useSettingsStore((s) => s.refreshProfile);

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

  const router = useRouter();
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const likedIds = useLibraryStore((s) => s.likedIds);

  const melomano = useMemo(() => {
    return calculateMelomanoLevel({
      liked: likedIds.length,
      played: downloadedIds.length,
      downloaded: downloadedIds.length,
      listening_seconds: user?.listening_seconds ?? 0,
    });
  }, [user?.listening_seconds, likedIds.length, downloadedIds.length]);

  const handleQuickShuffle = useCallback(() => {
    if (songs.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0]!, shuffled);
  }, [songs, playSong]);

  const handleGoToLibrary = useCallback(() => {
    void Haptics.selectionAsync();
    router.navigate('/(tabs)/library' as any);
  }, [router]);

  const [topIds, setTopIds] = useState<Array<number | string>>([]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      void refreshProfile();
      await refreshLibrary();
      const rows = await fetchTopSongs(10);
      setTopIds(rows.map((r) => r.song_id));
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [refreshLibrary, refreshProfile]);

  useEffect(() => {
    let alive = true;
    void refreshProfile();
    void fetchTopSongs(10)
      .then((rows) => {
        if (!alive) return;
        setTopIds(rows.map((r) => r.song_id));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [refreshProfile]);

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
  const nowPlayingPalette = useMemo(() => getSongPalette(nowPlaying), [nowPlaying]);
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
            <View style={styles.logoRow}>
              <View style={styles.logoIconContainer}>
                <Image
                  source={require('../../assets/images/icon.png')}
                  style={styles.logoIcon}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.logo}>
                Jodi<Text style={styles.logoAccent}>Fy</Text>
              </Text>
              <View style={styles.logoPulseBadge}>
                <View style={styles.logoPulseDot} />
                <Text style={styles.logoPulseText}>PRO</Text>
              </View>
            </View>
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
            {/* HERO SECTION WITH DOUBLE-BEZEL HARDWARE AESTHETICS */}
            {nowPlaying ? (
              <View style={[styles.heroOuter, { shadowColor: nowPlayingPalette.primary }]}>
                <PressableFluid
                  onPress={openFullscreen}
                  haptic="medium"
                  style={styles.heroInnerCore}
                >
                  <View style={styles.heroBackdrop}>
                    {nowPlayingCover && (
                      <Image
                        source={{ uri: nowPlayingCover }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                        blurRadius={Platform.OS === 'ios' ? 45 : 12}
                      />
                    )}
                    <LinearGradient
                      colors={[
                        nowPlayingPalette.primary + '60',
                        nowPlayingPalette.secondary + '25',
                        'rgba(6, 6, 12, 0.94)',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>

                  <View style={styles.specularHighlight} />

                  <LinearGradient
                    colors={[nowPlayingPalette.primary, nowPlayingPalette.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.heroGlowLine}
                  />

                  <View style={styles.heroInner}>
                    <View style={styles.heroTop}>
                      <View style={styles.heroCoverDoubleBezel}>
                        <CoverArt
                          source={nowPlayingCover ? { uri: nowPlayingCover } : undefined}
                          size={106}
                          radiusSize={18}
                        />
                      </View>
                      <View style={styles.heroTexts}>
                        <View style={styles.heroBadgeRow}>
                          <EqualizerBars playing={isPlaying} bars={3} height={10} barWidth={2.5} color={colors.secondary} />
                          <Text style={styles.heroLabel}>
                            {isPlaying ? 'EN REPRODUCCIÓN · HI-FI' : 'PAUSADO'}
                          </Text>
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
                      <HeroProgressBar primaryColor={nowPlayingPalette.primary} secondaryColor={nowPlayingPalette.secondary} />
                      <PressableFluid onPress={previous} haptic="light" style={styles.heroControlBtn}>
                        <Ionicons name="play-skip-back" size={20} color={colors.text} />
                      </PressableFluid>
                      <PressableFluid onPress={togglePlay} haptic="medium" style={styles.heroControlBtnMain}>
                        <LinearGradient
                          colors={[nowPlayingPalette.primary, nowPlayingPalette.secondary]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.heroPlayFill}
                        >
                          <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color={colors.white} />
                        </LinearGradient>
                      </PressableFluid>
                      <PressableFluid onPress={next} haptic="light" style={styles.heroControlBtn}>
                        <Ionicons name="play-skip-forward" size={20} color={colors.text} />
                      </PressableFluid>
                      <PressableFluid onPress={openFullscreen} haptic="light" style={styles.heroControlBtn}>
                        <Ionicons name="expand" size={18} color={colors.secondary} />
                      </PressableFluid>
                    </View>
                  </View>
                </PressableFluid>
              </View>
            ) : featuredSong ? (
              <View style={styles.heroOuter}>
                <PressableFluid
                  onPress={() => handlePlaySongItem(featuredSong)}
                  haptic="medium"
                  style={styles.heroInnerCore}
                >
                  <View style={styles.heroBackdrop}>
                    {featuredCover && (
                      <Image
                        source={{ uri: featuredCover }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                        blurRadius={Platform.OS === 'ios' ? 40 : 12}
                      />
                    )}
                    <LinearGradient
                      colors={['rgba(24, 10, 42, 0.92)', 'rgba(8, 8, 16, 0.96)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>

                  <View style={styles.specularHighlight} />

                  <LinearGradient
                    colors={['#7F00FF', '#00E5FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.heroGlowLine}
                  />

                  <View style={styles.heroInner}>
                    <View style={styles.heroTop}>
                      <View style={styles.heroCoverDoubleBezel}>
                        <CoverArt
                          source={featuredCover ? { uri: featuredCover } : undefined}
                          size={98}
                          radiusSize={18}
                        />
                      </View>
                      <View style={styles.heroTexts}>
                        <View style={styles.heroBadgeRow}>
                          <Ionicons name="sparkles" size={12} color="#00E5FF" />
                          <Text style={styles.heroLabel}>DESTACADO DE HOY</Text>
                        </View>
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
              </View>
            ) : null}

            {/* BENTO QUICK DISCOVERY & COMPANION GRID */}
            <View style={styles.bentoGrid}>
              {/* Card 1: Quick Shuffle Auto-DJ */}
              <PressableFluid
                onPress={handleQuickShuffle}
                haptic="medium"
                style={styles.bentoCard}
                scaleTo={0.97}
              >
                <LinearGradient
                  colors={['rgba(127, 0, 255, 0.22)', 'rgba(0, 229, 255, 0.08)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bentoCardInner}
                >
                  <View style={styles.bentoHeaderRow}>
                    <View style={styles.bentoIconWrapper}>
                      <Ionicons name="shuffle" size={17} color="#00E5FF" />
                    </View>
                    <View style={styles.bentoPill}>
                      <Text style={styles.bentoPillText}>AUTO-DJ</Text>
                    </View>
                  </View>
                  <Text style={styles.bentoTitle}>Mezcla Rápida</Text>
                  <Text style={styles.bentoSubtitle}>Aleatorio inteligente</Text>
                </LinearGradient>
              </PressableFluid>

              {/* Card 2: Virtual Pet Companion or Offline Mode */}
              {user?.pet_type && user?.pet_type !== 'none' ? (
                <PressableFluid
                  onPress={() => setProfileOpen(true)}
                  haptic="light"
                  style={styles.bentoCard}
                  scaleTo={0.97}
                >
                  <LinearGradient
                    colors={['rgba(255, 0, 122, 0.20)', 'rgba(127, 0, 255, 0.08)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bentoCardInner}
                  >
                    <View style={styles.bentoHeaderRow}>
                      <PixelPet
                        petType={user.pet_type}
                        variant={user.pet_variant}
                        petName={user.pet_name}
                        size={36}
                        interactive={true}
                      />
                      <View style={styles.bentoPill}>
                        <Text style={styles.bentoPillText}>{melomano.badgeEmoji} Nv.{melomano.level}</Text>
                      </View>
                    </View>
                    <Text style={styles.bentoTitle}>{user.pet_name || 'Compañero'}</Text>
                    <Text style={styles.bentoSubtitle}>{melomano.title}</Text>
                  </LinearGradient>
                </PressableFluid>
              ) : (
                <PressableFluid
                  onPress={() => useUiStore.getState().openDownloadsModal()}
                  haptic="light"
                  style={styles.bentoCard}
                  scaleTo={0.97}
                >
                  <LinearGradient
                    colors={['rgba(0, 230, 118, 0.18)', 'rgba(0, 229, 255, 0.08)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bentoCardInner}
                  >
                    <View style={styles.bentoHeaderRow}>
                      <View style={[styles.bentoIconWrapper, { backgroundColor: 'rgba(0, 230, 118, 0.18)' }]}>
                        <Ionicons name="cloud-done-outline" size={17} color="#00E676" />
                      </View>
                      <View style={[styles.bentoPill, { borderColor: 'rgba(0, 230, 118, 0.4)' }]}>
                        <Text style={[styles.bentoPillText, { color: '#00E676' }]}>OFFLINE</Text>
                      </View>
                    </View>
                    <Text style={styles.bentoTitle}>Descargas</Text>
                    <Text style={styles.bentoSubtitle}>{downloadedIds.length} pistas sin red</Text>
                  </LinearGradient>
                </PressableFluid>
              )}
            </View>

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
                    const rank = topSongs.indexOf(song) + 1;
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
                          <View
                            style={[
                              styles.topRankBadge,
                              rank === 1 && { backgroundColor: '#ffd700', borderColor: '#ffd700' },
                              rank === 2 && { backgroundColor: '#e2e8f0', borderColor: '#e2e8f0' },
                              rank === 3 && { backgroundColor: '#f97316', borderColor: '#f97316' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.topRankText,
                                rank <= 3 && { color: '#000', fontWeight: '900' },
                              ]}
                            >
                              #{rank}
                            </Text>
                          </View>
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
                  style={[
                    styles.tabChip,
                    activeTab === 'foryou' && [
                      styles.tabChipActive,
                      { backgroundColor: nowPlayingPalette.primary, shadowColor: nowPlayingPalette.primary },
                    ],
                  ]}
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
                  style={[
                    styles.tabChip,
                    activeTab === 'top' && [
                      styles.tabChipActive,
                      { backgroundColor: nowPlayingPalette.primary, shadowColor: nowPlayingPalette.primary },
                    ],
                  ]}
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
                  style={[
                    styles.tabChip,
                    activeTab === 'recent' && [
                      styles.tabChipActive,
                      { backgroundColor: nowPlayingPalette.primary, shadowColor: nowPlayingPalette.primary },
                    ],
                  ]}
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
                  style={[
                    styles.tabChip,
                    activeTab === 'all' && [
                      styles.tabChipActive,
                      { backgroundColor: nowPlayingPalette.primary, shadowColor: nowPlayingPalette.primary },
                    ],
                  ]}
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
                <View style={[styles.sectionDot, { backgroundColor: nowPlayingPalette.secondary }]} />
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
              <>
                {displayedSongs.map((song) => (
                  <MemoizedSongRow
                    key={song.id}
                    song={song}
                    isCurrent={String(currentSong?.id) === String(song.id)}
                    isPlaying={isPlaying}
                    onPress={() => handlePlaySongItem(song)}
                    onLongPress={() => openSongActions(song)}
                  />
                ))}

                {displayedSongs.length > 0 && songs.length > displayedSongs.length && (
                  <PressableFluid
                    onPress={handleGoToLibrary}
                    haptic="medium"
                    style={styles.exploreAllCard}
                    scaleTo={0.98}
                  >
                    <LinearGradient
                      colors={['rgba(127, 0, 255, 0.22)', 'rgba(0, 229, 255, 0.10)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.exploreAllInner}
                    >
                      <View style={styles.exploreAllTextWrap}>
                        <Text style={styles.exploreAllTitle}>Explorar toda tu colección</Text>
                        <Text style={styles.exploreAllSubtitle}>
                          {songs.length} pistas con filtros y búsqueda avanzada en Biblioteca
                        </Text>
                      </View>
                      <View style={styles.exploreAllCircle}>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                      </View>
                    </LinearGradient>
                  </PressableFluid>
                )}
              </>
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
    backgroundColor: 'transparent',
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
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    shadowColor: '#00E5FF',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    backgroundColor: 'rgba(10, 10, 20, 0.8)',
  },
  logoIcon: {
    width: '100%',
    height: '100%',
  },
  logoPulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.4)',
  },
  logoPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00E676',
  },
  logoPulseText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00E676',
    letterSpacing: 0.8,
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
  heroOuter: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 28,
    padding: 3,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  heroInnerCore: {
    borderRadius: 24.5,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0a0a14',
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    pointerEvents: 'none',
    zIndex: 2,
  },
  heroCoverDoubleBezel: {
    padding: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  bentoCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  bentoCardInner: {
    padding: 12,
    borderRadius: 19,
    minHeight: 94,
    justifyContent: 'space-between',
  },
  bentoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bentoIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 229, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
  },
  bentoPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  bentoPillText: {
    fontSize: 9,
    fontFamily: typography.labelSmall.fontFamily,
    color: '#00E5FF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bentoTitle: {
    fontSize: 14,
    fontFamily: typography.headlineSmall.fontFamily,
    color: colors.white,
    letterSpacing: -0.2,
  },
  bentoSubtitle: {
    fontSize: 11,
    fontFamily: typography.bodySmall.fontFamily,
    color: colors.textMuted,
    marginTop: 1,
  },
  exploreAllCard: {
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(127, 0, 255, 0.4)',
    overflow: 'hidden',
  },
  exploreAllInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  exploreAllTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  exploreAllTitle: {
    fontSize: 14,
    fontFamily: typography.headlineSmall.fontFamily,
    color: colors.white,
  },
  exploreAllSubtitle: {
    fontSize: 11,
    fontFamily: typography.bodySmall.fontFamily,
    color: colors.textMuted,
    marginTop: 2,
  },
  exploreAllCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(127, 0, 255, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
  topRankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 2,
  },
  topRankText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.white,
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