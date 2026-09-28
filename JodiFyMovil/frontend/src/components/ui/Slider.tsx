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

    const startValueRef = useRef(value);

    const stepValue = useCallback(
      (v: number) => {
        const stepped = step > 0 ? Math.round(v / step) * step : v;
        return Math.max(min, Math.min(max, Math.round(stepped * 100) / 100));
      },
      [min, max, step]
    );

    useEffect(() => {
      panResponder.current = PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_event, gestureState) => !disabled && Math.abs(gestureState.dx) > 2,
        onPanResponderGrant: (event, gestureState) => {
          if (disabled) return;
          isDragging.current = true;
          startValueRef.current = currentValueRef.current;
          if (trackWidth.current > 0 && Math.abs(gestureState.dx) < 2) {
            const locX = Math.max(0, Math.min(event.nativeEvent.locationX, trackWidth.current));
            const ratio = locX / trackWidth.current;
            const finalVal = stepValue(min + ratio * (max - min));
            currentValueRef.current = finalVal;
            setLocalValue(finalVal);
            onValueChange(finalVal);
          }
        },
        onPanResponderMove: (_event, gestureState) => {
          if (disabled || trackWidth.current <= 0) return;
          const deltaRatio = gestureState.dx / trackWidth.current;
          const rawVal = startValueRef.current + deltaRatio * (max - min);
          const finalVal = stepValue(rawVal);
          currentValueRef.current = finalVal;
          setLocalValue(finalVal);
          onValueChange(finalVal);
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
    }, [disabled, min, max, stepValue, onValueChange, onSlidingComplete]);

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