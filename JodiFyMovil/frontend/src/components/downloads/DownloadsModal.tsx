import { useEffect, useRef, useMemo } from 'react';
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
import * as Haptics from 'expo-haptics';
import { colors, radius } from '@theme';
import { pickCoverUrl, resolveArtist, resolveSongTitle } from '@lib/utils';
import { useUiStore } from '@stores/ui.store';
import { useDownloadStore } from '@stores/download.store';
import { usePlayerStore } from '@stores/player.store';
import { PressableFluid } from '@components/ui/PressableFluid';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

export function DownloadsModal() {
  const visible = useUiStore((s) => s.downloadsModalOpen);
  const close = useUiStore((s) => s.closeDownloadsModal);

  const tasksMap = useDownloadStore((s) => s.tasks);
  const retryDownload = useDownloadStore((s) => s.retryDownload);
  const cancelDownload = useDownloadStore((s) => s.cancelDownload);
  const removeTask = useDownloadStore((s) => s.removeTask);
  const clearCompleted = useDownloadStore((s) => s.clearCompleted);

  const playSong = usePlayerStore((s) => s.playSong);
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const tasksList = useMemo(() => {
    return Object.values(tasksMap).sort((a, b) => b.startedAt - a.startedAt);
  }, [tasksMap]);

  const activeCount = useMemo(() => {
    return tasksList.filter((t) => t.status === 'downloading' || t.status === 'pending').length;
  }, [tasksList]);

  const hasCompleted = useMemo(() => {
    return tasksList.some((t) => t.status === 'completed');
  }, [tasksList]);

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
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  const handleDismiss = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
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

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetContainer,
            {
              transform: [{ translateY }],
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.androidBackground]} />
          )}

          {/* Top handle pill */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="cloud-download" size={20} color={colors.secondary} />
              </View>
              <View style={styles.headerTexts}>
                <Text style={styles.title}>Descargas sin conexión</Text>
                <Text style={styles.subtitle}>
                  {activeCount > 0
                    ? `${activeCount} ${activeCount === 1 ? 'canción descargándose' : 'canciones descargándose'}`
                    : 'Listas para reproducir sin internet'}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              {hasCompleted && (
                <PressableFluid
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    clearCompleted();
                  }}
                  haptic="light"
                  style={styles.clearBtn}
                >
                  <Text style={styles.clearBtnText}>Limpiar</Text>
                </PressableFluid>
              )}
              <PressableFluid
                onPress={handleDismiss}
                haptic="light"
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </PressableFluid>
            </View>
          </View>

          {/* Content list */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {tasksList.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="cloud-offline-outline" size={38} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>Sin descargas activas</Text>
                <Text style={styles.emptySubtitle}>
                  Toca el botón de descarga en cualquier canción para guardarla y escucharla en modo sin conexión.
                </Text>
              </View>
            ) : (
              tasksList.map((task) => {
                const cover = pickCoverUrl(task.song);
                const title = resolveSongTitle(task.song);
                const artist = resolveArtist(task.song);
                const isError = task.status === 'error';
                const isDownloading = task.status === 'downloading' || task.status === 'pending';
                const isCompleted = task.status === 'completed';

                return (
                  <View key={String(task.song.id)} style={styles.taskCard}>
                    <View style={styles.taskTopRow}>
                      {/* Artwork thumbnail */}
                      <View style={styles.coverWrapper}>
                        {cover ? (
                          <Image source={{ uri: cover }} style={styles.coverImage} />
                        ) : (
                          <View style={styles.coverFallback}>
                            <Ionicons name="musical-note" size={20} color={colors.textMuted} />
                          </View>
                        )}
                        {isCompleted && (
                          <View style={styles.coverBadgeSuccess}>
                            <Ionicons name="checkmark" size={10} color={colors.white} />
                          </View>
                        )}
                      </View>

                      {/* Info & Status */}
                      <View style={styles.taskInfo}>
                        <Text style={styles.songName} numberOfLines={1}>
                          {title}
                        </Text>
                        <Text style={styles.artistName} numberOfLines={1}>
                          {artist}
                        </Text>

                        {/* Progress and status message */}
                        <View style={styles.statusRow}>
                          {isDownloading && (
                            <Text style={styles.progressText}>
                              {task.progress}% · {formatBytes(task.bytesWritten)}
                              {task.totalBytes > 0 ? ` / ${formatBytes(task.totalBytes)}` : ''}
                            </Text>
                          )}
                          {isCompleted && (
                            <View style={styles.completedTag}>
                              <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                              <Text style={styles.completedText}>Descarga completa</Text>
                            </View>
                          )}
                          {isError && (
                            <View style={styles.errorTag}>
                              <Ionicons name="alert-circle" size={13} color={colors.error} />
                              <Text style={styles.errorText} numberOfLines={1}>
                                {task.error || 'Error al descargar'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Right Action Buttons */}
                      <View style={styles.taskActions}>
                        {isError && (
                          <PressableFluid
                            onPress={() => retryDownload(task.song.id)}
                            haptic="medium"
                            style={styles.retryBtn}
                          >
                            <Ionicons name="reload" size={14} color={colors.white} />
                            <Text style={styles.retryBtnText}>Reintentar</Text>
                          </PressableFluid>
                        )}

                        {isDownloading && (
                          <PressableFluid
                            onPress={() => cancelDownload(task.song.id)}
                            haptic="light"
                            style={styles.actionCircleBtn}
                          >
                            <Ionicons name="close" size={16} color={colors.textSecondary} />
                          </PressableFluid>
                        )}

                        {isCompleted && (
                          <PressableFluid
                            onPress={() => {
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              playSong(task.song);
                              handleDismiss();
                            }}
                            haptic="light"
                            style={styles.playOfflineBtn}
                          >
                            <Ionicons name="play" size={14} color={colors.secondary} />
                          </PressableFluid>
                        )}

                        {!isDownloading && (
                          <PressableFluid
                            onPress={() => removeTask(task.song.id)}
                            haptic="light"
                            style={styles.dismissTaskBtn}
                          >
                            <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                          </PressableFluid>
                        )}
                      </View>
                    </View>

                    {/* Progress Bar */}
                    {isDownloading && (
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.max(4, Math.min(100, task.progress))}%` },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                );
              })
            )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  sheetContainer: {
    maxHeight: SCREEN_HEIGHT * 0.78,
    minHeight: SCREEN_HEIGHT * 0.38,
    backgroundColor: '#12141a',
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  androidBackground: {
    backgroundColor: '#101217',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  taskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadgeSuccess: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  songName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  artistName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusRow: {
    marginTop: 4,
  },
  progressText: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '500',
  },
  errorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '500',
    flex: 1,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ff4d4f',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  actionCircleBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOfflineBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissTaskBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.secondary,
  },
});
