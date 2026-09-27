import React, { useRef } from 'react';
import { View, StyleProp, ViewStyle, Animated, StyleSheet, Easing, DimensionValue } from 'react-native';
import { colors, radius } from '@theme';

interface SkeletonProps {
  style?: StyleProp<ViewStyle>;
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  animated?: boolean;
}

export const Skeleton = React.forwardRef<View, SkeletonProps>(
  ({ style, width = '100%', height = 16, borderRadius = radius.sm, animated = true, ...props }, ref) => {
    const shimmer = useRef(new Animated.Value(-1)).current;

    React.useEffect(() => {
      if (!animated) return;
      shimmer.setValue(-1);
      const anim = Animated.loop(
        Animated.timing(shimmer, {
          toValue: 2,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      );
      anim.start();
      return () => anim.stop();
    }, [animated, shimmer]);

    const shimmerStyle = {
      transform: [
        {
          translateX: shimmer.interpolate({
            inputRange: [-1, 2],
            outputRange: ['-150%', '150%'],
          }),
        },
      ],
    };

    return (
      <View ref={ref} style={[styles.container, { width, height, borderRadius }, style]} {...props}>
        <View style={styles.base} />
        {animated && (
          <Animated.View style={[styles.shimmer, shimmerStyle]} />
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceHover,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});

Skeleton.displayName = 'Skeleton';