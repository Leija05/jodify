import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PressableFluid } from '@components/ui/PressableFluid';
import { SongRow } from '@components/player/SongRow';
import { colors, typography, elevation } from '@theme';
import type { Song } from '@lib/types';
import { usePlayerStore } from '@stores/player.store';

interface QueueSheetProps {
  open: boolean;
  onClose: () => void;
}

export const QueueSheet = React.forwardRef<View, QueueSheetProps>(
  ({ open, onClose }, ref) => {
    const queue = usePlayerStore((s) => s.queue);
    const queueIndex = usePlayerStore((s) => s.queueIndex);
    const currentSong = usePlayerStore((s) => s.currentSong);
    const isPlaying = usePlayerStore((s) => s.isPlaying);
    const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
    const playSong = usePlayerStore((s) => s.playSong);

    const handlePlaySong = (song: Song) => {
      playSong(song, queue);
      onClose();
    };

    const handleClearQueue = () => {
      if (currentSong) {
        usePlayerStore.setState({ queue: [currentSong], queueIndex: 0 });
      } else {
        usePlayerStore.setState({ queue: [], queueIndex: -1 });
      }
    };

    const renderItem = useMemo(() => ({ item }: { item: Song }) => {
      const isCurrent = queueIndex === queue.findIndex((s) => String(s.id) === String(item.id));
      return (
        <SongRow
          song={item}
          isCurrent={isCurrent}
          isPlaying={isPlaying && isCurrent}
          onPress={() => handlePlaySong(item)}
          right={
            <PressableFluid onPress={() => removeFromQueue(item.id)} haptic="light" hitSlop={8} style={styles.removeBtn}>
              <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
            </PressableFluid>
          }
        />
      );
    }, [queue, queueIndex, isPlaying, removeFromQueue]);

    if (!open) return null;

    return (
      <Animated.View
        ref={ref}
        style={[
          styles.sheet,
          { opacity: open ? 1 : 0 },
          { transform: [{ translateX: open ? 0 : 300 }] },
        ]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Cola de reproducción</Text>
            <Text style={styles.subtitle}>{queue.length} canciones</Text>
          </View>
          <View style={styles.headerActions}>
            {queue.length > 1 && (
              <PressableFluid onPress={handleClearQueue} haptic="medium" style={styles.clearBtn}>
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                <Text style={styles.clearText}>Vaciar</Text>
              </PressableFluid>
            )}
            <PressableFluid onPress={onClose} haptic="light" hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </PressableFluid>
          </View>
        </View>

        {queue.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyText}>La cola está vacía</Text>
          </View>
        ) : (
          <FlatList
            data={queue}
            keyExtractor={(item, idx) => `${item.id}-${idx}`}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    );
  }
);

QueueSheet.displayName = 'QueueSheet';

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 340,
    maxWidth: '90%',
    backgroundColor: 'rgba(16, 16, 24, 0.85)',
    borderLeftWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    zIndex: 100,
    ...elevation.level4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    color: colors.white,
    fontFamily: typography.headlineLarge.fontFamily,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  clearText: {
    color: colors.textMuted,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 11,
  },
  closeBtn: {
    padding: 6,
  },
  list: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 40,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    textAlign: 'center',
  },
  removeBtn: {
    padding: 8,
  },
});