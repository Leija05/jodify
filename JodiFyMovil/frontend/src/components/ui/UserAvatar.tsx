import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { UserAccess, CommunityUser } from '@lib/types';
import { resolveAvatarUrl, getFrameDefinition } from '@lib/avatar';
import { colors } from '@theme';

interface UserAvatarProps {
  user?: Partial<UserAccess> | Partial<CommunityUser> | null | undefined;
  avatarUrl?: string | null | undefined;
  username?: string | null | undefined;
  frameId?: string | null | undefined;
  size?: number | undefined;
  showPresence?: boolean | undefined;
  presence?: ('online' | 'background' | 'offline') | null | undefined;
  style?: StyleProp<ViewStyle> | undefined;
}

export const UserAvatar = React.memo(function UserAvatar({
  user,
  avatarUrl,
  username,
  frameId,
  size = 48,
  showPresence = false,
  presence,
  style,
}: UserAvatarProps) {
  const resolvedUrl = useMemo(() => {
    if (avatarUrl) return avatarUrl;
    return resolveAvatarUrl(user);
  }, [avatarUrl, user]);

  const activeUsername = username || user?.username || 'JodiFy';
  const initial = (user?.display_name || activeUsername).slice(0, 1).toUpperCase();

  const activeFrameId = frameId ?? user?.avatar_frame ?? 'none';
  const frameDef = useMemo(() => getFrameDefinition(activeFrameId), [activeFrameId]);
  const hasFrame = frameDef.id !== 'none';

  const effectivePresence =
    presence ??
    user?.presence ??
    (user?.is_online === 1 || (user as any)?.online ? 'online' : 'offline');

  const presenceColor =
    effectivePresence === 'online'
      ? '#00E676'
      : effectivePresence === 'background'
      ? '#B388FF'
      : colors.textMuted;

  // Sizes
  const frameBorderWidth = hasFrame ? Math.max(2.5, Math.round(size * 0.07)) : 0;
  const innerSize = size - frameBorderWidth * 2;
  const presenceDotSize = Math.max(9, Math.round(size * 0.24));

  return (
    <View style={[styles.rootWrap, { width: size, height: size }, style]}>
      {hasFrame ? (
        <LinearGradient
          colors={frameDef.colors.slice(0, 3) as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.frameRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              shadowColor: frameDef.glowColor,
            },
          ]}
        >
          <View
            style={[
              styles.avatarInnerContainer,
              {
                width: innerSize,
                height: innerSize,
                borderRadius: innerSize / 2,
              },
            ]}
          >
            {resolvedUrl ? (
              <Image
                source={{ uri: resolvedUrl }}
                style={[styles.image, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={['#7F00FF', '#00E5FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.initialWrap, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}
              >
                <Text style={[styles.initialText, { fontSize: Math.round(innerSize * 0.44) }]}>
                  {initial}
                </Text>
              </LinearGradient>
            )}
          </View>
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.avatarInnerContainer,
            styles.noFrameBorder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          {resolvedUrl ? (
            <Image
              source={{ uri: resolvedUrl }}
              style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={['#7F00FF', '#00E5FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.initialWrap, { width: size, height: size, borderRadius: size / 2 }]}
            >
              <Text style={[styles.initialText, { fontSize: Math.round(size * 0.44) }]}>
                {initial}
              </Text>
            </LinearGradient>
          )}
        </View>
      )}

      {showPresence && (
        <View
          style={[
            styles.presenceDot,
            {
              width: presenceDotSize,
              height: presenceDotSize,
              borderRadius: presenceDotSize / 2,
              backgroundColor: presenceColor,
              right: hasFrame ? 1 : 0,
              bottom: hasFrame ? 1 : 0,
            },
          ]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  rootWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameRing: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 6,
    elevation: 6,
  },
  avatarInnerContainer: {
    backgroundColor: '#0a0a14',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  noFrameBorder: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  image: {
    backgroundColor: '#12121e',
  },
  initialWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontFamily: 'System',
    textAlign: 'center',
  },
  presenceDot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#0a0a14',
  },
});
