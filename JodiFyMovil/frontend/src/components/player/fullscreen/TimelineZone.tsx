import React from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { TimelineSlider } from '@components/player/TimelineSlider';
import { usePlayerStore } from '@stores/player.store';

interface TimelineZoneProps {
  controlsOpacity: Animated.Value;
  position?: number;
  duration?: number;
  onSeek: (seconds: number) => void;
  onSlidingStart?: () => void;
  onSlidingComplete?: () => void;
}

export const TimelineZone = React.memo(
  React.forwardRef<View, TimelineZoneProps>(
    ({ controlsOpacity, position: propPosition, duration: propDuration, onSeek, onSlidingStart, onSlidingComplete }, ref) => {
      const storePosition = usePlayerStore((s) => s.position);
      const storeDuration = usePlayerStore((s) => s.duration);
      const position = propPosition ?? storePosition;
      const duration = propDuration ?? storeDuration;
      const formatTime = (seconds: number) => {
        if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      const remainingTime = Math.max(0, duration - position);

      return (
        <Animated.View
          ref={ref}
          style={[
            styles.container,
            { opacity: controlsOpacity },
          ]}
        >
          <TimelineSlider
            position={position}
            duration={duration}
            onSeek={onSeek}
            onSlidingStart={onSlidingStart}
            onSlidingComplete={onSlidingComplete}
            trackHeight={4}
            thumbSize={14}
            showLabels={false}
          />

          {/* Apple Music Style Time Labels directly beneath the slider */}
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>{formatTime(position)}</Text>
            <Text style={styles.timeLabel}>
              {duration > 0 ? `-${formatTime(remainingTime)}` : '0:00'}
            </Text>
          </View>
        </Animated.View>
      );
    }
  )
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 28,
    marginTop: 10,
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
});

TimelineZone.displayName = 'TimelineZone';