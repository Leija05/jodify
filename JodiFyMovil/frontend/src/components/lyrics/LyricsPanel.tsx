import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import type { LyricsLine } from '../../lib/types';
import { fetchLyrics, lyricsFromSong } from '../../services/lyrics.service';
import { usePlayerStore } from '../../store/player.store';
import { colors, fonts, radius } from '../../theme';
import { KaraokeLyrics } from './KaraokeLyrics';

interface Props {
  maxHeight?: number;
}

export function LyricsPanel({ maxHeight = 140 }: Props) {
  const { currentSong, position, seek } = usePlayerStore();
  const [lines, setLines] = useState<LyricsLine[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLines(null);
    if (!currentSong) return;

    const fromSong = lyricsFromSong(currentSong.lyrics);
    if (fromSong) {
      setLines(fromSong);
      return;
    }

    setLoading(true);
    void fetchLyrics(currentSong.name, currentSong.artist).then((l) => {
      setLines(l);
      setLoading(false);
    });
  }, [currentSong?.id]);

  const synced = useMemo(
    () => (lines ? lines.length > 0 && lines.every((l) => l.time >= 0) : false),
    [lines],
  );

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!loading) return;
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [loading, anim]);

  const progress = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 150],
  });

  if (!currentSong) return null;

  return (
    <View style={[styles.container, { maxHeight }]}>
      <View style={styles.panel}>
        {lines && lines.length > 0 ? (
          <KaraokeLyrics lines={lines} currentTime={position} synced={synced} onSeek={seek} />
        ) : loading ? (
          <View style={styles.loading}>
            <Animated.View
              style={[styles.loadingBar, { transform: [{ translateX: progress }] }]}
            />
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyDot} />
            <View style={[styles.emptyDot, { marginLeft: 8 }]} />
            <View style={[styles.emptyDot, { marginLeft: 8, opacity: 0.5 }]} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 12,
    overflow: 'hidden',
  },
  panel: {
    backgroundColor: 'rgba(16,16,22,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: radius.md,
    padding: 14,
    overflow: 'hidden',
  },
  loading: {
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loadingBar: {
    height: 3,
    width: 100,
    borderRadius: radius.pill,
    backgroundColor: `rgba(127,0,255,0.6)`,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});