import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadows } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
  padding?: number;
}

export function GlassCard({ children, style, glow = false, padding = 14 }: Props) {
  return (
    <View style={[styles.card, { padding }, glow && styles.glow, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    ...shadows.card,
  },
  glow: {
    ...shadows.glow,
  },
});