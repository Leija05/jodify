import React, { useRef, useEffect, useCallback, useImperativeHandle } from 'react';
import { View, Text, PanResponder, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { colors, radius } from '@theme';

interface TimelineSliderProps {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
  onSlidingStart?: () => void;
  onSlidingComplete?: () => void;
  style?: StyleProp<ViewStyle>;
  trackHeight?: number;
  thumbSize?: number;
  showPreview?: boolean;
  previewTime?: number;
  showLabels?: boolean;
}

export const TimelineSlider = React.forwardRef<{ seekTo: (seconds: number) => void }, TimelineSliderProps>(
  (
    {
      position,
      duration,
      onSeek,
      onSlidingStart,
      onSlidingComplete,
      style,
      trackHeight = 4,
      thumbSize = 14,
      showPreview = false,
      previewTime,
      showLabels = true,
    },
    ref
  ) => {
    const [dragPosition, setDragPosition] = React.useState<number | null>(null);
    const panResponder = useRef<ReturnType<typeof PanResponder.create> | null>(null);
    const trackWidth = useRef(0);
    const isDragging = useRef(false);

    const startPosRef = useRef(position);
    const lastTimeRef = useRef(position);

    const seekTo = useCallback(
      (seconds: number) => {
        const clamped = Math.max(0, Math.min(seconds, duration));
        setDragPosition(null);
        onSeek(clamped);
      },
      [duration, onSeek]
    );

    useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

    useEffect(() => {
      panResponder.current = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gestureState) => Math.abs(gestureState.dx) > 3,
        onPanResponderGrant: (event, gestureState) => {
          isDragging.current = true;
          onSlidingStart?.();
          const basePos = position;
          startPosRef.current = basePos;
          if (trackWidth.current > 0 && Math.abs(gestureState.dx) < 2) {
            const locX = Math.max(0, Math.min(event.nativeEvent.locationX, trackWidth.current));
            const tappedTime = (locX / trackWidth.current) * duration;
            lastTimeRef.current = tappedTime;
            setDragPosition(tappedTime);
          }
        },
        onPanResponderMove: (_event, gestureState) => {
          if (trackWidth.current <= 0 || duration <= 0) return;
          const deltaSeconds = (gestureState.dx / trackWidth.current) * duration;
          const newTime = Math.max(0, Math.min(duration, startPosRef.current + deltaSeconds));
          lastTimeRef.current = newTime;
          setDragPosition(newTime);
        },
        onPanResponderRelease: () => {
          isDragging.current = false;
          const finalTime = lastTimeRef.current;
          setDragPosition(null);
          onSeek(finalTime);
          onSlidingComplete?.();
        },
        onPanResponderTerminate: () => {
          isDragging.current = false;
          setDragPosition(null);
          onSlidingComplete?.();
        },
      });
    }, [duration, position, onSeek, onSlidingStart, onSlidingComplete]);

    const currentPos = dragPosition !== null ? dragPosition : position;
    const progressPercent = duration > 0 ? Math.min(Math.max((currentPos / duration) * 100, 0), 100) : 0;

    const formatTime = (seconds: number) => {
      if (!Number.isFinite(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <View style={[styles.container, style]} {...panResponder.current?.panHandlers}>
        <View
          style={styles.touchArea}
          onLayout={(e) => {
            trackWidth.current = e.nativeEvent.layout.width;
          }}
        >
          <View style={[styles.track, { height: trackHeight }]} />
          <View style={[styles.activeTrack, { height: trackHeight, width: `${progressPercent}%` }]} />
          <View
            style={[
              styles.thumb,
              {
                width: thumbSize,
                height: thumbSize,
                borderRadius: thumbSize / 2,
                left: `${progressPercent}%`,
                top: trackHeight / 2,
                transform: [{ translateX: -thumbSize / 2 }, { translateY: -thumbSize / 2 }],
              },
            ]}
          />
        </View>

        {showLabels && (
          <View style={styles.timeLabels}>
            <Text style={styles.timeLabel}>{formatTime(currentPos)}</Text>
            <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
          </View>
        )}

        {showPreview && previewTime !== undefined && (
          <View style={styles.preview}>
            <Text style={styles.previewTime}>{formatTime(previewTime)}</Text>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 8,
  },
  touchArea: {
    position: 'relative',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  track: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  activeTrack: {
    position: 'absolute',
    left: 0,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
  },
  thumb: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'JetBrainsMono_400Regular',
    fontVariant: ['tabular-nums'],
  },
  preview: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surfaceSolid,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  previewTime: {
    color: colors.secondary,
    fontSize: 11,
    fontFamily: 'JetBrainsMono_400Regular',
  },
});

TimelineSlider.displayName = 'TimelineSlider';