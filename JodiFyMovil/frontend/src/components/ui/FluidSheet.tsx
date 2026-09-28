import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Animated, View, StyleProp, ViewStyle, PanResponder, Dimensions, StyleSheet, Text, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius, motion, elevation } from '@theme';
import { useReducedMotion } from '@hooks/useReducedMotion';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FluidSheetProps {
  visible: boolean;
  onClose: () => void;
  snapPoints?: number[];
  title?: string;
  titleAction?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  handleStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  backdropOpacity?: number;
  dismissThreshold?: number;
}

interface FluidSheetRef {
  open: () => void;
  close: () => void;
  snapTo: (index: number) => void;
}

const DEFAULT_SNAP_POINTS = [0.25, 0.5, 0.9];

export const FluidSheet = forwardRef<FluidSheetRef, FluidSheetProps>(
  (
    {
      visible,
      onClose,
      snapPoints = DEFAULT_SNAP_POINTS,
      title,
      titleAction,
      children,
      style,
      handleStyle,
      contentStyle,
      backdropOpacity = 0.5,
      dismissThreshold = 100,
    },
    ref
  ) => {
    const reduced = useReducedMotion();
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const currentSnapIndex = useRef(0);
    const panResponder = useRef<ReturnType<typeof PanResponder.create> | null>(null);
    const isAnimating = useRef(false);

    const sheetHeight = SCREEN_HEIGHT * Math.max(...snapPoints);
    const minTranslate = SCREEN_HEIGHT - sheetHeight;

    useImperativeHandle(ref, () => ({
      open: () => animateToSnap(currentSnapIndex.current),
      close: animateOut,
      snapTo: (index) => {
        if (index >= 0 && index < snapPoints.length) {
          animateToSnap(index);
        }
      },
    }));

    const animateToSnap = (index: number) => {
      if (isAnimating.current) return;
      isAnimating.current = true;
      currentSnapIndex.current = index;
      const snap = snapPoints[index] ?? 0.5;
      const targetY = SCREEN_HEIGHT - SCREEN_HEIGHT * snap;

      if (reduced) {
        translateY.setValue(targetY);
        isAnimating.current = false;
        return;
      }

      Animated.spring(translateY, {
        toValue: targetY,
        ...motion.springDrawer,
        useNativeDriver: true,
      }).start(() => {
        isAnimating.current = false;
      });
    };

    const animateIn = () => {
      if (isAnimating.current) return;
      isAnimating.current = true;
      translateY.setValue(SCREEN_HEIGHT);
      backdropAnim.setValue(0);

      if (reduced) {
        translateY.setValue(minTranslate);
        backdropAnim.setValue(backdropOpacity);
        isAnimating.current = false;
        return;
      }

      Animated.parallel([
        Animated.spring(translateY, { toValue: minTranslate, ...motion.springDrawer, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: backdropOpacity, duration: motion.duration.normal, useNativeDriver: true }),
      ]).start(() => {
        isAnimating.current = false;
      });
    };

    const animateOut = () => {
      if (isAnimating.current) return;
      isAnimating.current = true;

      if (reduced) {
        translateY.setValue(SCREEN_HEIGHT);
        backdropAnim.setValue(0);
        onClose();
        isAnimating.current = false;
        return;
      }

      Animated.parallel([
        Animated.spring(translateY, { toValue: SCREEN_HEIGHT, ...motion.springDrawer, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: motion.duration.fast, useNativeDriver: true }),
      ]).start(() => {
        onClose();
        isAnimating.current = false;
      });
    };

    useEffect(() => {
      if (visible) animateIn();
      else animateOut();
    }, [visible]);

    useEffect(() => {
      panResponder.current = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gestureState) => Math.abs(gestureState.dy) > 3,
        onPanResponderGrant: () => {
          translateY.extractOffset();
          isAnimating.current = false;
        },
        onPanResponderMove: (_event, gestureState) => {
          const dy = gestureState.dy;
          const currentBase = (translateY as any)._value ?? 0;
          let newY = currentBase + dy;
          newY = Math.min(Math.max(newY, minTranslate), SCREEN_HEIGHT);
          translateY.setValue(newY);
        },
        onPanResponderRelease: (_event, gestureState) => {
          translateY.flattenOffset();
          const { dy, vy } = gestureState;
          const currentY = (translateY as any)._value ?? SCREEN_HEIGHT;

          if (dy > dismissThreshold || (dy > 50 && vy > 0.4)) {
            animateOut();
            return;
          }

          let closestIndex = 0;
          let closestDist = Infinity;
          snapPoints.forEach((point, i) => {
            const targetY = SCREEN_HEIGHT - SCREEN_HEIGHT * point;
            const dist = Math.abs(currentY - targetY);
            if (dist < closestDist) {
              closestDist = dist;
              closestIndex = i;
            }
          });

          animateToSnap(closestIndex);
        },
        onPanResponderTerminate: () => {
          translateY.flattenOffset();
          animateToSnap(currentSnapIndex.current);
        },
      });
    }, [backdropAnim, dismissThreshold, minTranslate, reduced, snapPoints]);

    if (!visible && ((translateY as any)._value ?? SCREEN_HEIGHT) >= SCREEN_HEIGHT) return null;

    return (
      <Animated.View
        style={[
          styles.container,
          { opacity: backdropAnim },
          style,
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Animated.View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => true}
          onResponderRelease={animateOut}
        >
          <Animated.View
            style={[styles.backdrop, { opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}
          />
        </Animated.View>

        <Animated.View
          {...panResponder.current?.panHandlers}
          style={[
            styles.sheet,
            { transform: [{ translateY }] },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14, 14, 22, 0.97)' }]} />
          )}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, handleStyle]} />
          </View>

          {(title || titleAction) && (
            <View style={styles.header}>
              {title && <Text style={styles.title}>{title}</Text>}
              {titleAction && <View style={styles.titleAction}>{titleAction}</View>}
            </View>
          )}

          <View style={[styles.content, contentStyle]}>{children}</View>
        </Animated.View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 20, 30, 0.88)',
    borderTopLeftRadius: radius.sheetOuter,
    borderTopRightRadius: radius.sheetOuter,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    maxHeight: SCREEN_HEIGHT * 0.9,
    ...elevation.level4,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.borderStrong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  titleAction: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
});

FluidSheet.displayName = 'FluidSheet';