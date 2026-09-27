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

    const updateValue = useCallback(
      (x: number) => {
        if (trackWidth.current <= 0) return;
        const clampedX = Math.max(0, Math.min(x, trackWidth.current));
        const ratio = clampedX / trackWidth.current;
        const newValue = min + ratio * (max - min);
        const steppedValue = step > 0 ? Math.round(newValue / step) * step : newValue;
        const finalValue = Math.max(min, Math.min(max, steppedValue));
        currentValueRef.current = finalValue;
        setLocalValue(finalValue);
        onValueChange(finalValue);
      },
      [min, max, step, onValueChange]
    );

    useEffect(() => {
      panResponder.current = PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_event, gestureState) => !disabled && Math.abs(gestureState.dx) > 2,
        onPanResponderGrant: (event) => {
          isDragging.current = true;
          updateValue(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          if (!disabled) updateValue(event.nativeEvent.locationX);
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
    }, [disabled, updateValue, onSlidingComplete]);

    const progressPercent = max > min ? Math.min(Math.max(((localValue - min) / (max - min)) * 100, 0), 100) : 0;

    return (
      <View ref={ref} style={[styles.container, style]} {...panResponder.current?.panHandlers}>
        <View
          style={styles.trackWrapper}
          onLayout={(e) => {
            trackWidth.current = e.nativeEvent.layout.width;
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
              { height: trackHeight, width: `${progressPercent}%` },
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