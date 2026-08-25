import { TimelineSlider } from '../TimelineSlider';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { formatTime } from '../../../lib/utils';
import { colors, typography } from '../../../theme';

interface Props {
  controlsOpacity: Animated.Value;
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
}

export function TimelineZone({
  controlsOpacity,
  position,
  duration,
  onSeek,
}: Props) {
  return (
    <Animated.View style={[{ opacity: controlsOpacity }, styles.timelineZone]}>
      <TimelineSlider position={position} duration={duration} onSeek={onSeek} />
      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatTime(position)}</Text>
        <Text style={styles.time}>{formatTime(duration)}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  timelineZone: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  time: {
    color: colors.textDim,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
    lineHeight: typography.labelMedium.lineHeight,
  },
});