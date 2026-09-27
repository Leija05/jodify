import React, { useMemo } from 'react';
import { Animated, View, Image, StyleSheet, Dimensions } from 'react-native';
import { PressableFluid } from '@components/ui/PressableFluid';
import { VinylDisc } from '@components/player/VinylDisc';
import { pickCoverUrl } from '@lib/utils';
import { getSongPalette } from '@lib/palette';
import type { Song } from '@lib/types';

interface ShowcaseHeroProps {
  song: Song;
  coverScale: Animated.Value;
  vinylScale: Animated.Value;
  isPlaying: boolean;
  displayMode: 'cover' | 'vinyl';
  onToggleMode: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_SIZE = Math.min(320, Math.max(260, SCREEN_WIDTH * 0.78));

export const ShowcaseHero = React.forwardRef<View, ShowcaseHeroProps>(
  ({ song, coverScale, vinylScale, isPlaying, displayMode, onToggleMode }, ref) => {
    const coverUrl = useMemo(() => pickCoverUrl(song), [song]);
    const palette = useMemo(() => getSongPalette(song), [song]);

    return (
      <View ref={ref} style={styles.container}>
        {displayMode === 'vinyl' ? (
          <PressableFluid onPress={onToggleMode} haptic="medium" style={styles.pressable}>
            <Animated.View style={{ transform: [{ scale: vinylScale }] }}>
              <VinylDisc song={song} size={HERO_SIZE} isPlaying={isPlaying} />
            </Animated.View>
          </PressableFluid>
        ) : (
          <PressableFluid onPress={onToggleMode} haptic="medium" style={styles.pressable}>
            <Animated.View
              style={[
                styles.coverHeroWrap,
                {
                  transform: [{ scale: coverScale }],
                  shadowColor: palette.primary,
                },
              ]}
            >
              {/* Double-Bezel Hardware Architecture (as directed in high-end-visual-design) */}
              <View style={[styles.outerBezel, { width: HERO_SIZE, height: HERO_SIZE }]}>
                <View style={styles.innerCore}>
                  {coverUrl ? (
                    <Image
                      source={{ uri: coverUrl }}
                      style={styles.coverImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.fallback, { backgroundColor: palette.primary }]} />
                  )}

                  {/* Specular Inner Bevel Highlight (Apple Music glass card look) */}
                  <View style={styles.specularHighlight} pointerEvents="none" />
                </View>
              </View>
            </Animated.View>
          </PressableFluid>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverHeroWrap: {
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 36,
    elevation: 20,
  },
  outerBezel: {
    padding: 6,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  innerCore: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0C0C14',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    width: '100%',
    height: '100%',
  },
  specularHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
});

ShowcaseHero.displayName = 'ShowcaseHero';
