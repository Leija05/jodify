import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SongRow } from '../components/player/SongRow';
import { EmptyState } from '../components/ui/EmptyState';
import { PressableScale } from '../components/ui/PressableScale';
import type { LibraryTab, Song } from '../lib/types';
import { resolveArtist } from '../lib/utils';
import { downloadSong, deleteDownloadedSong } from '../services/downloads.service';
import { useLibraryStore } from '../store/library.store';
import { usePlayerStore } from '../store/player.store';
import { useSettingsStore } from '../store/settings.store';
import { useUiStore } from '../store/ui.store';
import { colors, fonts, gradients, radius } from '../theme';

const TABS: Array<{ id: LibraryTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'global', label: 'Global', icon: 'globe-outline' },
  { id: 'liked', label: 'Favoritas', icon: 'heart-outline' },
  { id: 'downloads', label: 'Descargadas', icon: 'cloud-download-outline' },
];

export function LibraryScreen() {
  const { songs, likedIds, downloadedIds, tab, search, setTab, setSearch, toggleLike, markDownloaded, unmarkDownloaded, refresh, refreshing } =
    useLibraryStore();
  const { playSong, playNext, addToQueue, currentSong, isPlaying, queue } = usePlayerStore();
  const user = useSettingsStore((s) => s.user);
  const openFullscreen = useUiStore((s) => s.openFullscreen);
  const openAuth = useUiStore((s) => s.openAuth);
  const openSongActions = useUiStore((s) => s.openSongActions);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const downloadingRef = useRef<Record<string, boolean>>({});

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

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar canciones o artistas…"
          placeholderTextColor={colors.textDim}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <PressableScale onPress={() => setSearch('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </PressableScale>
        )}
        {currentSong && (
          <PressableScale onPress={handleOpenFullscreen} haptic style={styles.expandBtn}>
            <Ionicons name="expand" size={18} color={colors.primary} />
          </PressableScale>
        )}
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <PressableScale key={t.id} onPress={() => setTab(t.id)} style={styles.tabPress} scaleTo={0.96}>
              {active ? (
                <LinearGradient
                  colors={[gradients.primary[0], gradients.play[1]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.tab, styles.tabActive]}
                >
                  <Ionicons name={t.icon} size={15} color={colors.white} />
                  <Text style={[styles.tabText, styles.tabTextActive]}>{t.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.tab}>
                  <Ionicons name={t.icon} size={15} color={colors.textMuted} />
                  <Text style={styles.tabText}>{t.label}</Text>
                </View>
              )}
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.hintRow}>
        <Ionicons name="arrow-back" size={11} color={colors.textDim} />
        <Text style={styles.hintText}>Desliza para favoritas · izq. para cola · mantén para más</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surfaceSolid} />}
        renderItem={({ item }) => {
          const id = String(item.id);
          const isDownloading = downloading[id];
          const isCurrent = String(currentSong?.id) === id;
          const liked = isLiked(item.id);
          return (
            <View>
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
            </View>
          );
        }}
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
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
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
    marginTop: 14,
    marginBottom: 4,
  },
  tabPress: {
    flex: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  tabText: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
  },
  tabTextActive: {
    color: colors.white,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 22,
    paddingVertical: 6,
  },
  hintText: {
    flex: 1,
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 10.5,
  },
  listContent: {
    paddingBottom: 200,
    paddingTop: 4,
  },
});