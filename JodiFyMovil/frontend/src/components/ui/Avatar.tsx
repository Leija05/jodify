import React from 'react';
import { View, Text, StyleProp, ViewStyle, Image, ImageSourcePropType } from 'react-native';
import { colors, typography, elevation } from '@theme';

interface AvatarProps {
  source?: ImageSourcePropType;
  username?: string;
  size?: number;
  presence?: 'online' | 'idle' | 'dnd' | 'offline' | null;
  style?: StyleProp<ViewStyle>;
  borderWidth?: number;
  borderColor?: string;
}

const presenceColors = {
  online: '#00E676',
  idle: '#FFB300',
  dnd: '#FF3D5C',
  offline: 'rgba(255,255,255,0.3)',
};

export const Avatar = React.forwardRef<View, AvatarProps>(
  (
    {
      source,
      username,
      size = 40,
      presence = null,
      style,
      borderWidth = 1,
      borderColor,
      ...props
    },
    ref
  ) => {
    const initial = username?.slice(0, 1).toUpperCase() ?? '?';
    const fontSize = size * 0.4;
    const presenceSize = size * 0.25;
    const computedBorderColor = borderColor ?? (presence ? presenceColors[presence] : colors.primaryStrong);

    return (
      <View
        ref={ref}
        style={[
          styles.container,
          { width: size, height: size, borderColor: computedBorderColor },
          style,
        ]}
        {...props}
      >
        {source ? (
          <Image
            source={source}
            style={[
              styles.image,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          />
        ) : (
          <View
            style={[
              styles.placeholder,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          >
            <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
          </View>
        )}
        {presence && (
          <View
            style={[
              styles.presenceDot,
              {
                width: presenceSize,
                height: presenceSize,
                borderRadius: presenceSize / 2,
                backgroundColor: presenceColors[presence],
                bottom: borderWidth,
                right: borderWidth,
              },
            ]}
          />
        )}
      </View>
    );
  }
);

const styles = {
  container: {
    position: 'relative' as const,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
    borderRadius: 9999,
    overflow: 'hidden' as const,
    ...elevation.level1,
  },
  image: {
    resizeMode: 'cover' as const,
  },
  placeholder: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  initial: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontWeight: '600' as const,
  },
  presenceDot: {
    position: 'absolute' as const,
    borderWidth: 2,
    borderColor: colors.background,
  },
};

Avatar.displayName = 'Avatar';