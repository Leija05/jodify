import React, { useRef, useEffect, useCallback } from 'react';
import { View, PanResponder, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { colors, radius, touch } from '@theme';

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  trackStyle?: StyleProp<ViewStyle>;
  thumbStyle?: StyleProp<ViewStyle>;
  activeTrackStyle?: StyleProp<ViewStyle>;
  thumbSize?: number;
  trackHeight?: number;
  showThumb?: boolean;
}

export const Slider = React.forwardRef<View, SliderProps>(
  (
    {
      value,
      onValueChange,
      onSlidingComplete,
      min = 0,
      max = 1,
      step = 0,
      disabled = false,
      style,
      trackStyle,
      thumbStyle,
      activeTrackStyle,
      thumbSize = touch.iconComfortable,
      trackHeight = 4,
      showThumb = true,
    },
    ref
  ) => {
    const [localValue, setLocalValue] = React.useState(value);
    const currentValueRef = useRef(value);
    const panResponder = useRef<ReturnType<typeof PanResponder.create> | null>(null);
    const trackWidth = useRef(0);
    const isDragging = useRef(false);

    useEffect(() => {
      if (!isDragging.current) {
        setLocalValue(value);
        currentValueRef.current = value;
      }
    }, [value]);

    const trackViewRef = useRef<View>(null);
    const trackPageX = useRef(0);
    const startValueRef = useRef(value);

    const stepValue = useCallback(
      (v: number) => {
        const stepped = step > 0 ? Math.round(v / step) * step : v;
        return Math.max(min, Math.min(max, Math.round(stepped * 100) / 100));
      },
      [min, max, step]
    );

    const updateFromPageX = useCallback(
      (pageX: number) => {
        if (trackWidth.current <= 0) return;
        const relativeX = Math.max(0, Math.min(pageX - trackPageX.current, trackWidth.current));
        const ratio = relativeX / trackWidth.current;
        const finalVal = stepValue(min + ratio * (max - min));
        currentValueRef.current = finalVal;
        setLocalValue(finalVal);
        onValueChange(finalVal);
      },
      [min, max, stepValue, onValueChange]
    );

    useEffect(() => {
      panResponder.current = PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          !disabled && Math.abs(gestureState.dx) > 6 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.4,
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          if (disabled) return;
          isDragging.current = true;
          trackViewRef.current?.measure((_x, _y, width, _height, pageX) => {
            if (width > 0) trackWidth.current = width;
            if (pageX > 0) trackPageX.current = pageX;
            updateFromPageX(event.nativeEvent.pageX);
          });
        },
        onPanResponderMove: (event, gestureState) => {
          if (disabled || trackWidth.current <= 0) return;
          if (trackPageX.current > 0) {
            updateFromPageX(event.nativeEvent.pageX);
          } else {
            const deltaRatio = gestureState.dx / trackWidth.current;
            const rawVal = startValueRef.current + deltaRatio * (max - min);
            const finalVal = stepValue(rawVal);
            currentValueRef.current = finalVal;
            setLocalValue(finalVal);
            onValueChange(finalVal);
          }
        },
        onPanResponderRelease: () => {
          isDragging.current = false;
          onSlidingComplete?.(currentValueRef.current);
        },
        onPanResponderTerminate: () => {
          isDragging.current = false;
          onSlidingComplete?.(currentValueRef.current);
        },
      });
    }, [disabled, min, max, stepValue, updateFromPageX, onSlidingComplete]);

    const progressPercent = max > min ? Math.min(Math.max(((localValue - min) / (max - min)) * 100, 0), 100) : 0;

    return (
      <View ref={ref} style={[styles.container, style]} {...panResponder.current?.panHandlers}>
        <View
          ref={trackViewRef}
          style={styles.trackWrapper}
          onLayout={() => {
            trackViewRef.current?.measure((_x, _y, width, _height, pageX) => {
              if (width > 0) trackWidth.current = width;
              if (pageX > 0) trackPageX.current = pageX;
            });
          }}
        >
          <View
            style={[
              styles.track,
              { height: trackHeight },
              trackStyle,
            ]}
          />
          <View
            style={[
              styles.activeTrack,
              { height: trackHeight, width: `${progressPercent}%`, top: (48 - trackHeight) / 2 },
              activeTrackStyle,
            ]}
          />
          {showThumb && (
            <View
              style={[
                styles.thumb,
                {
                  width: thumbSize,
                  height: thumbSize,
                  borderRadius: thumbSize / 2,
                  left: `${progressPercent}%`,
                  top: 24,
                  transform: [{ translateX: -thumbSize / 2 }, { translateY: -thumbSize / 2 }],
                },
                thumbStyle,
              ]}
            />
          )}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  trackWrapper: {
    position: 'relative',
    justifyContent: 'center',
    height: 48,
  },
  track: {
    backgroundColor: colors.track,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  activeTrack: {
    position: 'absolute',
    left: 0,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
});

Slider.displayName = 'Slider';