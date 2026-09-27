import React from 'react';
import { View, Text, Image, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableFluid } from '@components/ui/PressableFluid';
import { EqualizerBars } from '@components/ui/EqualizerBars';
import { colors, radius, typography } from '@theme';
import type { Song } from '@lib/types';
import { pickCoverUrl, resolveArtist } from '@lib/utils';

interface SongRowProps {
  song: Song;
  isCurrent?: boolean;
  isPlaying?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onLike?: (() => void) | undefined;
  onUnlike?: (() => void) | undefined;
  liked?: boolean;
  onDownload?: (() => void) | undefined;
  downloaded?: boolean;
  onAddToQueue?: (() => void) | undefined;
  onPlayNext?: (() => void) | undefined;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  coverSize?: number;
}

export const CoverArt = React.forwardRef<Image, { source?: any; size: number; radiusSize: number }>(
  ({ source, size, radiusSize, ...props }, ref) => (
    <Image
      ref={ref}
      source={source}
      style={[
        styles.cover,
        { width: size, height: size, borderRadius: radiusSize },
      ]}
      resizeMode="cover"
      {...props}
    />
  )
);

CoverArt.displayName = 'CoverArt';

export const SongRow = React.forwardRef<View, SongRowProps>(
  (
    {
      song,
      isCurrent = false,
      isPlaying = false,
      onPress,
      onLongPress,
      onLike,
      onUnlike,
      liked = false,
      onDownload,
      downloaded = false,
      onAddToQueue,
      onPlayNext,
      right,
      style,
      coverSize = 56,
    },
    ref
  ) => {
    const coverUrl = pickCoverUrl(song);
    const artist = resolveArtist(song);
    const coverRadius = coverSize > 80 ? radius.md : radius.sm;

    const content = (
      <View style={styles.row}>
        <View style={[styles.coverWrapper, { width: coverSize, height: coverSize }]}>
          <CoverArt
            source={coverUrl ? { uri: coverUrl } : undefined}
            size={coverSize}
            radiusSize={coverRadius}
          />
          {isCurrent && isPlaying && (
            <View style={styles.playingOverlay}>
              <EqualizerBars playing bars={3} height={14} barWidth={3} color={colors.white} />
            </View>
          )}
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, isCurrent && styles.titleCurrent]} numberOfLines={1}>
            {song.name}
          </Text>
          {artist && (
            <Text style={[styles.artist, isCurrent && styles.artistCurrent]} numberOfLines={1}>
              {artist}
            </Text>
          )}
        </View>

        {right ?? (
          <View style={styles.actions}>
            {onLike && !liked && (
              <PressableFluid onPress={onLike} haptic="light" hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="heart-outline" size={22} color={colors.textMuted} />
              </PressableFluid>
            )}
            {onUnlike && liked && (
              <PressableFluid onPress={onUnlike} haptic="light" hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="heart" size={22} color={colors.accent} />
              </PressableFluid>
            )}
            {onDownload && (
              <PressableFluid onPress={onDownload} haptic="light" hitSlop={8} style={styles.actionBtn}>
                <Ionicons name={downloaded ? 'cloud-done' : 'cloud-download-outline'} size={22} color={downloaded ? colors.success : colors.textMuted} />
              </PressableFluid>
            )}
            {onAddToQueue && (
              <PressableFluid onPress={onAddToQueue} haptic="light" hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="list-outline" size={22} color={colors.textMuted} />
              </PressableFluid>
            )}
            {onPlayNext && (
              <PressableFluid onPress={onPlayNext} haptic="light" hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="play-skip-forward-outline" size={22} color={colors.textMuted} />
              </PressableFluid>
            )}
          </View>
        )}
      </View>
    );

    return (
      <PressableFluid
        ref={ref}
        onPress={onPress}
        onLongPress={onLongPress}
        haptic="light"
        style={[
          styles.container,
          isCurrent && styles.containerCurrent,
          style,
        ]}
        hitSlop={8}
      >
        {content}
      </PressableFluid>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  containerCurrent: {
    backgroundColor: 'rgba(127, 0, 255, 0.12)',
    borderColor: 'rgba(127, 0, 255, 0.35)',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minWidth: 0,
  },
  coverWrapper: {
    position: 'relative',
    flexShrink: 0,
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: '#12121c',
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 7, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 3,
  },
  title: {
    color: colors.text,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  titleCurrent: {
    color: colors.secondary,
    fontWeight: '700',
  },
  artist: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
  },
  artistCurrent: {
    color: colors.secondary,
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionBtn: {
    padding: 6,
    borderRadius: radius.pill,
  },
});

SongRow.displayName = 'SongRow';