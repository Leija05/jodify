import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, PanResponder, StyleProp, ViewStyle, StyleSheet, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
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

export const Slider = React.memo(
  React.forwardRef<View, SliderProps>(
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
      const [localValue, setLocalValue] = useState(value);
      const isDragging = useRef(false);
      const trackWidth = useRef(0);
      const startValueRef = useRef(value);

      // Keep refs updated with current props
      const valueRef = useRef(value);
      valueRef.current = value;
      const minRef = useRef(min);
      minRef.current = min;
      const maxRef = useRef(max);
      maxRef.current = max;
      const stepRef = useRef(step);
      stepRef.current = step;
      const disabledRef = useRef(disabled);
      disabledRef.current = disabled;
      const onValueChangeRef = useRef(onValueChange);
      onValueChangeRef.current = onValueChange;
      const onSlidingCompleteRef = useRef(onSlidingComplete);
      onSlidingCompleteRef.current = onSlidingComplete;
      const localValueRef = useRef(localValue);
      localValueRef.current = localValue;

      // Sync local value when prop value changes from outside (not dragging)
      useEffect(() => {
        if (!isDragging.current) {
          setLocalValue(value);
        }
      }, [value]);

      const applyStep = useCallback((val: number): number => {
        const mn = minRef.current;
        const mx = maxRef.current;
        const stp = stepRef.current;
        if (stp > 0) {
          const stepped = Math.round((val - mn) / stp) * stp + mn;
          return Math.max(mn, Math.min(mx, Math.round(stepped * 1000) / 1000));
        }
        return Math.max(mn, Math.min(mx, val));
      }, []);

      const updateValueFromRelativeX = useCallback(
        (relX: number) => {
          if (trackWidth.current <= 0) return;
          const mn = minRef.current;
          const mx = maxRef.current;
          const clampedX = Math.max(0, Math.min(relX, trackWidth.current));
          const ratio = clampedX / trackWidth.current;
          const raw = mn + ratio * (mx - mn);
          const finalVal = applyStep(raw);
          setLocalValue(finalVal);
          onValueChangeRef.current?.(finalVal);
        },
        [applyStep]
      );

      // Stable PanResponder created once - never recreated during touch!
      const panResponder = useRef(
        PanResponder.create({
          // Allow parent ScrollView to handle vertical gestures freely
          onStartShouldSetPanResponder: () => false,
          onStartShouldSetPanResponderCapture: () => false,
          onMoveShouldSetPanResponderCapture: () => false,
          onMoveShouldSetPanResponder: (_event, gestureState) => {
            if (disabledRef.current) return false;
            // Only capture if user is dragging horizontally more than vertically
            return Math.abs(gestureState.dx) > 6 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
          },
          onPanResponderGrant: (event: GestureResponderEvent, gestureState) => {
            if (disabledRef.current) return;
            isDragging.current = true;
            startValueRef.current = localValueRef.current;
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // If it's a tap/click on track, update directly
            if (Math.abs(gestureState.dx) < 4 && trackWidth.current > 0) {
              const locX = event.nativeEvent.locationX;
              updateValueFromRelativeX(locX);
            }
          },
          onPanResponderMove: (_event, gestureState) => {
            if (disabledRef.current || trackWidth.current <= 0) return;
            const mn = minRef.current;
            const mx = maxRef.current;
            const deltaRatio = gestureState.dx / trackWidth.current;
            const rawVal = startValueRef.current + deltaRatio * (mx - mn);
            const finalVal = applyStep(rawVal);
            setLocalValue(finalVal);
            onValueChangeRef.current?.(finalVal);
          },
          onPanResponderRelease: () => {
            isDragging.current = false;
            onSlidingCompleteRef.current?.(localValueRef.current);
          },
          onPanResponderTerminate: () => {
            isDragging.current = false;
            onSlidingCompleteRef.current?.(localValueRef.current);
          },
          onPanResponderTerminationRequest: () => true,
        })
      ).current;

      const progressPercent =
        max > min ? Math.min(Math.max(((localValue - min) / (max - min)) * 100, 0), 100) : 0;

      const TRACK_TOUCH_HEIGHT = 44;

      return (
        <View ref={ref} style={[styles.container, style]} {...panResponder.panHandlers}>
          <View
            style={[styles.trackWrapper, { height: TRACK_TOUCH_HEIGHT }]}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0) trackWidth.current = w;
            }}
          >
            <View
              style={[
                styles.track,
                { height: trackHeight, top: (TRACK_TOUCH_HEIGHT - trackHeight) / 2 },
                trackStyle,
              ]}
            />
            <View
              style={[
                styles.activeTrack,
                {
                  height: trackHeight,
                  width: `${progressPercent}%`,
                  top: (TRACK_TOUCH_HEIGHT - trackHeight) / 2,
                },
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
                    top: TRACK_TOUCH_HEIGHT / 2,
                    transform: [{ translateX: -thumbSize / 2 }, { translateY: -thumbSize / 2 }],
                    opacity: disabled ? 0.4 : 1,
                  },
                  thumbStyle,
                ]}
              />
            )}
          </View>
        </View>
      );
    }
  )
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  trackWrapper: {
    position: 'relative',
    justifyContent: 'center',
    width: '100%',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.track,
    borderRadius: radius.pill,
  },
  activeTrack: {
    position: 'absolute',
    left: 0,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  thumb: {
    position: 'absolute',
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