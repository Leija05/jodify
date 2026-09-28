import React, { useRef, useCallback, useImperativeHandle } from 'react';
import { View, Text, PanResponder, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { colors, radius } from '@theme';

interface TimelineSliderProps {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
  onSlidingStart?: (() => void) | undefined;
  onSlidingComplete?: (() => void) | undefined;
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
    const trackWidth = useRef(0);
    const isDragging = useRef(false);

    const posRef = useRef(position);
    posRef.current = position;
    const durRef = useRef(duration);
    durRef.current = duration;
    const seekRef = useRef(onSeek);
    seekRef.current = onSeek;
    const slidingStartRef = useRef(onSlidingStart);
    slidingStartRef.current = onSlidingStart;
    const slidingCompleteRef = useRef(onSlidingComplete);
    slidingCompleteRef.current = onSlidingComplete;

    const startPosRef = useRef(position);
    const lastTimeRef = useRef(position);

    const seekTo = useCallback(
      (seconds: number) => {
        const dur = durRef.current;
        const clamped = Math.max(0, Math.min(seconds, dur));
        setDragPosition(null);
        seekRef.current?.(clamped);
      },
      []
    );

    useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_event, gestureState) => Math.abs(gestureState.dx) > 3,
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderGrant: (event, gestureState) => {
          isDragging.current = true;
          slidingStartRef.current?.();
          const basePos = posRef.current;
          startPosRef.current = basePos;
          const dur = durRef.current;
          if (trackWidth.current > 0 && Math.abs(gestureState.dx) < 4) {
            const locX = Math.max(0, Math.min(event.nativeEvent.locationX, trackWidth.current));
            const tappedTime = (locX / trackWidth.current) * dur;
            lastTimeRef.current = tappedTime;
            setDragPosition(tappedTime);
          }
        },
        onPanResponderMove: (_event, gestureState) => {
          const dur = durRef.current;
          if (trackWidth.current <= 0 || dur <= 0) return;
          const deltaSeconds = (gestureState.dx / trackWidth.current) * dur;
          const newTime = Math.max(0, Math.min(dur, startPosRef.current + deltaSeconds));
          lastTimeRef.current = newTime;
          setDragPosition(newTime);
        },
        onPanResponderRelease: () => {
          isDragging.current = false;
          const finalTime = lastTimeRef.current;
          setDragPosition(null);
          seekRef.current?.(finalTime);
          slidingCompleteRef.current?.();
        },
        onPanResponderTerminate: () => {
          isDragging.current = false;
          setDragPosition(null);
          slidingCompleteRef.current?.();
        },
        onPanResponderTerminationRequest: () => true,
      })
    ).current;

    const currentPos = dragPosition !== null ? dragPosition : position;
    const progressPercent = duration > 0 ? Math.min(Math.max((currentPos / duration) * 100, 0), 100) : 0;

    const formatTime = (seconds: number) => {
      if (!Number.isFinite(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const TOUCH_AREA_HEIGHT = 32;

    return (
      <View style={[styles.container, style]} {...panResponder.panHandlers}>
        <View
          style={styles.touchArea}
          onLayout={(e) => {
            trackWidth.current = e.nativeEvent.layout.width;
          }}
        >
          <View style={[styles.trackWrapper, { height: trackHeight }]}>
            <View style={[styles.track, { height: trackHeight }]} />
            <View
              style={[
                styles.activeTrack,
                {
                  height: trackHeight,
                  width: `${progressPercent}%`,
                },
              ]}
            />
          </View>
          <View
            style={[
              styles.thumb,
              {
                width: thumbSize,
                height: thumbSize,
                borderRadius: thumbSize / 2,
                left: `${progressPercent}%`,
                top: (TOUCH_AREA_HEIGHT - thumbSize) / 2,
                transform: [{ translateX: -thumbSize / 2 }],
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
    height: 32,
    position: 'relative',
    justifyContent: 'center',
  },
  trackWrapper: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  track: {
    width: '100%',
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