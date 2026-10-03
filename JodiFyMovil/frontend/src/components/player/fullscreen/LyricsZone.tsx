import React, { useRef, useEffect, useState } from 'react';
import { Animated, Text, View, StyleSheet, ScrollView } from 'react-native';
import { colors, typography } from '@theme';
import { PressableFluid } from '@components/ui/PressableFluid';
import type { LyricsLine } from '@lib/types';

import { usePlayerStore } from '@stores/player.store';

interface LyricsZoneProps {
  showLyrics: boolean;
  lyricsLoading: boolean;
  lyrics: LyricsLine[] | null;
  synced?: boolean;
  position?: number;
  onSeek: (seconds: number) => void;
  onLyricsToggle: () => void;
}

export const LyricsZone = React.memo(
  React.forwardRef<View, LyricsZoneProps>(
    ({
      showLyrics,
      lyricsLoading,
      lyrics,
      position: propPosition,
      onSeek,
      onLyricsToggle,
    }, ref) => {
      const [activeLineIndex, setActiveLineIndex] = useState(-1);
      const containerHeight = useRef(new Animated.Value(0)).current;
      const activeIndex = useRef(-1);
      const scrollRef = useRef<ScrollView>(null);

      // Targeted subscription: Only re-renders when active lyric line actually changes
      // Applies 250ms vocal anticipation offset for natural singing sync
      useEffect(() => {
        if (!showLyrics || !lyrics || lyrics.length === 0) {
          setActiveLineIndex(-1);
          activeIndex.current = -1;
          return;
        }

        const computeLineIndex = (pos: number) => {
          const vocalPos = pos + 0.25;
          let low = 0;
          let high = lyrics.length - 1;
          let res = -1;
          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const midLine = lyrics[mid];
            if (midLine && midLine.time <= vocalPos) {
              res = mid;
              low = mid + 1;
            } else {
              high = mid - 1;
            }
          }
          return res;
        };

        const initialPos = propPosition ?? usePlayerStore.getState().position;
        const initialIdx = computeLineIndex(initialPos);
        activeIndex.current = initialIdx;
        setActiveLineIndex(initialIdx);

        if (propPosition !== undefined) return;

        const unsub = usePlayerStore.subscribe((state) => {
          const nextIdx = computeLineIndex(state.position);
          if (nextIdx !== activeIndex.current) {
            activeIndex.current = nextIdx;
            setActiveLineIndex(nextIdx);
          }
        });

        return unsub;
      }, [showLyrics, lyrics, propPosition]);

      useEffect(() => {
        if (activeLineIndex >= 0 && scrollRef.current) {
          scrollRef.current.scrollTo({
            y: Math.max(0, activeLineIndex * 46 - 80),
            animated: true,
          });
        }
      }, [activeLineIndex]);

      if (!showLyrics) return null;

    if (lyricsLoading) {
      return (
        <Animated.View
          ref={ref}
          style={[
            styles.container,
            { opacity: 1 },
          ]}
        >
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Cargando letra…</Text>
          </View>
        </Animated.View>
      );
    }

    if (!lyrics || !lyrics.length) {
      return (
        <Animated.View
          ref={ref}
          style={[
            styles.container,
            { opacity: 1 },
          ]}
        >
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Esta canción no tiene letra disponible</Text>
            <PressableFluid onPress={onLyricsToggle} haptic="light" style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>Ocultar</Text>
            </PressableFluid>
          </View>
        </Animated.View>
      );
    }

    return (
      <Animated.View
        ref={ref}
        style={[
          styles.container,
          { opacity: 1 },
        ]}
        onLayout={(e) => {
          containerHeight.setValue(e.nativeEvent.layout.height);
        }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          nestedScrollEnabled={true}
        >
          {lyrics.map((line, index) => {
            const isActive = index === activeLineIndex;
            const isPast = index < activeLineIndex;
            const isFuture = index > activeLineIndex;

            return (
              <PressableFluid
                key={index}
                onPress={() => onSeek(line.time)}
                haptic="selection"
                style={[
                  styles.line,
                  isActive && styles.lineActive,
                  isPast && styles.linePast,
                  isFuture && styles.lineFuture,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
              >
                <Animated.Text
                  style={[
                    styles.lineText,
                    isActive && styles.lineTextActive,
                    isPast && styles.lineTextPast,
                    isFuture && styles.lineTextFuture,
                  ]}
                >
                  {line.text}
                </Animated.Text>
              </PressableFluid>
            );
          })}
        </ScrollView>
      </Animated.View>
    );
  })
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    maxHeight: 280,
  },
  list: {
    gap: 12,
  },
  line: {
    paddingVertical: 4,
  },
  lineActive: {
    backgroundColor: 'rgba(127,0,255,0.1)',
    borderRadius: 12,
  },
  linePast: {
    opacity: 0.5,
  },
  lineFuture: {
    opacity: 0.3,
  },
  lineText: {
    color: colors.text,
    fontFamily: typography.bodyLarge.fontFamily,
    fontSize: typography.bodyLarge.fontSize,
    letterSpacing: typography.bodyLarge.letterSpacing,
    lineHeight: typography.bodyLarge.lineHeight,
    textAlign: 'center',
  },
  lineTextActive: {
    color: colors.secondary,
    fontFamily: typography.headlineSmall.fontFamily,
    textShadowColor: colors.secondary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  lineTextPast: {
    color: colors.textSecondary,
  },
  lineTextFuture: {
    color: colors.textDim,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    textAlign: 'center',
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
  },
  emptyBtnText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
  },
});

LyricsZone.displayName = 'LyricsZone';