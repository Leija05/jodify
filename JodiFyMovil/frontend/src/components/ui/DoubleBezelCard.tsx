import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, elevation } from '../../theme';

interface DoubleBezelCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  pressable?: boolean;
  onPress?: () => void;
  testID?: string;
}

export function DoubleBezelCard({
  children,
  style,
  elevated = false,
  pressable = false,
  onPress,
  testID,
}: DoubleBezelCardProps) {
  return (
    <View
      style={[
        styles.outer,
        elevated && styles.outerElevated,
        style,
      ]}
      testID={testID}
      accessibilityRole={pressable ? 'button' : undefined}
      accessibilityState={{ disabled: pressable && !onPress }}
    >
      <View style={styles.inner} collapsable={false}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.cardOuter,
    padding: 4,
    ...elevation.level1,
  },
  outerElevated: {
    ...elevation.level2,
    borderColor: colors.borderStrong,
  },
  inner: {
    backgroundColor: colors.surface,
    borderRadius: radius.cardInner,
    overflow: 'hidden',
  },
});

export function DoubleBezelCardInner({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.inner, style]}>{children}</View>;
}