import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { clamp } from '../../lib/utils';
import { colors, gradients, radius } from '../../theme';

interface Props {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
}

const TRACK_HEIGHT = 5;

export function TimelineSlider({ position, duration, onSeek }: Props) {
  const [width, setWidth] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubFraction, setScrubFraction] = useState<number | null>(null);
  const widthRef = useRef(0);

  const fraction = duration > 0 ? clamp(position / duration, 0, 1) : 0;
  const shownFraction = scrubFraction ?? fraction;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const computeFraction = useCallback((x: number) => {
    if (widthRef.current <= 0) return 0;
    return clamp(x / widthRef.current, 0, 1);
  }, []);

  const commitSeek = useCallback(
    (f: number) => {
      if (duration > 0) onSeek(f * duration);
    },
    [duration, onSeek],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        setScrubbing(true);
        setScrubFraction(computeFraction(evt.nativeEvent.locationX));
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        setScrubFraction(computeFraction(evt.nativeEvent.locationX));
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        const f = computeFraction(evt.nativeEvent.locationX);
        setScrubFraction(null);
        setScrubbing(false);
        commitSeek(f);
      },
      onPanResponderTerminate: () => {
        setScrubbing(false);
        setScrubFraction(null);
      },
    }),
  ).current;

  return (
    <View style={styles.container} onLayout={handleLayout} {...panResponder.panHandlers}>
      <View style={styles.track}>
        <LinearGradient
          colors={[gradients.primary[0], gradients.primary[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${shownFraction * 100}%` }]}
        />
      </View>
      <View
        style={[
          styles.thumb,
          {
            left: width > 0 ? shownFraction * width - 7 : 0,
            opacity: scrubbing ? 1 : 0,
          },
        ]}
      />
      <View
        style={[
          styles.thumbGhost,
          {
            left: width > 0 ? shownFraction * width - 5 : 0,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white,
    shadowColor: colors.secondary,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  thumbGhost: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
});