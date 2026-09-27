import React from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { PressableFluid } from './PressableFluid';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, typography } from '@theme';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'glass' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'iconComfortable' | 'iconGenerous';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  style?: any;
  testID?: string;
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' | false;
}

const gradients = {
  primary: ['#7F00FF', '#00E5FF'],
  accent: ['#FF007A', '#7F00FF'],
};

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border: string; gradient?: string[] }> = {
  primary: { bg: colors.primary, text: colors.white, border: colors.primary, gradient: gradients.primary },
  secondary: { bg: colors.secondary, text: colors.white, border: colors.secondary, gradient: gradients.primary },
  accent: { bg: colors.accent, text: colors.white, border: colors.accent, gradient: gradients.accent },
  glass: { bg: 'rgba(255,255,255,0.05)', text: colors.text, border: colors.border },
  ghost: { bg: 'transparent', text: colors.text, border: 'transparent' },
  danger: { bg: colors.error, text: colors.white, border: colors.error, gradient: [colors.error, '#E0304A'] },
};

const sizeConfigs: Record<ButtonSize, { height: number; paddingHorizontal: number; minWidth: number; fontSize: number; gap: number; iconSize: number; size?: number }> = {
  sm: { height: 40, paddingHorizontal: 16, minWidth: 80, fontSize: 13, gap: 8, iconSize: 18 },
  md: { height: 48, paddingHorizontal: 20, minWidth: 96, fontSize: 14, gap: 8, iconSize: 20 },
  lg: { height: 56, paddingHorizontal: 24, minWidth: 112, fontSize: 16, gap: 10, iconSize: 22 },
  xl: { height: 64, paddingHorizontal: 32, minWidth: 140, fontSize: 18, gap: 12, iconSize: 24 },
  icon: { size: 48, height: 48, paddingHorizontal: 0, minWidth: 48, fontSize: 0, gap: 0, iconSize: 22 },
  iconComfortable: { size: 52, height: 52, paddingHorizontal: 0, minWidth: 52, fontSize: 0, gap: 0, iconSize: 24 },
  iconGenerous: { size: 56, height: 56, paddingHorizontal: 0, minWidth: 56, fontSize: 0, gap: 0, iconSize: 26 },
};

export const Button = React.forwardRef<View, ButtonProps>(
  (
    {
      children,
      onPress,
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      iconSize,
      style,
      testID,
      haptic = 'medium',
      ...props
    },
    ref
  ) => {
    const { bg, text, border, gradient } = variantStyles[variant];
    const sizeConfig = sizeConfigs[size];
    const isIconOnly = size.startsWith('icon');
    const fontSize = isIconOnly ? undefined : sizeConfig.fontSize;

    const containerStyle = [
      {
        height: sizeConfig.height,
        paddingHorizontal: isIconOnly ? 0 : sizeConfig.paddingHorizontal,
        borderRadius: radius.pill,
        backgroundColor: disabled ? 'rgba(255,255,255,0.08)' : bg,
        borderWidth: variant === 'glass' || variant === 'ghost' ? 1 : 0,
        borderColor: disabled ? colors.border : border,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: sizeConfig.gap,
        width: fullWidth ? '100%' : undefined,
        minWidth: sizeConfig.minWidth,
      },
      style,
    ] as any;

    const content = (
      <>
        {loading ? (
          <ActivityIndicator size="small" color={text} />
        ) : (
          <>
            {leftIcon && <Ionicons name={leftIcon} size={iconSize ?? sizeConfig.iconSize} color={text} />}
            <Text
              style={{
                color: text,
                fontFamily: typography.labelMedium.fontFamily,
                fontSize: fontSize,
                letterSpacing: typography.labelMedium.letterSpacing,
                lineHeight: typography.labelMedium.lineHeight,
                fontWeight: '600',
              }}
            >
              {children}
            </Text>
            {rightIcon && <Ionicons name={rightIcon} size={iconSize ?? sizeConfig.iconSize} color={text} />}
          </>
        )}
      </>
    );

    const renderButton = () => (
      <PressableFluid
        ref={ref}
        onPress={onPress}
        disabled={disabled || loading}
        haptic={haptic}
        style={containerStyle}
        {...(testID ? { testID } : {})}
        {...props}
      >
        {content}
      </PressableFluid>
    );

    if (gradient && variant !== 'glass' && variant !== 'ghost') {
      return (
        <LinearGradient
          colors={gradient as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={containerStyle}
        >
          {content}
        </LinearGradient>
      );
    }

    return renderButton();
  }
);

Button.displayName = 'Button';