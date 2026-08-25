import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Song } from '../../lib/types';
import { initials, pickCoverUrl, resolveArtist } from '../../lib/utils';
import { colors, typography, gradients, radius } from '../../theme';
import { PressableFluid } from '../ui/PressableFluid';

interface CoverArtProps {
  song: Song;
  size?: number | undefined;
  radiusSize?: number | undefined;
  onPress?: (() => void) | undefined;
}

export function CoverArt({ song, size = 56, radiusSize = 12, onPress }: CoverArtProps) {
  const url = pickCoverUrl(song);
  
  if (url) {
    return (
      <PressableFluid
        onPress={onPress}
        haptic="light"
        scaleTo={0.97}
        style={{ width: size, height: size, borderRadius: radiusSize }}
        hitSlop={0}
      >
        <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: radiusSize }} resizeMode="cover" />
      </PressableFluid>
    );
  }
  
  return (
    <PressableFluid
      onPress={onPress}
      haptic="light"
      scaleTo={0.97}
      style={{ width: size, height: size, borderRadius: radiusSize }}
      hitSlop={0}
    >
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
    </PressableFluid>
  );
}

interface RowProps {
  song: Song;
  isCurrent?: boolean | undefined;
  isPlaying?: boolean | undefined;
  onPress?: (() => void) | undefined;
  onLike?: (() => void) | undefined;
  onUnlike?: (() => void) | undefined;
  liked?: boolean | undefined;
  onDownload?: (() => void) | undefined;
  downloaded?: boolean | undefined;
  onAddToQueue?: (() => void) | undefined;
  onPlayNext?: (() => void) | undefined;
  onLongPress?: (() => void) | undefined;
  right?: React.ReactNode;
}

