import React from 'react';
import { View, Text, StyleProp, ViewStyle, TextStyle, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableFluid } from './PressableFluid';
import { colors, typography, radius, spacing } from '@theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void } | undefined;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  iconColor?: string;
}

export const EmptyState = React.forwardRef<View, EmptyStateProps>(
  ({ icon, title, subtitle, action, iconSize = 48, style, titleStyle, subtitleStyle, iconColor = colors.textMuted, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[
          styles.container,
          style,
        ]}
        {...props}
      >
        <Ionicons name={icon} size={iconSize} color={iconColor} />
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>}
        {action && (
          <PressableFluid
            onPress={action.onPress}
            haptic="light"
            style={styles.action}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </PressableFluid>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    color: colors.text,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: typography.headlineMedium.fontSize,
    letterSpacing: typography.headlineMedium.letterSpacing,
    lineHeight: typography.headlineMedium.lineHeight,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    lineHeight: typography.bodyMedium.lineHeight,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
  },
  actionText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
    fontWeight: '600',
  },
});

EmptyState.displayName = 'EmptyState';