import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import type { Song, Playlist } from '../../lib/types';
import { resolveArtist } from '../../lib/utils';
import { downloadSong, deleteDownloadedSong } from '../../services/downloads.service';
import { fetchPlaylists, createPlaylist, addToPlaylist } from '../../services/playlists.service';
import { useLibraryStore } from '../../store/library.store';
import { usePlayerStore } from '../../store/player.store';
import { useSettingsStore } from '../../store/settings.store';
import { useUiStore } from '../../store/ui.store';
import { colors, typography, gradients, radius } from '../../theme';
import { PressableScale } from './PressableScale';
import { BottomSheet } from './BottomSheet';
import { CoverArt } from '../player/SongRow';
import { Share } from 'react-native';

interface ActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: (() => void) | undefined;
  color?: string;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

function ActionRow({ icon, label, onPress, color = colors.text, danger, disabled, loading }: ActionProps) {
  return (
    <PressableScale
      onPress={disabled || loading ? undefined : onPress}
      haptic
      disabled={disabled || loading}
      style={[styles.actionRow, danger && styles.actionRowDanger]}
      scaleTo={0.98}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon} size={21} color={danger ? colors.error : color} />
      )}
      <Text style={[styles.actionLabel, { color: danger ? colors.error : color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={danger ? 'rgba(255,51,102,0.5)' : colors.textDim} />
    </PressableScale>
  );
}

function PlaylistPickerModal({ 
  song, 
  visible, 
  onClose, 
  onAddToPlaylist 
}: { 
  song: Song; 
  visible: boolean; 
  onClose: () => void; 
  onAddToPlaylist: (playlistId: string | number) => Promise<void>;
}) {
  if (!visible) return null;

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadPlaylists = useCallback(async () => {
    try {
      const data = await fetchPlaylists();
      setPlaylists(data);
    } catch {
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (visible) loadPlaylists();
  }, [visible, loadPlaylists]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || creating) return;
    setCreating(true);
    try {
      const playlist = await createPlaylist({ name: newPlaylistName.trim(), songIds: [song.id] });
      await onAddToPlaylist(playlist.id);
      setShowCreate(false);
      setNewPlaylistName('');
      onClose();
    } catch {
      Alert.alert('Error', 'No se pudo crear la playlist');
    } finally {
      setCreating(false);
    }
  };

  const handleAddToExisting = async (playlistId: string | number) => {
    try {
      await addToPlaylist(playlistId, song.id);
      await onAddToPlaylist(playlistId);
      onClose();
    } catch {
      Alert.alert('Error', 'No se pudo añadir a la playlist');
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={['80%', '50%']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent} keyboardVerticalOffset={44}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Añadir a playlist</Text>
            <PressableScale onPress={onClose} haptic style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </PressableScale>
          </View>

          {showCreate ? (
            <View style={styles.createPlaylistForm}>
              <Text style={styles.formLabel}>Nombre de la nueva playlist</Text>
              <View style={styles.inputRow}>
                <Ionicons name="create-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Mi playlist"
                  placeholderTextColor={colors.textDim}
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleCreatePlaylist}
                  maxLength={50}
                />
              </View>
              <View style={styles.createActions}>
                <PressableScale onPress={() => { setShowCreate(false); setNewPlaylistName(''); }} style={styles.cancelBtn} haptic>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </PressableScale>
                <PressableScale onPress={handleCreatePlaylist} disabled={!newPlaylistName.trim() || creating} style={styles.createBtn} haptic>
                  <LinearGradient colors={newPlaylistName.trim() ? [gradients.play[0], gradients.play[1]] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']} style={styles.createBtnInner}>
                    {creating ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.createBtnText}>Crear y añadir</Text>}
                  </LinearGradient>
                </PressableScale>
              </View>
            </View>
          ) : (
            <>
              <PressableScale onPress={() => setShowCreate(true)} haptic style={styles.createPlaylistBtn}>
                <LinearGradient colors={[gradients.primary[0], gradients.accent[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.createPlaylistBtnInner}>
                  <Ionicons name="add" size={20} color={colors.white} />
                  <Text style={styles.createPlaylistBtnText}>Crear nueva playlist</Text>
                </LinearGradient>
              </PressableScale>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Cargando playlists…</Text>
                </View>
              ) : playlists.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="musical-notes-outline" size={36} color={colors.textDim} />
                  <Text style={styles.emptyTitle}>No hay playlists</Text>
                  <Text style={styles.emptySubtitle}>Crea una para organizar tu música</Text>
                </View>
              ) : (
                <View style={styles.playlistList}>
                  {playlists.map((playlist) => (
                    <PressableScale
                      key={playlist.id}
                      onPress={() => handleAddToExisting(playlist.id)}
                      haptic
                      style={styles.playlistItem}
                      scaleTo={0.98}
                    >
                      <View style={styles.playlistCover}>
                        {playlist.cover_url ? (
                          <Image source={{ uri: playlist.cover_url }} style={styles.playlistCoverImage} resizeMode="cover" />
                        ) : (
                          <LinearGradient colors={[gradients.primary[0], gradients.accent[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.playlistCoverGradient}>
                            <Ionicons name="musical-notes" size={20} color={colors.white} />
                          </LinearGradient>
                        )}
                      </View>
                      <View style={styles.playlistInfo}>
                        <Text style={styles.playlistName} numberOfLines={1}>{playlist.name}</Text>
                        <Text style={styles.playlistCount} numberOfLines={1}>{playlist.song_count ?? 0} canciones</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
                    </PressableScale>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

/**
 * Hoja de acciones al mantener pulsada una canción.
 * Reemplaza el menú contextual del sistema Android por un diseño propio.
 */
export function SongActionsSheet() {
  const open = useUiStore((s) => s.songActionsOpen);
  const song = useUiStore((s) => s.songActionsSong);
  const close = useUiStore((s) => s.closeSongActions);
  const openAuth = useUiStore((s) => s.openAuth);

  const user = useSettingsStore((s) => s.user);
  const { currentSong, playSong, playNext, addToQueue } = usePlayerStore();
  const likedIds = useLibraryStore((s) => s.likedIds);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const markDownloaded = useLibraryStore((s) => s.markDownloaded);
  const unmarkDownloaded = useLibraryStore((s) => s.unmarkDownloaded);
  const librarySongs = useLibraryStore((s) => s.songs);

  const [downloading, setDownloading] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);

  const liked = useMemo(() => (song ? likedIds.some((id) => String(id) === String(song.id)) : false), [song, likedIds]);
  const downloaded = useMemo(() => (song ? downloadedIds.some((id) => String(song.id) === String(id)) : false), [song, downloadedIds]);
  const isCurrent = song ? String(currentSong?.id) === String(song.id) : false;

  const handleLike = useCallback(async () => {
    if (!song) return;
    if (!user) {
      openAuth();
      return;
    }
    await toggleLike(song);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [song, user, toggleLike, openAuth]);

  const handleDownload = useCallback(async () => {
    if (!song) return;
    setDownloading(true);
    try {
      if (downloaded) {
        await deleteDownloadedSong(song.id);
        unmarkDownloaded(song.id);
      } else {
        const record = await downloadSong(song);
        markDownloaded(record.id, record.localUri);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDownloading(false);
    }
  }, [song, downloaded, markDownloaded, unmarkDownloaded]);

  const handleOpenPlaylistPicker = useCallback(() => {
    close();
    setShowPlaylistPicker(true);
  }, [close]);

  const handleAddToPlaylist = useCallback(async (playlistId: string | number) => {
    if (!song) return;
    await addToPlaylist(playlistId, song.id);
  }, [song]);

  const handleClose = useCallback(() => {
    if (!downloading) close();
  }, [downloading, close]);

  return (
    <>
      <BottomSheet visible={open} onClose={handleClose}>
        {song && (
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <View style={styles.header}>
              <CoverArt song={song} size={56} radiusSize={12} />
              <View style={styles.headerTexts}>
                <Text style={styles.title} numberOfLines={2}>
                  {song.name}
                </Text>
                <Text style={styles.artist} numberOfLines={1}>
                  {resolveArtist(song) ?? 'Desconocido'}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              {!isCurrent && (
                <ActionRow
                  icon="play"
                  label="Reproducir"
                  color={colors.secondary}
                  onPress={() => {
                    playSong(song, librarySongs.length > 0 ? librarySongs : [song]);
                    close();
                  }}
                />
              )}
              <ActionRow
                icon="play-skip-forward"
                label="Reproducir después"
                onPress={() => {
                  playNext(song);
                  close();
                }}
              />
              <ActionRow
                icon="list"
                label="Añadir a la cola"
                color={colors.primary}
                onPress={() => {
                  addToQueue(song);
                  close();
                }}
              />
              <ActionRow
                icon={liked ? 'heart-dislike' : 'heart'}
                label={liked ? 'Quitar de favoritas' : 'Añadir a favoritas'}
                color={colors.accent}
                onPress={() => {
                  void handleLike();
                  close();
                }}
              />
              <ActionRow
                icon={downloaded ? 'cloud-offline' : 'cloud-download-outline'}
                label={downloaded ? 'Quitar descarga' : 'Descargar'}
                color={downloaded ? colors.error : colors.success}
                loading={downloading}
                onPress={() => {
                  void handleDownload().then(() => {
                    if (!downloaded) close();
                  });
                }}
              />
              <ActionRow
                icon="musical-notes"
                label="Añadir a playlist"
                color={colors.primary}
                onPress={handleOpenPlaylistPicker}
              />
              <ActionRow
                icon="share-outline"
                label="Compartir"
                color={colors.secondary}
                onPress={() => {
                  if (song) {
                    const shareUrl = `${song.url || ''}`;
                    Share.share({
                      title: song.name,
                      message: `${song.name} - ${resolveArtist(song) ?? 'Desconocido'}`,
                      url: shareUrl,
                    });
                  }
                  close();
                }}
              />
              <ActionRow
                icon="person-outline"
                label="Ver artista"
                color={colors.accent}
                onPress={() => {
                  // Navigate to artist screen
                  close();
                }}
              />
              <ActionRow
                icon="albums-outline"
                label="Ver álbum"
                color={colors.warning}
                onPress={() => {
                  // Navigate to album screen
                  close();
                }}
              />
            </View>

            <PressableScale onPress={handleClose} style={styles.cancel} scaleTo={0.98} haptic>
              <Text style={styles.cancelText}>Cancelar</Text>
            </PressableScale>
          </ScrollView>
        )}
      </BottomSheet>

      <PlaylistPickerModal
        song={song!}
        visible={showPlaylistPicker}
        onClose={() => setShowPlaylistPicker(false)}
        onAddToPlaylist={handleAddToPlaylist}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTexts: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontFamily: typography.headlineSmall.fontFamily,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  artist: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 13,
    marginTop: 2,
  },
  actions: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginVertical: 2,
  },
  actionRowDanger: {
    backgroundColor: 'rgba(255,51,102,0.07)',
  },
  actionLabel: {
    flex: 1,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 14.5,
  },
  cancel: {
    marginHorizontal: 20,
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.textMuted,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 14,
  },
  // Modal styles
  modalContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  modalTitle: {
    color: colors.text,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    padding: 9,
  },
  createPlaylistBtn: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  createPlaylistBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  createPlaylistBtnText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 14.5,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 30,
  },
  loadingText: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: typography.headlineSmall.fontFamily,
    fontSize: 16,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 13,
  },
  playlistList: {
    gap: 8,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  playlistCover: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  playlistCoverImage: {
    width: '100%',
    height: '100%',
  },
  playlistCoverGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: {
    flex: 1,
    minWidth: 0,
  },
  playlistName: {
    color: colors.text,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 14,
  },
  playlistCount: {
    color: colors.textMuted,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 11.5,
    marginTop: 1,
  },
  // Create playlist form
  createPlaylistForm: {
    gap: 12,
    marginTop: 8,
  },
  formLabel: {
    color: colors.textMuted,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 52,
  },
  textInput: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    padding: 0,
  },
  createActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 14,
  },
  createBtn: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  createBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  createBtnText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 14.5,
  },
});