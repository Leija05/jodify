import React from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { colors, radius, elevation } from '@theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  innerPadding?: number;
}

export const GlassCard = React.forwardRef<View, GlassCardProps>(
  ({ children, style, elevated = false, innerPadding = 16, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[
          styles.container,
          elevated ? elevation.level2 : elevation.level1,
          { padding: innerPadding },
          style,
        ]}
        {...props}
      >
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.cardOuter,
    overflow: 'hidden',
  },
});

GlassCard.displayName = 'GlassCard';