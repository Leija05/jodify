import { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableFluid } from '@components/ui/PressableFluid';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, radius } from '@theme';
import { pickCoverUrl, resolveArtist } from '@lib/utils';
import { usePlayerStore } from '@stores/player.store';
import { useLibraryStore } from '@stores/library.store';
import { useUiStore } from '@stores/ui.store';
import { useToastStore } from '@stores/toast.store';
import { downloadSong, deleteDownloadedSong } from '@services/downloads.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      translateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
    }
  }, [visible, translateY, backdropOpacity]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      close();
    });
  };

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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playSong(song, songs);
    handleDismiss();
  };

  const handlePlayNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playNext(song);
    showToast('Se reproducirá a continuación', 'info');
    handleDismiss();
  };

  const handleAddToQueue = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addToQueue(song);
    showToast('Añadida a la cola', 'success');
    handleDismiss();
  };

  const handleToggleLike = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await toggleLike(song);
    if (!ok) {
      showToast('Inicia sesión para guardar favoritas', 'info');
    } else {
      showToast(isLiked ? 'Eliminada de favoritas' : 'Añadida a favoritas', 'success');
    }
    handleDismiss();
  };

  const handleToggleDownload = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    handleDismiss();
  };

  const handleOpenLyrics = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleDismiss();
    setTimeout(() => {
      openLyricsModal();
    }, 150);
  };

  const handleOpenEqualizer = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleDismiss();
    setTimeout(() => {
      openEqualizer();
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop Tap to close */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        {/* Bottom Sheet Card */}
        <Animated.View
          style={[
            styles.sheetCard,
            {
              transform: [{ translateY }],
              paddingBottom: Math.max(insets.bottom + 16, 28),
            },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14, 14, 22, 0.98)' }]} />
          )}

          {/* Handle bar */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Song Header Preview */}
          <View style={styles.header}>
            <View style={styles.coverWrapper}>
              {coverUrl ? (
                <Image source={{ uri: coverUrl }} style={styles.coverImg} resizeMode="cover" />
              ) : (
                <LinearGradient colors={['#7F00FF', '#00E5FF']} style={styles.coverPlaceholder}>
                  <Ionicons name="musical-notes" size={26} color={colors.white} />
                </LinearGradient>
              )}
            </View>
            <View style={styles.headerMeta}>
              <View style={styles.badgeRow}>
                <Text style={styles.badgeText}>HQ AUDIO</Text>
              </View>
              <Text style={styles.title} numberOfLines={1}>{song.name}</Text>
              <Text style={styles.artist} numberOfLines={1}>{artist}</Text>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Action Items List */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.actionsList}
            showsVerticalScrollIndicator={false}
          >
            <PressableFluid onPress={handlePlayNow} haptic="medium" style={styles.actionRow}>
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(127, 0, 255, 0.2)' }]}>
                <Ionicons name="play" size={20} color="#00E5FF" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionText}>Reproducir ahora</Text>
                <Text style={styles.actionSubtext}>Comenzar reproducción inmediata</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </PressableFluid>

            <PressableFluid onPress={handlePlayNext} haptic="light" style={styles.actionRow}>
              <View style={styles.actionIconBox}>
                <Ionicons name="play-skip-forward-outline" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionText}>Reproducir a continuación</Text>
                <Text style={styles.actionSubtext}>Añadir después de la canción actual</Text>
              </View>
            </PressableFluid>

            <PressableFluid onPress={handleAddToQueue} haptic="light" style={styles.actionRow}>
              <View style={styles.actionIconBox}>
                <Ionicons name="list-outline" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionText}>Añadir a la cola</Text>
                <Text style={styles.actionSubtext}>Poner al final de la lista</Text>
              </View>
            </PressableFluid>

            <PressableFluid onPress={handleToggleLike} haptic="light" style={styles.actionRow}>
              <View style={[styles.actionIconBox, isLiked && { backgroundColor: 'rgba(255, 0, 85, 0.2)' }]}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isLiked ? '#FF0055' : colors.textSecondary}
                />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionText, isLiked && { color: '#FF0055' }]}>
                  {isLiked ? 'Quitar de favoritas' : 'Añadir a favoritas'}
                </Text>
                <Text style={styles.actionSubtext}>
                  {isLiked ? 'Guardada en tu colección personal' : 'Guardar en tus canciones destacadas'}
                </Text>
              </View>
            </PressableFluid>

            <PressableFluid onPress={handleToggleDownload} haptic="light" style={styles.actionRow}>
              <View style={[styles.actionIconBox, isDownloaded && { backgroundColor: 'rgba(0, 230, 118, 0.15)' }]}>
                <Ionicons
                  name={isDownloaded ? 'cloud-done' : 'cloud-download-outline'}
                  size={20}
                  color={isDownloaded ? colors.success : colors.textSecondary}
                />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionText, isDownloaded && { color: colors.success }]}>
                  {isDownloaded ? 'Eliminar descarga' : 'Descargar canción'}
                </Text>
                <Text style={styles.actionSubtext}>
                  {isDownloaded ? 'Disponible sin conexión a internet' : 'Guardar copia local para escuchar offline'}
                </Text>
              </View>
            </PressableFluid>

            <View style={styles.doubleActionsRow}>
              <PressableFluid onPress={handleOpenLyrics} haptic="light" style={styles.halfActionCard}>
                <Ionicons name="musical-notes-outline" size={20} color={colors.secondary} />
                <Text style={styles.halfActionText}>Ver Letra</Text>
              </PressableFluid>

              <PressableFluid onPress={handleOpenEqualizer} haptic="light" style={styles.halfActionCard}>
                <Ionicons name="options-outline" size={20} color={colors.primary} />
                <Text style={styles.halfActionText}>Ecualizador</Text>
              </PressableFluid>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 10, 0.75)',
  },
  sheetCard: {
    maxHeight: '88%',
    backgroundColor: 'rgba(18, 18, 28, 0.95)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  scrollList: {
    maxHeight: SCREEN_HEIGHT * 0.58,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  coverWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: '#0a0a12',
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
    gap: 4,
  },
  badgeRow: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
  },
  badgeText: {
    color: '#00E5FF',
    fontFamily: typography.monoSmall.fontFamily,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 16,
    fontWeight: '700',
  },
  artist: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 13,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    marginVertical: 12,
  },
  actionsList: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
    gap: 2,
  },
  actionText: {
    color: colors.text,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 14,
    fontWeight: '600',
  },
  actionSubtext: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
  },
  doubleActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  halfActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  halfActionText: {
    color: colors.text,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 13,
    fontWeight: '600',
  },
});
