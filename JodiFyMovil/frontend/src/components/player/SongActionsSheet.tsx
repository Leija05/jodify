import { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FluidSheet } from '@components/ui/FluidSheet';
import { PressableFluid } from '@components/ui/PressableFluid';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, radius } from '@theme';
import { pickCoverUrl, resolveArtist } from '@lib/utils';
import { usePlayerStore } from '@stores/player.store';
import { useLibraryStore } from '@stores/library.store';
import { useUiStore } from '@stores/ui.store';
import { useToastStore } from '@stores/toast.store';
import { downloadSong, deleteDownloadedSong } from '@services/downloads.service';

export function SongActionsSheet() {
  const song = useUiStore((s) => s.songActionsSong);
  const visible = useUiStore((s) => s.songActionsOpen);
  const close = useUiStore((s) => s.closeSongActions);

  const songs = useLibraryStore((s) => s.songs);
  const likedIds = useLibraryStore((s) => s.likedIds);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const markDownloaded = useLibraryStore((s) => s.markDownloaded);
  const unmarkDownloaded = useLibraryStore((s) => s.unmarkDownloaded);

  const playSong = usePlayerStore((s) => s.playSong);
  const playNext = usePlayerStore((s) => s.playNext);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const openLyricsModal = useUiStore((s) => s.openLyricsModal);
  const openEqualizer = useUiStore((s) => s.openEqualizer);
  const showToast = useToastStore((s) => s.show);

  const isLiked = useMemo(() => {
    if (!song) return false;
    return likedIds.some((id) => String(id) === String(song.id));
  }, [song, likedIds]);

  const isDownloaded = useMemo(() => {
    if (!song) return false;
    return downloadedIds.some((id) => String(id) === String(song.id));
  }, [song, downloadedIds]);

  if (!song) return null;

  const coverUrl = pickCoverUrl(song);
  const artist = resolveArtist(song) ?? 'Artista Desconocido';

  const handlePlayNow = () => {
    playSong(song, songs);
    close();
  };

  const handlePlayNext = () => {
    playNext(song);
    showToast('Se reproducirá a continuación', 'info');
    close();
  };

  const handleAddToQueue = () => {
    addToQueue(song);
    showToast('Añadida a la cola', 'success');
    close();
  };

  const handleToggleLike = async () => {
    const ok = await toggleLike(song);
    if (!ok) {
      showToast('Inicia sesión para guardar favoritas', 'info');
    } else {
      showToast(isLiked ? 'Eliminada de favoritas' : 'Añadida a favoritas', 'success');
    }
    close();
  };

  const handleToggleDownload = async () => {
    if (isDownloaded) {
      await deleteDownloadedSong(song.id);
      unmarkDownloaded(song.id);
      showToast('Descarga eliminada', 'info');
    } else {
      showToast('Descargando canción…', 'info');
      try {
        const record = await downloadSong(song);
        markDownloaded(song.id, record.localUri);
        showToast('Descarga completada', 'success');
      } catch (err: any) {
        showToast(err?.message ?? 'Error al descargar', 'error');
      }
    }
    close();
  };

  const handleOpenLyrics = () => {
    close();
    setTimeout(() => {
      openLyricsModal();
    }, 200);
  };

  const handleOpenEqualizer = () => {
    close();
    setTimeout(() => {
      openEqualizer();
    }, 200);
  };

  return (
    <FluidSheet
      visible={visible}
      onClose={close}
      snapPoints={[0.62]}
      dismissThreshold={80}
    >
      <View style={styles.container}>
        {/* Header Preview */}
        <View style={styles.header}>
          <View style={styles.coverWrapper}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.coverImg} resizeMode="cover" />
            ) : (
              <LinearGradient colors={['#7F00FF', '#00E5FF']} style={styles.coverPlaceholder}>
                <Ionicons name="musical-notes" size={24} color={colors.white} />
              </LinearGradient>
            )}
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.title} numberOfLines={1}>{song.name}</Text>
            <Text style={styles.artist} numberOfLines={1}>{artist}</Text>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Action Items List */}
        <View style={styles.actionsList}>
          <PressableFluid onPress={handlePlayNow} haptic="medium" style={styles.actionRow}>
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(127, 0, 255, 0.15)' }]}>
              <Ionicons name="play" size={20} color="#7F00FF" />
            </View>
            <Text style={styles.actionText}>Reproducir ahora</Text>
          </PressableFluid>

          <PressableFluid onPress={handlePlayNext} haptic="light" style={styles.actionRow}>
            <View style={styles.actionIconBox}>
              <Ionicons name="play-skip-forward-outline" size={20} color={colors.textSecondary} />
            </View>
            <Text style={styles.actionText}>Reproducir a continuación</Text>
          </PressableFluid>

          <PressableFluid onPress={handleAddToQueue} haptic="light" style={styles.actionRow}>
            <View style={styles.actionIconBox}>
              <Ionicons name="list-outline" size={20} color={colors.textSecondary} />
            </View>
            <Text style={styles.actionText}>Añadir a la cola</Text>
          </PressableFluid>

          <PressableFluid onPress={handleToggleLike} haptic="light" style={styles.actionRow}>
            <View style={styles.actionIconBox}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={isLiked ? colors.accent : colors.textSecondary}
              />
            </View>
            <Text style={styles.actionText}>
              {isLiked ? 'Quitar de favoritas' : 'Añadir a favoritas'}
            </Text>
          </PressableFluid>

          <PressableFluid onPress={handleToggleDownload} haptic="light" style={styles.actionRow}>
            <View style={styles.actionIconBox}>
              <Ionicons
                name={isDownloaded ? 'trash-outline' : 'cloud-download-outline'}
                size={20}
                color={isDownloaded ? colors.error : colors.textSecondary}
              />
            </View>
            <Text style={[styles.actionText, isDownloaded && { color: colors.error }]}>
              {isDownloaded ? 'Eliminar descarga' : 'Descargar para escuchar offline'}
            </Text>
          </PressableFluid>

          <PressableFluid onPress={handleOpenLyrics} haptic="light" style={styles.actionRow}>
            <View style={styles.actionIconBox}>
              <Ionicons name="mic-outline" size={20} color={colors.textSecondary} />
            </View>
            <Text style={styles.actionText}>Ver letra sincronizada</Text>
          </PressableFluid>

          <PressableFluid onPress={handleOpenEqualizer} haptic="light" style={styles.actionRow}>
            <View style={styles.actionIconBox}>
              <Ionicons name="options-outline" size={20} color={colors.secondary} />
            </View>
            <Text style={styles.actionText}>Abrir ecualizador</Text>
          </PressableFluid>
        </View>
      </View>
    </FluidSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  coverWrapper: {
    width: 54,
    height: 54,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: '#12121c',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.white,
    fontFamily: typography.headlineLarge.fontFamily,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  artist: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 13,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 10,
  },
  actionsList: {
    gap: 4,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionText: {
    color: colors.text,
    fontFamily: typography.bodyLarge.fontFamily,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});
