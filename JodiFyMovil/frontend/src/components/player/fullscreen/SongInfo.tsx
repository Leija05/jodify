import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { PressableFluid } from '../../ui/PressableFluid';
import { EqualizerBars } from '../../ui/EqualizerBars';
import { colors, typography, radius } from '../../../theme';

interface Props {
  song: any;
  titleOpacity: Animated.Value;
  coverScale: Animated.Value;
  isBuffering: boolean;
  sleepRemaining: number;
  cancelSleepTimer: () => void;
  error: string | null;
}

export function SongInfo({
  song,
  titleOpacity,
  coverScale,
  isBuffering,
  sleepRemaining,
  cancelSleepTimer,
  error,
}: Props) {
  return (
    <Animated.View style={[{ opacity: titleOpacity }, styles.songInfo]}>
      <Animated.View style={{ transform: [{ scale: coverScale }] }}>
        <Text style={styles.title} numberOfLines={2}>
          {song.name}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {song.artist ?? 'Desconocido'}
          {song.album ? ` · ${song.album}` : ''}
        </Text>
      </Animated.View>
      <View style={styles.chips}>
        {isBuffering ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>Cargando…</Text>
          </View>
        ) : (
          <EqualizerBars playing={true} bars={5} height={14} barWidth={2.5} color={colors.secondary} />
        )}
        {sleepRemaining > 0 && (
          <PressableFluid onPress={cancelSleepTimer} haptic style={styles.chip}>
            <Ionicons name="moon" size={12} color={colors.warning} />
            <Text style={styles.chipText}>{Math.ceil(sleepRemaining / 60000)} min</Text>
          </PressableFluid>
        )}
        {error ? (
          <View style={[styles.chip, styles.chipError]}>
            <Ionicons name="alert-circle" size={12} color={colors.error} />
            <Text style={[styles.chipText, styles.chipTextError]} numberOfLines={1}>
              {error}
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  songInfo: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 22,
  },
  title: {
    color: colors.white,
    fontFamily: typography.displaySmall.fontFamily,
    fontSize: typography.displaySmall.fontSize,
    letterSpacing: typography.displaySmall.letterSpacing,
    lineHeight: typography.displaySmall.lineHeight,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  artist: {
    color: colors.secondary,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    letterSpacing: typography.labelLarge.letterSpacing,
    lineHeight: typography.labelLarge.lineHeight,
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    minHeight: 26,
    maxWidth: '90%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,184,0,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.4)',
  },
  chipError: {
    backgroundColor: 'rgba(255,61,102,0.14)',
    borderColor: 'rgba(255,61,102,0.45)',
    maxWidth: 180,
  },
  chipText: {
    color: colors.warning,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
    lineHeight: typography.labelMedium.lineHeight,
  },
  chipTextError: {
    color: colors.error,
  },
});