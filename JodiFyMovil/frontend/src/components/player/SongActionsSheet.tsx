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
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableFluid } from '@components/ui/PressableFluid';
import { LinearGradient } from 'expo-linear-gradient';
import { EqualizerBars } from '@components/ui/EqualizerBars';
import * as Haptics from 'expo-haptics';
import { colors, typography, radius } from '@theme';
import { pickCoverUrl, resolveArtist, resolveSongTitle, isSongLiked } from '@lib/utils';
import { getSongPalette } from '@lib/palette';
import { API_HOST } from '@lib/constants';
import { usePlayerStore } from '@stores/player.store';
import { useLibraryStore } from '@stores/library.store';
import { useUiStore } from '@stores/ui.store';
import { useToastStore } from '@stores/toast.store';
import { useDownloadStore } from '@stores/download.store';
import { deleteDownloadedSong } from '@services/downloads.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function SongActionsSheet() {
  const song = useUiStore((s) => s.songActionsSong);
  const visible = useUiStore((s) => s.songActionsOpen);
  const close = useUiStore((s) => s.closeSongActions);

  const songs = useLibraryStore((s) => s.songs);
  const likedIds = useLibraryStore((s) => s.likedIds);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const unmarkDownloaded = useLibraryStore((s) => s.unmarkDownloaded);

  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playSong = usePlayerStore((s) => s.playSong);
  const playNext = usePlayerStore((s) => s.playNext);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const openLyricsModal = useUiStore((s) => s.openLyricsModal);
  const openEqualizer = useUiStore((s) => s.openEqualizer);
  const openDownloadsModal = useUiStore((s) => s.openDownloadsModal);
  const showToast = useToastStore((s) => s.show);
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 24,
          stiffness: 240,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
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
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      close();
    });
  };

  const isLiked = useMemo(() => {
    if (!song) return false;
    return isSongLiked(song, new Set(likedIds.map(String)));
  }, [song, likedIds]);

  const isDownloaded = useMemo(() => {
    if (!song) return false;
    return downloadedIds.some((id) => String(id) === String(song.id));
  }, [song, downloadedIds]);

  const isCurrent = useMemo(() => {
    if (!song || !currentSong) return false;
    return String(song.id) === String(currentSong.id);
  }, [song, currentSong]);

  const palette = useMemo(() => getSongPalette(song), [song]);

  if (!song) return null;

  const coverUrl = pickCoverUrl(song);
  const artist = resolveArtist(song);
  const title = resolveSongTitle(song);

  const handlePlayNow = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playSong(song, songs);
    showToast(`Reproduciendo «${title}»`, 'info');
    handleDismiss();
  };

  const handlePlayNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playNext(song);
    showToast(`«${title}» sonará a continuación`, 'info');
    handleDismiss();
  };

  const handleAddToQueue = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addToQueue(song);
    showToast(`«${title}» añadida al final de la cola`, 'success');
    handleDismiss();
  };

  const handleStartRadio = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const allSongs = useLibraryStore.getState().songs;
    const radio = [song, ...allSongs.filter((s) => String(s.id) !== String(song.id)).slice(0, 30)];
    playQueue(radio, 0);
    showToast(`Radio iniciada con base en «${title}»`, 'info');
    handleDismiss();
  };

  const handleToggleLike = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await toggleLike(song);
    if (!ok) {
      showToast('Inicia sesión para guardar favoritas', 'info');
    } else {
      showToast(isLiked ? 'Eliminada de tus favoritas' : 'Añadida a tus favoritas', 'success');
    }
    handleDismiss();
  };

  const handleToggleDownload = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleDismiss();
    if (isDownloaded) {
      await deleteDownloadedSong(song.id);
      unmarkDownloaded(song.id);
      showToast('Descarga local eliminada', 'info');
    } else {
      setTimeout(() => {
        void useDownloadStore.getState().startDownload(song, true);
      }, 150);
    }
  };

  const handleOpenDownloads = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleDismiss();
    setTimeout(() => {
      openDownloadsModal();
    }, 150);
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

  const handleShare = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleDismiss();
    try {
      const shareUrl = song.url || `${API_HOST}/api/songs/${song.id}/audio`;
      await Share.share({
        title: `${title} - ${artist}`,
        message: `Escucha «${title}» de ${artist} en JodiFy:\n${shareUrl}`,
      });
    } catch {
      // Ignored
    }
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
              paddingBottom: Math.max(insets.bottom + 14, 26),
            },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={65} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12, 12, 20, 0.98)' }]} />
          )}

          {/* Dynamic Ambient Top Bloom */}
          <LinearGradient
            colors={[
              palette.primary + '38',
              palette.secondary + '18',
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.8 }}
            style={styles.ambientGlow}
            pointerEvents="none"
          />

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
                <LinearGradient colors={[palette.primary, palette.secondary]} style={styles.coverPlaceholder}>
                  <Ionicons name="musical-notes" size={26} color={colors.white} />
                </LinearGradient>
              )}
            </View>
            <View style={styles.headerMeta}>
              <View style={styles.badgeRow}>
                {isCurrent && isPlaying ? (
                  <View style={styles.playingBadge}>
                    <EqualizerBars playing bars={3} height={10} barWidth={2} color="#00FF88" />
                    <Text style={styles.playingBadgeText}>EN REPRODUCCIÓN</Text>
                  </View>
                ) : (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>HI-RES AUDIO</Text>
                  </View>
                )}
                {isDownloaded && (
                  <View style={styles.offlineBadge}>
                    <Ionicons name="cloud-done" size={11} color={colors.success} />
                    <Text style={styles.offlineBadgeText}>MODO OFFLINE</Text>
                  </View>
                )}
                {isLiked && (
                  <View style={styles.likedBadge}>
                    <Ionicons name="heart" size={10} color="#FF0055" />
                    <Text style={styles.likedBadgeText}>FAVORITA</Text>
                  </View>
                )}
              </View>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              <Text style={styles.artist} numberOfLines={1}>{artist}</Text>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Action Items List with Categorized Sections & Descriptions */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.actionsList}
            showsVerticalScrollIndicator={false}
          >
            {/* SECCIÓN 1: REPRODUCCIÓN & COLA */}
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="play-circle-outline" size={14} color={colors.secondary} />
              <Text style={styles.sectionHeaderText}>REPRODUCCIÓN & COLA</Text>
            </View>

            <PressableFluid onPress={handlePlayNow} haptic="medium" style={styles.actionRow}>
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(0, 229, 255, 0.16)' }]}>
                <Ionicons name="play" size={20} color="#00E5FF" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionText}>Reproducir ahora</Text>
                <Text style={styles.actionSubtext}>Inicia esta canción de inmediato en alta fidelidad</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.28)" />
            </PressableFluid>

            <PressableFluid onPress={handlePlayNext} haptic="light" style={styles.actionRow}>
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(127, 0, 255, 0.16)' }]}>
                <Ionicons name="play-skip-forward" size={19} color="#B388FF" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionText}>Reproducir a continuación</Text>
                <Text style={styles.actionSubtext}>Coloca el tema como el siguiente en sonar en tu cola</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.28)" />
            </PressableFluid>

            <PressableFluid onPress={handleAddToQueue} haptic="light" style={styles.actionRow}>
              <View style={styles.actionIconBox}>
                <Ionicons name="list" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionText}>Añadir al final de la cola</Text>
                <Text style={styles.actionSubtext}>Se sumará al final de la lista actual sin interrumpir</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.28)" />
            </PressableFluid>

            <PressableFluid onPress={handleStartRadio} haptic="light" style={styles.actionRow}>
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(255, 179, 0, 0.14)' }]}>
                <Ionicons name="radio" size={19} color="#FFB300" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionText}>Iniciar radio del tema</Text>
                <Text style={styles.actionSubtext}>Genera una mezcla continua con canciones del mismo estilo</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.28)" />
            </PressableFluid>

            {/* SECCIÓN 2: BIBLIOTECA & MODO SIN CONEXIÓN */}
            <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
              <Ionicons name="cloud-outline" size={14} color="#00FF88" />
              <Text style={styles.sectionHeaderText}>BIBLIOTECA & MODO SIN CONEXIÓN</Text>
            </View>

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
                  {isLiked ? 'Quitar de tus favoritas' : 'Añadir a tus favoritas'}
                </Text>
                <Text style={styles.actionSubtext}>
                  {isLiked ? 'Eliminar de tus pistas guardadas y perfil' : 'Guardar en tu colección personal destacada'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.28)" />
            </PressableFluid>

            <PressableFluid onPress={handleToggleDownload} haptic="light" style={styles.actionRow}>
              <View style={[styles.actionIconBox, isDownloaded && { backgroundColor: 'rgba(0, 230, 118, 0.18)' }]}>
                <Ionicons
                  name={isDownloaded ? 'trash-outline' : 'cloud-download-outline'}
                  size={20}
                  color={isDownloaded ? '#FF3D5C' : colors.success}
                />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionText, isDownloaded ? { color: '#FF3D5C' } : { color: colors.success }]}>
                  {isDownloaded ? 'Eliminar descarga local' : 'Descargar para modo offline'}
                </Text>
                <Text style={styles.actionSubtext}>
                  {isDownloaded
                    ? 'Libera espacio en el teléfono eliminando el archivo local'
                    : 'Guarda una copia en tu dispositivo con porcentaje real'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.28)" />
            </PressableFluid>

            <PressableFluid onPress={handleOpenDownloads} haptic="light" style={styles.actionRow}>
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(0, 229, 255, 0.12)' }]}>
                <Ionicons name="arrow-down-circle-outline" size={20} color="#00E5FF" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionText}>Ver gestor de descargas</Text>
                <Text style={styles.actionSubtext}>Monitorea porcentaje activo, velocidad y reintentos</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.28)" />
            </PressableFluid>

            {/* SECCIÓN 3: AUDIO DSP & HERRAMIENTAS */}
            <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
              <Ionicons name="options-outline" size={14} color="#B388FF" />
              <Text style={styles.sectionHeaderText}>AUDIO DSP & HERRAMIENTAS</Text>
            </View>

            <PressableFluid onPress={handleOpenLyrics} haptic="light" style={styles.actionRow}>
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(0, 229, 255, 0.14)' }]}>
                <Ionicons name="mic-outline" size={20} color={colors.secondary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionText}>Ver letra sincronizada</Text>
                <Text style={styles.actionSubtext}>Abre las letras dinámicas con desplazamiento en vivo estilo karaoke</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.28)" />
            </PressableFluid>

            <PressableFluid onPress={handleOpenEqualizer} haptic="light" style={styles.actionRow}>
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(127, 0, 255, 0.18)' }]}>
                <Ionicons name="options-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionText}>Ajustar ecualizador DSP</Text>
                <Text style={styles.actionSubtext}>Modifica bandas de audio, refuerzo Bass Boost y Virtualizer 3D</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.28)" />
            </PressableFluid>

            <PressableFluid onPress={handleShare} haptic="light" style={styles.actionRow}>
              <View style={styles.actionIconBox}>
                <Ionicons name="share-social-outline" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionText}>Compartir canción</Text>
                <Text style={styles.actionSubtext}>Copia el enlace o comparte el título y artista con amigos</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.28)" />
            </PressableFluid>
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
    backgroundColor: 'rgba(4, 4, 8, 0.8)',
  },
  sheetCard: {
    maxHeight: Math.min(SCREEN_HEIGHT * 0.9, 720),
    backgroundColor: 'rgba(14, 14, 24, 0.98)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  scrollList: {
    maxHeight: SCREEN_HEIGHT * 0.62,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 10,
  },
  coverWrapper: {
    width: 66,
    height: 66,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: '#0a0a14',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
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
    gap: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  badge: {
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
  playingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 255, 136, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.4)',
  },
  playingBadgeText: {
    color: '#00FF88',
    fontFamily: typography.monoSmall.fontFamily,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  offlineBadgeText: {
    color: colors.success,
    fontFamily: typography.monoSmall.fontFamily,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  likedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 0, 85, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 85, 0.3)',
  },
  likedBadgeText: {
    color: '#FF0055',
    fontFamily: typography.monoSmall.fontFamily,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  title: {
    color: colors.text,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 16.5,
    fontWeight: '700',
  },
  artist: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 13,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    color: colors.textMuted,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  actionsList: {
    gap: 6,
    paddingBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
    gap: 2.5,
  },
  actionText: {
    color: colors.text,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 14.5,
    fontWeight: '600',
  },
  actionSubtext: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11.5,
    lineHeight: 15,
  },
});
