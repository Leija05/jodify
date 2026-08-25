import { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { Animated, Easing, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import type { LyricsLine } from '../../lib/types';
import { colors, typography } from '../../theme';

interface Props {
  lines: LyricsLine[];
  currentTime: number;
  synced: boolean;
  onSeek: (seconds: number) => void;
}

const LINE_HEIGHT = 38;
const VISIBLE_LINES = 7;

export function KaraokeLyrics({ lines, currentTime, synced, onSeek }: Props) {
  const flatListRef = useRef<FlatList<LyricsLine>>(null);
  const lastActiveIndex = useRef(-1);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(-1);

  const computedActiveIndex = useMemo(() => {
    if (!synced || lines.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      const lineTime = lines[i]?.time ?? Number.POSITIVE_INFINITY;
      if (lineTime <= currentTime + 0.3) idx = i;
      else break;
    }
    return idx;
  }, [lines, currentTime, synced]);

  useEffect(() => {
    if (computedActiveIndex !== activeIndex) {
      setActiveIndex(computedActiveIndex);
    }
  }, [computedActiveIndex]);

  const anims = useRef<Animated.Value[]>([]);
  if (anims.current.length !== lines.length) {
    anims.current = lines.map((_, i) => new Animated.Value(i === activeIndex ? 1 : 0));
  }

  useEffect(() => {
    if (anims.current.length !== lines.length) {
      anims.current = lines.map((_, i) => new Animated.Value(i === activeIndex ? 1 : 0));
    }
  }, [lines.length, activeIndex]);

  useEffect(() => {
    lines.forEach((_, i) => {
      const anim = anims.current[i];
      if (!anim) return;
      const target = i === activeIndex ? 1 : 0;
      Animated.spring(anim, {
        toValue: target,
        damping: 16,
        stiffness: 180,
        useNativeDriver: true,
      }).start();
    });
  }, [activeIndex, lines]);

  useEffect(() => {
    if (activeIndex >= 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ])
      ).start();
    }
  }, [activeIndex, glowAnim]);

  const scrollToActive = useCallback(() => {
    if (activeIndex >= 0 && flatListRef.current && activeIndex !== lastActiveIndex.current) {
      lastActiveIndex.current = activeIndex;
      flatListRef.current.scrollToIndex({
        index: activeIndex,
        animated: true,
        viewPosition: 0.4,
        viewOffset: (VISIBLE_LINES * LINE_HEIGHT) / 2,
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    scrollToActive();
  }, [activeIndex, scrollToActive]);

  const renderItem = useCallback(({ item, index }: { item: LyricsLine; index: number }) => {
    const active = index === activeIndex;
    const progress = anims.current[index] ?? new Animated.Value(0);
    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.93, 1.05],
    });
    const translateY = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [3, 0],
    });

    const glowOpacity = active ? glowAnim : new Animated.Value(0);

    return (
      <TouchableOpacity
        key={index}
        activeOpacity={0.7}
        onPress={() => {
          if (synced) onSeek(item.time);
        }}
        style={styles.lineWrap}
      >
        <Animated.View style={[
          styles.lineContainer,
          { opacity, transform: [{ scale }, { translateY }] }
        ]}>
          <Animated.Text
            style={[
              styles.line,
              active && styles.lineActive,
              !synced && styles.linePlain,
              { opacity },
            ]}
          >
            {item.text}
          </Animated.Text>
          {active && (
            <Animated.View pointerEvents="none" style={[
              styles.glow,
              { opacity: glowOpacity },
            ]} />
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  }, [activeIndex, synced, onSeek, glowAnim]);

  const keyExtractor = useCallback((_item: LyricsLine, index: number) => String(index), []);

  const contentContainerStyle = useMemo(() => ({
    paddingVertical: (VISIBLE_LINES * LINE_HEIGHT) / 2 + 40,
  }), []);

  return (
    <FlatList
      ref={flatListRef}
      data={lines}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      style={styles.list}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      getItemLayout={(_, index) => ({ length: LINE_HEIGHT, offset: index * LINE_HEIGHT, index })}
      initialScrollIndex={Math.max(0, activeIndex - 3)}
      initialNumToRender={15}
      windowSize={VISIBLE_LINES * 3}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  lineWrap: {
    height: LINE_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  lineContainer: {
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  line: {
    color: colors.textMuted,
    fontFamily: typography.headlineSmall.fontFamily,
    fontSize: 18,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  linePlain: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15.5,
    color: colors.textMuted,
  },
  lineActive: {
    color: colors.white,
    fontFamily: typography.displaySmall.fontFamily,
    fontSize: 26,
    letterSpacing: -0.5,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  glow: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: -3,
    bottom: -3,
    backgroundColor: 'rgba(127,0,255,0.4)',
    borderRadius: 18,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
});