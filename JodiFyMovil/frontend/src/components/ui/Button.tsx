import React from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableFluid } from './PressableFluid';
import { colors, typography, radius, gradients, elevation } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-comfortable' | 'icon-generous';

type HapticKind = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: (() => void) | undefined;
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  disabled?: boolean | undefined;
  loading?: boolean | undefined;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean | undefined;
  style?: any;
  testID?: string | undefined;
  haptic?: HapticKind | undefined;
}

const VARIANT_STYLES = {
  primary: {
    background: 'gradient',
    textColor: colors.white,
    borderColor: 'transparent',
    shadow: { ...elevation.level2, shadowColor: colors.primary },
  },
  secondary: {
    background: 'glass',
    textColor: colors.white,
    borderColor: colors.borderStrong,
    shadow: { shadowOpacity: 0, elevation: 0 },
  },
  ghost: {
    background: 'none',
    textColor: colors.text,
    borderColor: 'transparent',
    shadow: { shadowOpacity: 0, elevation: 0 },
  },
  destructive: {
    background: 'error',
    textColor: colors.white,
    borderColor: 'transparent',
    shadow: { ...elevation.level2, shadowColor: colors.error },
  },
  outline: {
    background: 'none',
    textColor: colors.primary,
    borderColor: colors.primaryStrong,
    shadow: { shadowOpacity: 0, elevation: 0 },
  },
};

interface SizeConfig {
  width?: number;
  height?: number;
  paddingHorizontal?: number;
  fontSize?: number;
  iconSize?: number;
  gap?: number;
  borderRadius: number;
}

const SIZE_CONFIG: Record<ButtonSize, SizeConfig> = {
  sm: { height: 40, paddingHorizontal: 16, fontSize: 13, iconSize: 16, gap: 6, borderRadius: radius.pill },
  md: { height: 48, paddingHorizontal: 20, fontSize: 14, iconSize: 18, gap: 8, borderRadius: radius.pill },
  lg: { height: 56, paddingHorizontal: 24, fontSize: 15, iconSize: 20, gap: 10, borderRadius: radius.pill },
  xl: { height: 64, paddingHorizontal: 32, fontSize: 16, iconSize: 22, gap: 12, borderRadius: radius.pill },
  icon: { width: 48, height: 48, borderRadius: 9999 },
  'icon-comfortable': { width: 52, height: 52, borderRadius: 9999 },
  'icon-generous': { width: 56, height: 56, borderRadius: 9999 },
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  testID,
  haptic = 'medium',
}: ButtonProps) {
  const config = SIZE_CONFIG[size];
  const variantStyle = VARIANT_STYLES[variant];
  const isIconOnly = size.startsWith('icon');
  const showChildren = !isIconOnly;
  const textFontSize = config.fontSize ?? typography.labelLarge.fontSize;
  const contentGap = config.gap ?? 8;

  const background = (() => {
    if (variant === 'primary') {
      return (
        <LinearGradient
          colors={gradients.play}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      );
    }
    if (variant === 'destructive') {
      return (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.error, borderRadius: config.borderRadius }]} />
      );
    }
    if (variant === 'secondary') {
      return (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.surface, borderRadius: config.borderRadius, borderWidth: 1, borderColor: colors.borderStrong },
          ]}
        />
      );
    }
    if (variant === 'outline') {
      return (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'transparent', borderRadius: config.borderRadius, borderWidth: 1.5, borderColor: colors.primaryStrong },
          ]}
        />
      );
    }
    if (variant === 'ghost') {
      return (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'transparent', borderRadius: config.borderRadius },
          ]}
        />
      );
    }
    return null;
  })();

  const content = showChildren ? (
    <View style={[
      styles.content,
      { gap: contentGap },
      isIconOnly && styles.contentIcon,
    ]}>
      {loading ? (
        <ActivityIndicator size="small" color={variantStyle.textColor} />
      ) : leftIcon ? (
        <View>{leftIcon}</View>
      ) : null}
      <Text
        style={[
          styles.label,
          { fontSize: textFontSize, fontFamily: typography.labelLarge.fontFamily, color: variantStyle.textColor },
          loading && styles.labelLoading,
        ]}
        numberOfLines={1}
      >
        {children}
      </Text>
      {rightIcon && !loading && <View>{rightIcon}</View>}
    </View>
  ) : (
    <View style={styles.contentIcon}>
      {children}
    </View>
  );

  return (
    <PressableFluid
      onPress={onPress}
      disabled={disabled || loading}
      haptic={haptic}
      style={[
        styles.button,
        {
          height: config.height,
          width: isIconOnly ? config.width : fullWidth ? '100%' : undefined,
          borderRadius: config.borderRadius,
          paddingHorizontal: isIconOnly ? 0 : config.paddingHorizontal,
          ...variantStyle.shadow,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      testID={testID}
    >
      {background}
      <View style={styles.contentWrapper} pointerEvents="none">
        {content}
      </View>
    </PressableFluid>
  );
}

export function IconButton({
  icon,
  onPress,
  variant = 'ghost',
  size = 'icon-comfortable',
  disabled,
  style,
  testID,
  haptic = 'light',
  ...props
}: {
  icon: React.ReactNode;
  onPress?: (() => void) | undefined;
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  disabled?: boolean | undefined;
  style?: any;
  testID?: string | undefined;
  haptic?: HapticKind | undefined;
}) {
  return (
    <Button
      onPress={onPress}
      variant={variant}
      size={size}
      disabled={disabled}
      style={style}
      testID={testID}
      haptic={haptic}
      {...props}
    >
      {icon}
    </Button>
  );
}

export function Chip({
  children,
  onPress,
  variant = 'default',
  leadingIcon,
  trailingIcon,
  selected = false,
  disabled,
  style,
  testID,
}: {
  children: React.ReactNode;
  onPress?: (() => void) | undefined;
  variant?: ('default' | 'primary' | 'destructive') | undefined;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  selected?: boolean | undefined;
  disabled?: boolean | undefined;
  style?: any;
  testID?: string | undefined;
}) {
  const isPrimary = variant === 'primary' || selected;
  const isDestructive = variant === 'destructive';
  
  const bgColor = isPrimary
    ? colors.primarySoft
    : isDestructive
    ? colors.errorSoft
    : 'rgba(255,255,255,0.06)';
  
  const borderColor = isPrimary
    ? colors.primaryStrong
    : isDestructive
    ? 'rgba(255,61,92,0.4)'
    : colors.border;
  
  const textColor = isPrimary
    ? colors.white
    : isDestructive
    ? colors.error
    : colors.text;

  return (
    <PressableFluid
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      style={[
        styles.chip,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: 1,
        },
        style,
      ]}
      testID={testID}
    >
      <View style={styles.chipContent}>
        {leadingIcon && <View style={styles.chipIcon}>{leadingIcon}</View>}
        <Text style={[typography.labelMedium, { color: textColor }]}>{children}</Text>
        {trailingIcon && <View style={styles.chipIcon}>{trailingIcon}</View>}
      </View>
    </PressableFluid>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  contentWrapper: {
    flex: 1,
    zIndex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentIcon: {
    paddingHorizontal: 0,
  },
  label: {
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  labelLoading: {
    opacity: 0.7,
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipIcon: {
    flexShrink: 0,
  },
});