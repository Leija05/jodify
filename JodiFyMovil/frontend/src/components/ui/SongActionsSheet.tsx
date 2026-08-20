import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Song } from '../../lib/types';
import { resolveArtist } from '../../lib/utils';
import { downloadSong, deleteDownloadedSong } from '../../services/downloads.service';
import { useLibraryStore } from '../../store/library.store';
import { usePlayerStore } from '../../store/player.store';
import { useSettingsStore } from '../../store/settings.store';
import { useUiStore } from '../../store/ui.store';
import { colors, fonts, radius } from '../../theme';
import { PressableScale } from './PressableScale';
import { BottomSheet } from './BottomSheet';
import { CoverArt } from '../player/SongRow';

interface ActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
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

  const [downloading, setDownloading] = React.useState(false);

  const liked = useMemo(() => (song ? likedIds.some((id) => String(id) === String(song.id)) : false), [song, likedIds]);
  const downloaded = useMemo(() => (song ? downloadedIds.some((id) => String(id) === String(song.id)) : false), [song, downloadedIds]);
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

  const handleClose = useCallback(() => {
    if (!downloading) close();
  }, [downloading, close]);

  return (
    <BottomSheet visible={open} onClose={handleClose}>
      {song && (
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.header}>
            <CoverArt song={song} size={52} radiusSize={12} />
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
                  if (!downloaded) {
                    close();
                  }
                });
              }}
            />
          </View>

          <PressableScale onPress={handleClose} style={styles.cancel} scaleTo={0.98} haptic>
            <Text style={styles.cancelText}>Cancelar</Text>
          </PressableScale>
        </ScrollView>
      )}
    </BottomSheet>
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
    fontFamily: fonts.title,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  artist: {
    color: colors.textMuted,
    fontFamily: fonts.body,
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
    fontFamily: fonts.bodySemiBold,
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
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
});