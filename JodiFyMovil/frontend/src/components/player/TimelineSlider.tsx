import React, { useRef, useEffect, useCallback, useImperativeHandle } from 'react';
import { View, Text, PanResponder, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { colors, radius, touch } from '@theme';

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
      thumbSize = touch.iconComfortable,
      showPreview = false,
      previewTime,
    },
    ref
  ) => {
    const [dragPosition, setDragPosition] = React.useState<number | null>(null);
    const panResponder = useRef<ReturnType<typeof PanResponder.create> | null>(null);
    const trackWidth = useRef(0);
    const isDragging = useRef(false);

    const seekTo = useCallback(
      (seconds: number) => {
        const clamped = Math.max(0, Math.min(seconds, duration));
        setDragPosition(null);
        onSeek(clamped);
      },
      [duration, onSeek]
    );

    useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

    const updateFromTouch = useCallback(
      (x: number) => {
        if (trackWidth.current <= 0) return;
        const clampedX = Math.max(0, Math.min(x, trackWidth.current));
        const ratio = clampedX / trackWidth.current;
        const newTime = ratio * duration;
        setDragPosition(newTime);
        onSeek(newTime);
      },
      [duration, onSeek]
    );

    useEffect(() => {
      panResponder.current = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gestureState) => Math.abs(gestureState.dx) > 2,
        onPanResponderGrant: (event) => {
          isDragging.current = true;
          onSlidingStart?.();
          updateFromTouch(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          updateFromTouch(event.nativeEvent.locationX);
        },
        onPanResponderRelease: () => {
          isDragging.current = false;
          setDragPosition(null);
          onSlidingComplete?.();
        },
        onPanResponderTerminate: () => {
          isDragging.current = false;
          setDragPosition(null);
          onSlidingComplete?.();
        },
      });
    }, [updateFromTouch, onSlidingStart, onSlidingComplete]);

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
          style={styles.trackWrapper}
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
                transform: [{ translateX: -thumbSize / 2 }],
              },
            ]}
          />
        </View>

        <View style={styles.timeLabels}>
          <Text style={styles.timeLabel}>{formatTime(currentPos)}</Text>
          <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
        </View>

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
  trackWrapper: {
    position: 'relative',
  },
  track: {
    backgroundColor: colors.track,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  activeTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    backgroundColor: colors.white,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: colors.primary,
    transform: [{ translateY: -12 }],
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
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