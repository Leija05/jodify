import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useRef } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Song } from '../../lib/types';
import { initials, pickCoverUrl, resolveArtist } from '../../lib/utils';
import { colors, fonts, gradients, radius } from '../../theme';

interface Props {
  song: Song;
  size?: number;
  radiusSize?: number;
}

export function CoverArt({ song, size = 48, radiusSize = 10 }: Props) {
  const url = pickCoverUrl(song);
  const border = { borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' };
  if (url) {
    return (
      <View style={{ width: size, height: size, borderRadius: radiusSize, ...border }}>
        <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: radiusSize }} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: radiusSize, ...border }}>
      <LinearGradient
        colors={[gradients.primary[0], gradients.accent[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: radiusSize,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={[styles.initials, { fontSize: size * 0.32 }]}>{initials(song.name)}</Text>
      </LinearGradient>
    </View>
  );
}

interface RowProps {
  song: Song;
  isCurrent?: boolean;
  isPlaying?: boolean;
  onPress?: () => void;
  onLike?: () => void;
  onUnlike?: () => void;
  liked?: boolean;
  onDownload?: () => void;
  downloaded?: boolean;
  onAddToQueue?: () => void;
  onPlayNext?: () => void;
  onLongPress?: () => void;
  right?: React.ReactNode;
}

const SWIPE_THRESHOLD = 90;

/**
 * Fila de canción con gestos tipo Spotify:
 * - Deslizar a la DERECHA → dar/quitar like (corazón)
 * - Deslizar a la IZQUIERDA → añadir a la cola
 * - Pulsación larga → menú de acciones
 */
export function SongRow({
  song,
  isCurrent,
  isPlaying,
  onPress,
  onLike,
  onUnlike,
  liked,
  onDownload,
  downloaded,
  onAddToQueue,
  onPlayNext,
  onLongPress,
  right,
}: RowProps) {
  const translateX = useRef(new Animated.Value(0)).current;

  const likeBgOpacity = translateX.interpolate({
    inputRange: [-1, 0, SWIPE_THRESHOLD, SWIPE_THRESHOLD + 1],
    outputRange: [0, 0, 0.15, 0.85],
    extrapolate: 'clamp',
  });

  const queueBgOpacity = translateX.interpolate({
    inputRange: [-(SWIPE_THRESHOLD + 1), -SWIPE_THRESHOLD, 0, 1],
    outputRange: [0.85, 0.15, 0, 0],
    extrapolate: 'clamp',
  });

  const springBack = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      speed: 22,
      bounciness: 9,
    }).start();
  }, [translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gestureState) => Math.abs(gestureState.dx) > 6,
        onPanResponderGrant: () => {
          translateX.extractOffset();
        },
        onPanResponderMove: (_event, gestureState) => {
          translateX.setValue(gestureState.dx);
        },
        onPanResponderRelease: (_event, gestureState) => {
          translateX.flattenOffset();
          const { dx } = gestureState;

          if (dx > SWIPE_THRESHOLD) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Animated.timing(translateX, {
              toValue: SWIPE_THRESHOLD,
              duration: 170,
              useNativeDriver: true,
            }).start(() => {
              if (liked) {
                onUnlike?.();
              } else {
                onLike?.();
              }
              springBack();
            });
          } else if (dx < -SWIPE_THRESHOLD) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Animated.timing(translateX, {
              toValue: -SWIPE_THRESHOLD,
              duration: 170,
              useNativeDriver: true,
            }).start(() => {
              onAddToQueue?.();
              springBack();
            });
          } else {
            springBack();
          }
        },
        onPanResponderTerminate: springBack,
      }),
    [translateX, liked, onLike, onUnlike, onAddToQueue, springBack],
  );

  const handleLikePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (liked) {
      onUnlike?.();
    } else {
      onLike?.();
    }
  }, [liked, onLike, onUnlike]);

  const handleLongPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.();
  }, [onLongPress]);

  return (
    <View style={styles.swipeContainer}>
      <Animated.View pointerEvents="none" style={[styles.likeBg, { opacity: likeBgOpacity }]}>
        <View style={styles.swipeLabel}>
          <Ionicons name={liked ? 'heart-dislike' : 'heart'} size={18} color={colors.accent} />
          <Text style={styles.swipeLabelText}>{liked ? 'Quitar' : 'Like'}</Text>
        </View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.queueBg, { opacity: queueBgOpacity }]}>
        <View style={styles.swipeLabel}>
          <Ionicons name="list" size={18} color={colors.secondary} />
          <Text style={styles.swipeLabelText}>Cola</Text>
        </View>
      </Animated.View>
      <Animated.View
        style={[
          styles.row,
          isCurrent && styles.rowCurrent,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        {isCurrent && (
          <LinearGradient colors={[gradients.primary[0], gradients.primary[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.currentBar} />
        )}
        <TouchableOpacity activeOpacity={0.7} onPress={() => onPress?.()} onLongPress={handleLongPress} style={styles.main}>
          <View style={styles.coverWrap}>
            <CoverArt song={song} />
            {isCurrent && (
              <View style={styles.playingBadge}>
                {isPlaying ? (
                  <View style={styles.eq}>
                    {[0.9, 0.5, 0.75].map((h, i) => (
                      <View key={i} style={[styles.eqBar, { height: 10 * h }]} />
                    ))}
                  </View>
                ) : (
                  <Ionicons name="pause" size={10} color={colors.white} />
                )}
              </View>
            )}
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, isCurrent && styles.nameCurrent]} numberOfLines={1}>
              {song.name}
            </Text>
            <Text style={[styles.artist, isCurrent && styles.artistCurrent]} numberOfLines={1}>
              {resolveArtist(song) ?? 'Desconocido'}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.actions}>
          {onDownload ? (
            <TouchableOpacity activeOpacity={0.7} onPress={() => onDownload?.()} hitSlop={6}>
              <Ionicons
                name={downloaded ? 'cloud-done' : 'cloud-download-outline'}
                size={19}
                color={downloaded ? colors.success : colors.textMuted}
              />
            </TouchableOpacity>
          ) : null}
          {onLike || onUnlike ? (
            <TouchableOpacity activeOpacity={0.7} onPress={handleLikePress} hitSlop={6}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={19}
                color={liked ? colors.accent : colors.textMuted}
              />
            </TouchableOpacity>
          ) : null}
          {right}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'relative',
    marginHorizontal: 12,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginVertical: 2,
  },
  likeBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,0,128,0.16)',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 16,
  },
  queueBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,240,255,0.12)',
    borderRightWidth: 3,
    borderRightColor: colors.secondary,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 16,
  },
  swipeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swipeLabelText: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radius.md,
  },
  rowCurrent: {
    backgroundColor: 'rgba(127,0,255,0.08)',
  },
  currentBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coverWrap: {
    position: 'relative',
  },
  playingBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: 'rgba(5,5,7,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eq: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  eqBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: colors.secondary,
  },
  info: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  nameCurrent: {
    color: colors.secondary,
  },
  artist: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  artistCurrent: {
    color: 'rgba(0,240,255,0.75)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  initials: {
    color: colors.white,
    fontFamily: fonts.display,
  },
});