const SWIPE_THRESHOLD = 85;
const PREVIEW_SCALE = 1.12;
const SPRING_CONFIG = { damping: 18, stiffness: 260, useNativeDriver: true };
const QUICK_SPRING = { damping: 18, stiffness: 260, useNativeDriver: true };

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
  const coverScale = useRef(new Animated.Value(1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const previewScale = useRef(new Animated.Value(0.9)).current;
  const previewOpacity = useRef(new Animated.Value(0)).current;
  const [previewVisible, setPreviewVisible] = useState(false);
  const isSwipingRef = useRef(false);

  const likeBgOpacity = translateX.interpolate({
    inputRange: [-1, 0, SWIPE_THRESHOLD, SWIPE_THRESHOLD + 1],
    outputRange: [0, 0, 0.15, 0.9],
    extrapolate: 'clamp',
  });

  const queueBgOpacity = translateX.interpolate({
    inputRange: [-(SWIPE_THRESHOLD + 1), -SWIPE_THRESHOLD, 0, 1],
    outputRange: [0.9, 0.15, 0, 0],
    extrapolate: 'clamp',
  });

  const coverScaleAnim = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: [PREVIEW_SCALE, 1, PREVIEW_SCALE],
    extrapolate: 'clamp',
  });

  const likeIconScale = likeBgOpacity.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 1.1, 1],
    extrapolate: 'clamp',
  });

  const queueIconScale = queueBgOpacity.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 1.1, 1],
    extrapolate: 'clamp',
  });

  const springBack = useCallback(() => {
    if (isSwipingRef.current) return;
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, ...QUICK_SPRING }),
      Animated.spring(coverScale, { toValue: 1, ...QUICK_SPRING }),
    ]).start();
  }, [translateX, coverScale]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gestureState) => Math.abs(gestureState.dx) > 5,
        onPanResponderGrant: () => {
          translateX.extractOffset();
          isSwipingRef.current = true;
        },
        onPanResponderMove: (_event, gestureState) => {
          translateX.setValue(gestureState.dx);
          const absDx = Math.abs(gestureState.dx);
          coverScale.setValue(1 + Math.min(absDx / 500, 0.12));
        },
        onPanResponderRelease: (_event, gestureState) => {
          translateX.flattenOffset();
          isSwipingRef.current = false;
          const { dx } = gestureState;

          if (dx > SWIPE_THRESHOLD) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Animated.parallel([
              Animated.spring(translateX, { toValue: SWIPE_THRESHOLD, ...SPRING_CONFIG }),
              Animated.spring(coverScale, { toValue: PREVIEW_SCALE, ...QUICK_SPRING }),
            ]).start(() => {
              if (liked) onUnlike?.(); else onLike?.();
              springBack();
            });
          } else if (dx < -SWIPE_THRESHOLD) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Animated.parallel([
              Animated.spring(translateX, { toValue: -SWIPE_THRESHOLD, ...SPRING_CONFIG }),
              Animated.spring(coverScale, { toValue: PREVIEW_SCALE, ...QUICK_SPRING }),
            ]).start(() => {
              onAddToQueue?.();
              springBack();
            });
          } else {
            springBack();
          }
        },
        onPanResponderTerminate: () => {
          isSwipingRef.current = false;
          springBack();
        },
      }),
    [translateX, liked, onLike, onUnlike, onAddToQueue, springBack],
  );

  const handlePressIn = useCallback(() => {
    Animated.spring(pressScale, { toValue: 0.97, ...QUICK_SPRING }).start();
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressScale, { toValue: 1, ...QUICK_SPRING }).start();
  }, [pressScale]);

  const handleLikePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (liked) onUnlike?.(); else onLike?.();
  }, [liked, onLike, onUnlike]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.();
  }, [onLongPress]);

  const handleCoverPress = useCallback(() => {
    setPreviewVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    previewScale.setValue(0.9);
    previewOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(previewScale, { toValue: 1, damping: 20, stiffness: 220, useNativeDriver: true }),
      Animated.spring(previewOpacity, { toValue: 1, damping: 20, stiffness: 220, useNativeDriver: true }),
    ]).start();
  }, [previewScale, previewOpacity]);

  const handlePreviewClose = useCallback(() => {
    Animated.parallel([
      Animated.spring(previewScale, { toValue: 0.9, damping: 20, stiffness: 220, useNativeDriver: true }),
      Animated.spring(previewOpacity, { toValue: 0, damping: 20, stiffness: 220, useNativeDriver: true }),
    ]).start(() => setPreviewVisible(false));
  }, [previewScale, previewOpacity]);

  return (
    <>
      <View style={styles.swipeContainer}>
        <Animated.View pointerEvents="none" style={[styles.likeBgWrap, { opacity: likeBgOpacity }]}>
          <LinearGradient
            colors={['rgba(255,0,122,0.35)', 'rgba(255,0,122,0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.likeBg}
          >
            <View style={styles.swipeLabel}>
              <Animated.View style={{ transform: [{ scale: likeIconScale }] }}>
                <Ionicons name={liked ? 'heart-dislike' : 'heart'} size={18} color={colors.accent} />
              </Animated.View>
              <Text style={styles.swipeLabelText}>{liked ? 'Quitar' : 'Like'}</Text>
            </View>
          </LinearGradient>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.queueBgWrap, { opacity: queueBgOpacity }]}>
          <LinearGradient
            colors={['rgba(0,229,255,0.3)', 'rgba(0,229,255,0.04)']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0 }}
            style={styles.queueBg}
          >
            <View style={styles.swipeLabel}>
              <Animated.View style={{ transform: [{ scale: queueIconScale }] }}>
                <Ionicons name="list" size={18} color={colors.secondary} />
              </Animated.View>
              <Text style={styles.swipeLabelText}>Cola</Text>
            </View>
          </LinearGradient>
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
            <Animated.View style={[
              styles.currentBar,
              { opacity: translateX.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [0, 1, 0],
                extrapolate: 'clamp',
              }) }
            ]} />
          )}
          <PressableFluid
            onPress={onPress}
            onLongPress={handleLongPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            haptic="light"
            scaleTo={0.98}
            style={[styles.main, { transform: [{ scale: pressScale }] }]}
          >
            <Animated.View style={[
              styles.coverWrap,
              { transform: [{ scale: coverScaleAnim }] }
            ]}>
              <CoverArt song={song} onPress={handleCoverPress} />
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
            </Animated.View>
            <View style={styles.info}>
              <Text style={[styles.name, isCurrent && styles.nameCurrent]} numberOfLines={1}>
                {song.name}
              </Text>
              <Text style={[styles.artist, isCurrent && styles.artistCurrent]} numberOfLines={1}>
                {resolveArtist(song) ?? 'Desconocido'}
              </Text>
            </View>
          </PressableFluid>
          <View style={styles.actions}>
            {onDownload ? (
              <PressableFluid
                onPress={() => onDownload?.()}
                haptic="light"
                hitSlop={8}
                style={styles.actionBtn}
              >
                <Ionicons
                  name={downloaded ? 'cloud-done' : 'cloud-download-outline'}
                  size={20}
                  color={downloaded ? colors.success : colors.textMuted}
                />
              </PressableFluid>
            ) : null}
            {onLike || onUnlike ? (
              <PressableFluid
                onPress={handleLikePress}
                haptic="light"
                hitSlop={8}
                style={styles.actionBtn}
              >
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={20}
                  color={liked ? colors.accent : colors.textMuted}
                />
              </PressableFluid>
            ) : null}
            {right}
          </View>
        </Animated.View>
      </View>

      {previewVisible && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable onPress={handlePreviewClose} style={StyleSheet.absoluteFill} pointerEvents="box-only" />
          <Animated.View
            style={[
              styles.previewOverlay,
              { opacity: previewOpacity, transform: [{ scale: previewScale }] },
            ]}
            pointerEvents="box-only"
          >
            <Pressable onPress={handlePreviewClose} style={styles.previewContent}>
              <View style={styles.previewCoverWrap}>
                <CoverArt song={song} size={180} radiusSize={18} />
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>{song.name}</Text>
                <Text style={styles.previewArtist}>{resolveArtist(song) ?? 'Desconocido'}</Text>
                {onPlayNext ? (
                  <PressableFluid
                    onPress={() => {
                      onPlayNext();
                      handlePreviewClose();
                    }}
                    haptic="light"
                    hitSlop={8}
                    style={styles.previewAction}
                  >
                    <Text style={styles.previewActionText}>Reproducir siguiente</Text>
                  </PressableFluid>
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'relative',
    marginHorizontal: 12,
    borderRadius: radius.cardOuter,
    overflow: 'hidden',
    marginVertical: 3,
  },
  likeBgWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    borderTopLeftRadius: radius.cardOuter,
    borderBottomLeftRadius: radius.cardOuter,
    overflow: 'hidden',
  },
  likeBg: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 18,
  },
  queueBgWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRightWidth: 4,
    borderRightColor: colors.secondary,
    borderTopRightRadius: radius.cardOuter,
    borderBottomRightRadius: radius.cardOuter,
    overflow: 'hidden',
  },
  queueBg: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 18,
  },
  swipeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swipeLabelText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    letterSpacing: typography.labelLarge.letterSpacing,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.cardInner,
  },
  rowCurrent: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
  },
  currentBar: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: colors.primary,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  coverWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  playingBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: 'rgba(5,5,7,0.6)',
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
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    lineHeight: typography.bodyMedium.lineHeight,
  },
  nameCurrent: {
    color: colors.secondary,
  },
  artist: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    lineHeight: typography.bodySmall.lineHeight,
    marginTop: 2,
  },
  artistCurrent: {
    color: colors.secondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    padding: 4,
  },
  initials: {
    color: colors.white,
    fontFamily: typography.displayMedium.fontFamily,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  previewContent: {
    maxWidth: '90%',
    width: '100%',
  },
  previewCoverWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 24,
    marginBottom: 18,
  },
  previewInfo: {
    alignItems: 'center',
    gap: 6,
  },
  previewTitle: {
    color: colors.white,
    fontFamily: typography.displaySmall.fontFamily,
    fontSize: typography.displaySmall.fontSize,
    letterSpacing: typography.displaySmall.letterSpacing,
    lineHeight: typography.displaySmall.lineHeight,
    textAlign: 'center',
  },
  previewAction: {
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
    backgroundColor: colors.surface,
  },
  previewActionText: {
    color: colors.text,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    letterSpacing: typography.labelLarge.letterSpacing,
  },
  previewArtist: {
    color: colors.secondary,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    letterSpacing: typography.labelLarge.letterSpacing,
    lineHeight: typography.labelLarge.lineHeight,
  },
});