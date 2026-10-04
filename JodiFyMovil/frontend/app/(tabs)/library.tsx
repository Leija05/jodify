import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SongRow } from '@components/player/SongRow';
import { DynamicBackground } from '@components/player/DynamicBackground';
import { EmptyState } from '@components/ui/EmptyState';
import { PressableFluid } from '@components/ui/PressableFluid';
import type { LibraryTab, Song } from '@lib/types';
import { resolveArtist } from '@lib/utils';
import { deleteDownloadedSong } from '@services/downloads.service';
import { useDownloadStore } from '@stores/download.store';
import { useLibraryStore } from '@stores/library.store';
import { usePlayerStore } from '@stores/player.store';
import { useSettingsStore } from '@stores/settings.store';
import { useUiStore } from '@stores/ui.store';
import { colors, typography, gradients, radius } from '@theme';

const TABS: Array<{ id: LibraryTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'global', label: 'Global', icon: 'globe-outline' },
  { id: 'liked', label: 'Favoritas', icon: 'heart-outline' },
  { id: 'downloads', label: 'Descargadas', icon: 'cloud-download-outline' },
];

const ROW_HEIGHT = 80;
const ITEM_SPACING = 6;

export default function LibraryScreen() {
  const songs = useLibraryStore((s) => s.songs);
  const likedIds = useLibraryStore((s) => s.likedIds);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const tab = useLibraryStore((s) => s.tab);
  const search = useLibraryStore((s) => s.search);
  const setTab = useLibraryStore((s) => s.setTab);
  const setSearch = useLibraryStore((s) => s.setSearch);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const unmarkDownloaded = useLibraryStore((s) => s.unmarkDownloaded);
  const refresh = useLibraryStore((s) => s.refresh);
  const refreshing = useLibraryStore((s) => s.refreshing);

  const playSong = usePlayerStore((s) => s.playSong);
  const playNext = usePlayerStore((s) => s.playNext);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const user = useSettingsStore((s) => s.user);
  const openFullscreen = useUiStore((s) => s.openFullscreen);
  const openAuth = useUiStore((s) => s.openAuth);
  const openSongActions = useUiStore((s) => s.openSongActions);
  const openDownloadsModal = useUiStore((s) => s.openDownloadsModal);
  const activeDownloadsCount = useDownloadStore(
    (s) => Object.values(s.tasks).filter((t) => t.status === 'downloading' || t.status === 'pending').length
  );
  const [searchFocused, setSearchFocused] = useState(false);
  const searchGlowAnim = useRef(new Animated.Value(0)).current;
  const staggerAnim = useRef(new Animated.Value(0)).current;
  const tabUnderlineAnim = useRef(new Animated.Value(0)).current;
  const prevTabRef = useRef(tab);

  useEffect(() => {
    Animated.timing(staggerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (searchFocused) {
      Animated.spring(searchGlowAnim, { toValue: 1, useNativeDriver: false, tension: 60, friction: 8 }).start();
    } else {
      Animated.spring(searchGlowAnim, { toValue: 0, useNativeDriver: false, tension: 60, friction: 8 }).start();
    }
  }, [searchFocused, searchGlowAnim]);

  useEffect(() => {
    if (prevTabRef.current !== tab) {
      tabUnderlineAnim.setValue(0);
      Animated.spring(tabUnderlineAnim, { toValue: 1, useNativeDriver: false, tension: 50, friction: 8 }).start();
      prevTabRef.current = tab;
    }
  }, [tab, tabUnderlineAnim]);

  const [sortMode, setSortMode] = useState<'recent' | 'alpha' | 'artist'>('recent');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list: Song[];
    if (tab === 'liked') {
      const ids = new Set(likedIds.map((id) => String(id)));
      list = songs.filter((s) => ids.has(String(s.id)));
    } else if (tab === 'downloads') {
      const ids = new Set(downloadedIds.map((id) => String(id)));
      list = songs.filter((s) => ids.has(String(s.id)));
    } else {
      list = songs;
    }
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (resolveArtist(s) ?? '').toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    if (sortMode === 'alpha') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'artist') {
      sorted.sort((a, b) => (resolveArtist(a) || '').localeCompare(resolveArtist(b) || ''));
    } else {
      sorted.sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
    }
    return sorted;
  }, [songs, likedIds, downloadedIds, tab, search, sortMode]);

  const handlePlay = useCallback(
    (song: Song) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      playSong(song, filtered);
    },
    [playSong, filtered],
  );

  const handleDownload = useCallback(
    async (song: Song) => {
      const id = String(song.id);
      const isDownloaded = downloadedIds.some((d) => String(d) === id);
      if (isDownloaded) {
        await deleteDownloadedSong(song.id);
        unmarkDownloaded(song.id);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
      void useDownloadStore.getState().startDownload(song);
    },
    [downloadedIds, unmarkDownloaded],
  );

  const handleLike = useCallback(
    async (song: Song) => {
      if (!user) {
        openAuth();
        return;
      }
      const ok = await toggleLike(song);
      void Haptics.impactAsync(ok ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    },
    [user, toggleLike, openAuth],
  );

  const handleAddToQueue = useCallback(
    (song: Song) => {
      addToQueue(song);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [addToQueue],
  );

  const handlePlayNext = useCallback(
    (song: Song) => {
      playNext(song);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [playNext],
  );

  const handleOpenFullscreen = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openFullscreen();
  }, [openFullscreen]);

  const isLiked = useCallback(
    (songId: number | string) => likedIds.some((l) => String(l) === String(songId)),
    [likedIds],
  );

  const getItemLayout = useCallback((_data: unknown, index: number) => ({
    length: ROW_HEIGHT + ITEM_SPACING,
    offset: index * (ROW_HEIGHT + ITEM_SPACING),
    index,
  }), []);

  const keyExtractor = useCallback((item: Song) => String(item.id), []);

  const handleShuffleAll = useCallback(() => {
    if (filtered.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const firstSong = shuffled[0];
    if (firstSong) {
      playSong(firstSong, shuffled);
    }
  }, [filtered, playSong]);

  const renderItem = useCallback(({ item }: { item: Song }) => {
    const id = String(item.id);
    const isDownloading = useDownloadStore.getState().isDownloading(item.id);
    const isCurrent = String(currentSong?.id) === id;
    const liked = isLiked(item.id);
    return (
      <Animated.View style={[styles.listItem, { opacity: staggerAnim }]}>
        <SongRow
          song={item}
          isCurrent={isCurrent}
          isPlaying={isPlaying && isCurrent}
          onPress={() => handlePlay(item)}
          onLike={() => (user ? void handleLike(item) : openAuth())}
          onUnlike={() => (user ? void handleLike(item) : openAuth())}
          liked={liked}
          onDownload={() => void handleDownload(item)}
          downloaded={downloadedIds.some((d) => String(d) === id)}
          onAddToQueue={() => handleAddToQueue(item)}
          onPlayNext={() => handlePlayNext(item)}
          onLongPress={() => openSongActions(item)}
          right={
            isDownloading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : undefined
          }
        />
      </Animated.View>
    );
  }, [
    currentSong?.id,
    isPlaying,
    downloadedIds,
    likedIds,
    user,
    handlePlay,
    handleLike,
    handleDownload,
    handleAddToQueue,
    handlePlayNext,
    openSongActions,
    isLiked,
  ]);

  return (
    <View style={styles.container}>
      <DynamicBackground song={currentSong} intensity={0.8} />
      <View style={styles.fixedHeader}>
        <View style={styles.topBarRow}>
          <View>
            <Text style={styles.screenHeading}>Tu Biblioteca</Text>
            <Text style={styles.screenSubheading}>
              {filtered.length} canciones · {tab === 'liked' ? 'Favoritas' : tab === 'downloads' ? 'Offline' : 'Global'}
            </Text>
          </View>
          <PressableFluid
            onPress={handleShuffleAll}
            haptic="medium"
            style={styles.shuffleAllBtn}
          >
            <LinearGradient
              colors={['#7F00FF', '#00E5FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shuffleAllGradient}
            >
              <Ionicons name="shuffle" size={16} color={colors.white} />
              <Text style={styles.shuffleAllText}>Aleatorio</Text>
            </LinearGradient>
          </PressableFluid>
        </View>

        <Animated.View style={[
          styles.searchWrap,
          {
            shadowColor: colors.primary,
            shadowOpacity: searchGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }),
            shadowRadius: searchGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }),
            elevation: searchGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }),
            borderColor: searchGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.primaryStrong] }),
          }
        ]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar canciones o artistas…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {search.length > 0 && (
            <PressableFluid onPress={() => setSearch('')} style={styles.clearBtn} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </PressableFluid>
          )}
          {currentSong && (
            <PressableFluid onPress={handleOpenFullscreen} haptic="light" style={styles.expandBtn} hitSlop={8}>
              <Ionicons name="expand" size={20} color={colors.primary} />
            </PressableFluid>
          )}
        </Animated.View>

        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = tab === t.id;
            const count = t.id === 'liked' ? likedIds.length : t.id === 'downloads' ? downloadedIds.length : songs.length;
            return (
              <PressableFluid
                key={t.id}
                onPress={() => setTab(t.id)}
                style={styles.tabPress}
                scaleTo={0.97}
                hitSlop={8}
              >
                {active ? (
                  <LinearGradient
                    colors={[gradients.primary[0], gradients.play[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.tab, styles.tabActive]}
                  >
                    <Ionicons name={t.icon} size={15} color={colors.white} />
                    <Text style={[styles.tabText, styles.tabTextActive]}>{t.label} ({count})</Text>
                    <Animated.View style={[
                      styles.tabUnderline,
                      {
                        width: tabUnderlineAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        opacity: tabUnderlineAnim,
                      }
                    ]} />
                  </LinearGradient>
                ) : (
                  <View style={styles.tab}>
                    <Ionicons name={t.icon} size={15} color={colors.textMuted} />
                    <Text style={styles.tabText}>{t.label} ({count})</Text>
                  </View>
                )}
              </PressableFluid>
            );
          })}
        </View>

        {tab === 'downloads' && (
          <PressableFluid
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              openDownloadsModal();
            }}
            haptic="light"
            style={styles.manageDownloadsBtn}
          >
            <View style={styles.manageDownloadsLeft}>
              <Ionicons name="cloud-download" size={16} color={colors.secondary} />
              <Text style={styles.manageDownloadsText}>
                {activeDownloadsCount > 0
                  ? `Descargando (${activeDownloadsCount}) · Ver progreso real`
                  : 'Ver gestor de descargas y reintentos'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={colors.secondary} />
          </PressableFluid>
        )}

        {/* Quick Sorting Pills */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>ORDEN:</Text>
          <PressableFluid
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSortMode('recent');
            }}
            haptic="light"
            style={[styles.sortPill, sortMode === 'recent' && styles.sortPillActive]}
          >
            <Ionicons
              name="sparkles"
              size={12}
              color={sortMode === 'recent' ? colors.secondary : colors.textMuted}
            />
            <Text style={[styles.sortPillText, sortMode === 'recent' && styles.sortPillTextActive]}>
              Recientes
            </Text>
          </PressableFluid>

          <PressableFluid
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSortMode('alpha');
            }}
            haptic="light"
            style={[styles.sortPill, sortMode === 'alpha' && styles.sortPillActive]}
          >
            <Ionicons
              name="text"
              size={12}
              color={sortMode === 'alpha' ? colors.secondary : colors.textMuted}
            />
            <Text style={[styles.sortPillText, sortMode === 'alpha' && styles.sortPillTextActive]}>
              A-Z
            </Text>
          </PressableFluid>

          <PressableFluid
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSortMode('artist');
            }}
            haptic="light"
            style={[styles.sortPill, sortMode === 'artist' && styles.sortPillActive]}
          >
            <Ionicons
              name="person"
              size={12}
              color={sortMode === 'artist' ? colors.secondary : colors.textMuted}
            />
            <Text style={[styles.sortPillText, sortMode === 'artist' && styles.sortPillTextActive]}>
              Artista
            </Text>
          </PressableFluid>
        </View>

        <View style={styles.hintRow}>
          <Ionicons name="arrow-forward" size={12} color={colors.secondary} />
          <Text style={styles.hintText}>Desliza a la derecha para favorita · Mantén pulsado para acciones</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        style={styles.list}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={10}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surfaceSolid}
          />
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            icon={tab === 'liked' ? 'heart-outline' : tab === 'downloads' ? 'cloud-download-outline' : 'musical-notes-outline'}
            title={tab === 'liked' ? 'Sin favoritas' : tab === 'downloads' ? 'Sin descargas' : search ? 'Sin resultados' : 'Biblioteca vacía'}
            subtitle={
              tab === 'liked'
                ? user
                  ? 'Dale like a las canciones que te encantan (desliza a la derecha).'
                  : 'Inicia sesión para guardar tus favoritas.'
                : tab === 'downloads'
                  ? 'Descarga canciones para escucharlas sin conexión.'
                  : search
                    ? 'Prueba con otro nombre o artista.'
                    : 'El servidor no tiene canciones todavía.'
            }
            action={tab === 'liked' && !user ? { label: 'Iniciar sesión', onPress: openAuth } : undefined}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05050A',
  },
  fixedHeader: {
    backgroundColor: 'transparent',
    zIndex: 10,
    paddingTop: 12,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sortLabel: {
    color: colors.textMuted,
    fontFamily: typography.monoSmall.fontFamily,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sortPillActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.14)',
    borderColor: 'rgba(0, 229, 255, 0.4)',
  },
  sortPillText: {
    color: colors.textMuted,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 11,
    fontWeight: '600',
  },
  sortPillTextActive: {
    color: colors.secondary,
    fontWeight: '700',
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  screenHeading: {
    color: colors.text,
    fontFamily: typography.displayMedium.fontFamily,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubheading: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
    marginTop: 2,
  },
  shuffleAllBtn: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  shuffleAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  shuffleAllText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 12,
    fontWeight: '700',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    lineHeight: typography.bodyMedium.lineHeight,
    padding: 0,
  },
  clearBtn: {
    padding: 2,
  },
  expandBtn: {
    padding: 2,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    height: 48,
  },
  tabPress: {
    flex: 1,
    height: 48,
  },
  tab: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  tabText: {
    color: colors.textMuted,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
    lineHeight: typography.labelMedium.lineHeight,
  },
  tabTextActive: {
    color: colors.white,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 4,
    left: '12%',
    right: '12%',
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: colors.white,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 6,
    marginBottom: 6,
  },
  hintText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    lineHeight: typography.bodySmall.lineHeight,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 220,
    paddingTop: 4,
  },
  listItem: {
    marginHorizontal: 12,
    alignSelf: 'stretch',
  },
  manageDownloadsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  manageDownloadsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  manageDownloadsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
});