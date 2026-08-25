import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SongRow } from '../components/player/SongRow';
import { EmptyState } from '../components/ui/EmptyState';
import { PressableFluid } from '../components/ui/PressableFluid';
import type { LibraryTab, Song } from '../lib/types';
import { resolveArtist } from '../lib/utils';
import { downloadSong, deleteDownloadedSong } from '../services/downloads.service';
import { useLibraryStore } from '../store/library.store';
import { usePlayerStore } from '../store/player.store';
import { useSettingsStore } from '../store/settings.store';
import { useUiStore } from '../store/ui.store';
import { colors, typography, gradients, radius, touch } from '../theme';

const TABS: Array<{ id: LibraryTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'global', label: 'Global', icon: 'globe-outline' },
  { id: 'liked', label: 'Favoritas', icon: 'heart-outline' },
  { id: 'downloads', label: 'Descargadas', icon: 'cloud-download-outline' },
];

const ROW_HEIGHT = 80;
const ITEM_SPACING = 6;

export function LibraryScreen() {
  const { songs, likedIds, downloadedIds, tab, search, setTab, setSearch, toggleLike, markDownloaded, unmarkDownloaded, refresh, refreshing } =
    useLibraryStore();
  const { playSong, playNext, addToQueue, currentSong, isPlaying } = usePlayerStore();
  const user = useSettingsStore((s) => s.user);
  const openFullscreen = useUiStore((s) => s.openFullscreen);
  const openAuth = useUiStore((s) => s.openAuth);
  const openSongActions = useUiStore((s) => s.openSongActions);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const downloadingRef = useRef<Record<string, boolean>>({});
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
    return [...list].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [songs, likedIds, downloadedIds, tab, search]);

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
      if (downloadingRef.current[id]) return;
      downloadingRef.current[id] = true;
      try {
        const isDownloaded = downloadedIds.some((d) => String(d) === id);
        if (isDownloaded) {
          await deleteDownloadedSong(song.id);
          unmarkDownloaded(song.id);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }
        setDownloading((p) => ({ ...p, [id]: true }));
        const record = await downloadSong(song);
        markDownloaded(record.id, record.localUri);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        downloadingRef.current[id] = false;
        setDownloading((p) => {
          const next = { ...p };
          delete next[id];
          return next;
        });
      }
    },
    [downloadedIds, markDownloaded, unmarkDownloaded],
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

  const renderItem = useCallback(({ item }: { item: Song }) => {
    const id = String(item.id);
    const isDownloading = downloading[id];
    const isCurrent = String(currentSong?.id) === id;
    const liked = isLiked(item.id);
    return (
      <Animated.View style={[styles.listItem, { opacity: staggerAnim }]}>
        <SongRow
          song={item}
          isCurrent={isCurrent}
          isPlaying={isPlaying && isCurrent}
          onPress={() => handlePlay(item)}
          onLike={user ? () => void handleLike(item) : undefined}
          onUnlike={user && liked ? () => void handleLike(item) : undefined}
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
    downloading,
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
                  <Ionicons name={t.icon} size={16} color={colors.white} />
                  <Text style={[styles.tabText, styles.tabTextActive]}>{t.label}</Text>
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
                  <Ionicons name={t.icon} size={16} color={colors.textMuted} />
                  <Text style={styles.tabText}>{t.label}</Text>
                </View>
              )}
            </PressableFluid>
          );
        })}
      </View>

      <View style={styles.hintRow}>
        <Ionicons name="arrow-back" size={12} color={colors.textMuted} />
        <Text style={styles.hintText}>Desliza para favoritas · izq. para cola · mantén para más</Text>
      </View>

      <FlatList
        data={filtered}
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
    backgroundColor: colors.background,
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
  },
  tabPress: {
    flex: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: touch.comfortable,
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
    paddingVertical: 8,
  },
  hintText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    lineHeight: typography.bodySmall.lineHeight,
  },
  listContent: {
    paddingBottom: 220,
    paddingTop: 6,
  },
  listItem: {
    marginHorizontal: 12,
  },
});