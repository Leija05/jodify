import React, { useMemo } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EqualizerBars } from '@components/ui/EqualizerBars';
import { PressableFluid } from '@components/ui/PressableFluid';
import { colors } from '@theme';
import { resolveArtist } from '@lib/utils';
import type { Song } from '@lib/types';

interface SongInfoProps {
  song: Song;
  titleOpacity: Animated.Value;
  isBuffering: boolean;
  sleepRemaining: number;
  cancelSleepTimer: () => void;
  error: string | null;
  liked?: boolean;
  onLike?: () => void;
}

export const SongInfo = React.forwardRef<View, SongInfoProps>(
  ({ song, titleOpacity, isBuffering, sleepRemaining, cancelSleepTimer, error, liked = false, onLike }, ref) => {
    const artist = useMemo(() => resolveArtist(song), [song]);

    return (
      <Animated.View
        ref={ref}
        style={[
          styles.container,
          { opacity: titleOpacity },
        ]}
      >
        <View style={styles.mainRow}>
          <View style={styles.texts}>
            <Text style={styles.title} numberOfLines={1}>
              {song.name}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {artist ?? 'Artista desconocido'}
            </Text>
          </View>

          {onLike && (
            <PressableFluid
              onPress={onLike}
              haptic={liked ? 'medium' : 'light'}
              style={styles.likeBtn}
              hitSlop={12}
              testID="fullscreen-like-btn"
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={28}
                color={liked ? colors.accent : 'rgba(255,255,255,0.7)'}
              />
            </PressableFluid>
          )}
        </View>

        {/* Studio Audio Quality Badges (Apple Music Master / Hi-Res & Spatial Audio) */}
        <View style={styles.badgesRow}>
          <View style={styles.audioBadge}>
            <Ionicons name="sparkles" size={11} color={colors.secondary} style={styles.badgeIcon} />
            <Text style={styles.badgeText}>HI-RES LOSSLESS</Text>
            <Text style={styles.badgeSub}>24-BIT/96kHz</Text>
          </View>

          <View style={[styles.audioBadge, styles.atmosBadge]}>
            <Text style={styles.badgeText}>DOLBY ATMOS</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="warning-outline" size={14} color={colors.error} />
            <Text style={styles.errorText} numberOfLines={2}>
              {error}
            </Text>
          </View>
        )}

        {isBuffering && (
          <View style={styles.bufferingRow}>
            <EqualizerBars playing bars={4} height={12} barWidth={2.5} color={colors.secondary} />
            <Text style={styles.bufferingText}>Cargando audio en alta fidelidad…</Text>
          </View>
        )}

        {sleepRemaining > 0 && (
          <View style={styles.sleepRow}>
            <Ionicons name="moon" size={14} color={colors.warning} />
            <Text style={styles.sleepText}>
              Se pausará en {Math.ceil(sleepRemaining / 60000)} min
            </Text>
            <PressableFluid onPress={cancelSleepTimer} haptic="light" style={styles.sleepCancel}>
              <Text style={styles.sleepCancelText}>Cancelar</Text>
            </PressableFluid>
          </View>
        )}
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 28,
    marginTop: 18,
    marginBottom: 6,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    color: colors.white,
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  artist: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.72)',
    letterSpacing: -0.2,
    marginTop: 3,
  },
  likeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  audioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 4,
  },
  atmosBadge: {
    backgroundColor: 'rgba(127, 0, 255, 0.12)',
    borderColor: 'rgba(127, 0, 255, 0.25)',
  },
  badgeIcon: {
    marginRight: 1,
  },
  badgeText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.4,
  },
  badgeSub: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.2,
  },
  bufferingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  bufferingText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: colors.secondary,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 61, 92, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: colors.error,
    flex: 1,
  },
  sleepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  sleepText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: colors.warning,
    flex: 1,
  },
  sleepCancel: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sleepCancelText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: colors.white,
  },
});

SongInfo.displayName = 'SongInfo';