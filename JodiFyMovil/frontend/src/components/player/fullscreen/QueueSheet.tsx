import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  Platform,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PressableFluid } from '@components/ui/PressableFluid';
import { SongRow } from '@components/player/SongRow';
import { colors, typography, elevation } from '@theme';
import type { Song } from '@lib/types';
import { usePlayerStore } from '@stores/player.store';

const SCREEN = Dimensions.get('window');
const SHEET_WIDTH = Math.min(360, SCREEN.width * 0.88);

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

    const [rendered, setRendered] = useState(open);
    const slideAnim = useRef(new Animated.Value(SHEET_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (open) {
        setRendered(true);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            damping: 24,
            stiffness: 260,
            mass: 0.8,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: SHEET_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) setRendered(false);
        });
      }
    }, [open, slideAnim, fadeAnim]);

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

    if (!rendered && !open) return null;

    return (
      <View style={styles.overlayRoot} pointerEvents={open ? 'auto' : 'none'}>
        {/* Semi-transparent Backdrop for outside taps */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </Animated.View>

        {/* Sliding Queue Sheet Drawer */}
        <Animated.View
          ref={ref}
          style={[
            styles.sheet,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10, 10, 16, 0.96)' }]} />
          )}

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
      </View>
    );
  }
);

QueueSheet.displayName = 'QueueSheet';

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 25,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheet: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: SHEET_WIDTH,
    maxWidth: '90%',
    backgroundColor: 'rgba(16, 16, 24, 0.94)',
    borderLeftWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    ...elevation.level4,
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