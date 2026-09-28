import React from 'react';
import { Animated, View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableFluid } from '@components/ui/PressableFluid';
import { EqualizerBars } from '@components/ui/EqualizerBars';
import { colors } from '@theme';

interface UtilityRowProps {
  downloaded: boolean;
  downloading: boolean;
  onDownload: () => void;
  onEqualizer: () => void;
  onLyricsToggle: () => void;
  showLyrics: boolean;
  onLyricsFullscreen: () => void;
  hasLyrics: boolean;
  onStartRadio?: () => void;
  onOpenJam?: () => void;
  jamActive?: boolean;
}

export const UtilityRow = React.memo(
  React.forwardRef<View, UtilityRowProps>(
    ({
    downloaded,
    downloading,
    onDownload,
    onEqualizer,
    onLyricsToggle,
    showLyrics,
    onLyricsFullscreen,
    hasLyrics,
    onStartRadio,
    onOpenJam,
    jamActive = false,
  }, ref) => {
    return (
      <Animated.View ref={ref} style={styles.container}>
        <View style={styles.row}>
          {/* Apple Music Sing / Lyrics Button */}
          <PressableFluid
            onPress={onLyricsFullscreen ?? onLyricsToggle}
            disabled={!hasLyrics}
            haptic="light"
            style={[
              styles.actionPill,
              showLyrics && styles.actionPillActive,
              !hasLyrics && { opacity: 0.5 },
            ]}
            hitSlop={6}
          >
            <Ionicons
              name="mic-outline"
              size={18}
              color={showLyrics ? colors.secondary : 'rgba(255, 255, 255, 0.85)'}
            />
            <Text style={[styles.pillLabel, showLyrics && styles.pillLabelActive]}>
              Letras Sing
            </Text>
          </PressableFluid>

          {/* YouTube Music Dynamic Radio */}
          {onStartRadio && (
            <PressableFluid
              onPress={onStartRadio}
              haptic="light"
              style={styles.actionPill}
              hitSlop={6}
            >
              <Ionicons name="radio-outline" size={17} color="rgba(255, 255, 255, 0.85)" />
              <Text style={styles.pillLabel}>Radio</Text>
            </PressableFluid>
          )}

          {/* Spotify Jam Collaborative Session */}
          {onOpenJam && (
            <PressableFluid
              onPress={onOpenJam}
              haptic="light"
              style={[
                styles.actionPill,
                jamActive && styles.jamPillActive,
              ]}
              hitSlop={6}
            >
              <Ionicons
                name="people-outline"
                size={17}
                color={jamActive ? colors.secondary : 'rgba(255, 255, 255, 0.85)'}
              />
              <Text style={[styles.pillLabel, jamActive && styles.pillLabelActive]}>
                Jam
              </Text>
            </PressableFluid>
          )}

          {/* Audiophile Equalizer */}
          <PressableFluid
            onPress={onEqualizer}
            haptic="light"
            style={styles.iconCircle}
            hitSlop={8}
          >
            <Ionicons name="options-outline" size={20} color="rgba(255, 255, 255, 0.75)" />
          </PressableFluid>

          {/* Offline Download */}
          <PressableFluid
            onPress={onDownload}
            disabled={downloading}
            haptic="light"
            style={[
              styles.iconCircle,
              downloaded && styles.downloadedCircle,
            ]}
            hitSlop={8}
          >
            {downloading ? (
              <EqualizerBars playing bars={3} height={12} barWidth={2.5} color={colors.primary} />
            ) : (
              <Ionicons
                name={downloaded ? 'cloud-done' : 'cloud-download-outline'}
                size={20}
                color={downloaded ? colors.success : 'rgba(255, 255, 255, 0.75)'}
              />
            )}
          </PressableFluid>
        </View>
      </Animated.View>
    );
  })
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 28,
    marginTop: 14,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionPillActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.14)',
    borderColor: 'rgba(0, 229, 255, 0.35)',
  },
  jamPillActive: {
    backgroundColor: 'rgba(127, 0, 255, 0.18)',
    borderColor: 'rgba(127, 0, 255, 0.4)',
  },
  pillLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.1,
  },
  pillLabelActive: {
    color: colors.white,
  },
  iconCircle: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  downloadedCircle: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
});

UtilityRow.displayName = 'UtilityRow';