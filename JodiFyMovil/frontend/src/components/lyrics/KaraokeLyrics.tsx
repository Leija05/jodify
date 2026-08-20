import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LyricsLine } from '../../lib/types';
import { colors, fonts } from '../../theme';

interface Props {
  lines: LyricsLine[];
  currentTime: number;
  synced: boolean;
  onSeek: (seconds: number) => void;
}

const LINE_HEIGHT = 30;

export function KaraokeLyrics({ lines, currentTime, synced, onSeek }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const activeIndex = useMemo(() => {
    if (!synced) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= currentTime + 0.3) idx = i;
      else break;
    }
    return idx;
  }, [lines, currentTime, synced]);

  const anims = useRef<Animated.Value[]>([]);
  if (anims.current.length !== lines.length) {
    anims.current = lines.map((_, i) => new Animated.Value(i === activeIndex ? 1 : 0));
  }

  useEffect(() => {
    lines.forEach((_, i) => {
      const target = i === activeIndex ? 1 : 0;
      Animated.timing(anims.current[i], {
        toValue: target,
        duration: 260,
        useNativeDriver: true,
      }).start();
    });
  }, [activeIndex, lines]);

  useEffect(() => {
    if (activeIndex >= 0) {
      scrollRef.current?.scrollTo({ y: Math.max(0, activeIndex * LINE_HEIGHT - LINE_HEIGHT * 2), animated: true });
    }
  }, [activeIndex]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {lines.map((line, i) => {
        const active = i === activeIndex;
        const progress = anims.current[i] ?? new Animated.Value(0);
        const opacity = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.45, 1],
        });
        return (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            onPress={() => {
              if (synced) onSeek(line.time);
            }}
            style={styles.lineWrap}
          >
            <Animated.Text
              style={[
                styles.line,
                active && styles.lineActive,
                !synced && styles.linePlain,
                { opacity },
              ]}
            >
              {line.text}
            </Animated.Text>
            {active ? <Animated.View pointerEvents="none" style={[styles.glow, { opacity }]} /> : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingVertical: 24,
  },
  lineWrap: {
    height: LINE_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 8,
    position: 'relative',
  },
  line: {
    color: colors.textMuted,
    fontFamily: fonts.title,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  linePlain: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  lineActive: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 21,
    letterSpacing: -0.4,
  },
  glow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(127,0,255,0.14)',
    borderRadius: 12,
  },
});