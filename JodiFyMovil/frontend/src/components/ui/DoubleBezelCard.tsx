import React from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { colors, radius, elevation } from '@theme';

interface DoubleBezelCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  elevated?: boolean;
  innerPadding?: number;
  outerPadding?: number;
}

export const DoubleBezelCard = React.forwardRef<View, DoubleBezelCardProps>(
  ({ children, style, innerStyle, elevated = false, innerPadding = 16, outerPadding = 2, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[
          styles.outer,
          elevated ? elevation.level2 : elevation.level1,
          { padding: outerPadding },
          style,
        ]}
        {...props}
      >
        <View style={[styles.inner, { padding: innerPadding, borderRadius: radius.cardInner }, innerStyle]}>{children}</View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.cardOuter,
    overflow: 'hidden',
  },
  inner: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
});

DoubleBezelCard.displayName = 'DoubleBezelCard';