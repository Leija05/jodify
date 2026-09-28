import React from 'react';
import { View, Text, Image, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableFluid } from '@components/ui/PressableFluid';
import { EqualizerBars } from '@components/ui/EqualizerBars';
import { colors, radius, typography } from '@theme';
import type { Song } from '@lib/types';
import { pickCoverUrl, resolveArtist, resolveSongTitle } from '@lib/utils';

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

export const CoverArt = React.forwardRef<View, { source?: any; size: number; radiusSize: number; style?: StyleProp<ViewStyle> }>(
  ({ source, size, radiusSize, style, ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    React.useEffect(() => {
      setHasError(false);
    }, [source?.uri]);

    if (!source?.uri || hasError) {
      return (
        <LinearGradient
          ref={ref as any}
          colors={['#7F00FF', '#00E5FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.coverPlaceholder,
            { width: size, height: size, borderRadius: radiusSize },
            style,
          ]}
          {...props}
        >
          <Ionicons name="musical-notes" size={Math.max(16, size * 0.42)} color="#FFFFFF" />
        </LinearGradient>
      );
    }

    return (
      <View
        ref={ref as any}
        style={[
          styles.coverContainer,
          { width: size, height: size, borderRadius: radiusSize },
          style,
        ]}
      >
        <Image
          source={source}
          style={{ width: size, height: size, borderRadius: radiusSize }}
          resizeMode="cover"
          onError={() => setHasError(true)}
          {...props}
        />
      </View>
    );
  }
);

CoverArt.displayName = 'CoverArt';

export const SongRow = React.memo(
  React.forwardRef<View, SongRowProps>(
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
      onDownload: _onDownload,
      downloaded = false,
      onAddToQueue: _onAddToQueue,
      onPlayNext: _onPlayNext,
      right,
      style,
      coverSize = 56,
    },
    ref
  ) => {
    const coverUrl = pickCoverUrl(song);
    const artist = resolveArtist(song);
    const title = resolveSongTitle(song);
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
            {title}
          </Text>
          {artist && (
            <Text style={[styles.artist, isCurrent && styles.artistCurrent]} numberOfLines={1}>
              {artist}
            </Text>
          )}
        </View>

        {right ?? (
          <View style={styles.actions}>
            {downloaded && (
              <View style={styles.downloadedBadge}>
                <Ionicons name="cloud-done" size={16} color={colors.success} />
              </View>
            )}
            {onLike && !liked && (
              <PressableFluid onPress={onLike} haptic="light" hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="heart-outline" size={20} color={colors.textMuted} />
              </PressableFluid>
            )}
            {onUnlike && liked && (
              <PressableFluid onPress={onUnlike} haptic="light" hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="heart" size={20} color="#FF0055" />
              </PressableFluid>
            )}
            {onLongPress && (
              <PressableFluid onPress={onLongPress} haptic="light" hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
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
        contentStyle={styles.contentWrap}
        hitSlop={6}
      >
        {content}
      </PressableFluid>
    );
  })
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#0c0c16',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 4,
  },
  containerCurrent: {
    backgroundColor: 'rgba(127, 0, 255, 0.16)',
    borderColor: 'rgba(127, 0, 255, 0.45)',
  },
  contentWrap: {
    width: '100%',
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
  coverContainer: {
    overflow: 'hidden',
    backgroundColor: '#12121c',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  titleCurrent: {
    color: colors.secondary,
    fontFamily: typography.headlineMedium.fontFamily,
  },
  artist: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
  },
  artistCurrent: {
    color: colors.secondary,
    opacity: 0.85,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  downloadedBadge: {
    padding: 6,
    marginRight: 2,
  },
  actionBtn: {
    padding: 6,
    borderRadius: radius.pill,
  },
});

SongRow.displayName = 'SongRow';