import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { radius } from '../../theme';

const ROW_HEIGHT = 68;

function Pulse() {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.pulse, { opacity }]} />;
}

interface Props {
  rows?: number;
}

/** Esqueleto de carga con pulso sutil para listas de canciones. */
export function SkeletonList({ rows = 6 }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.row}>
          <Pulse />
          <View style={styles.texts}>
            <View style={[styles.line, styles.lineName]} />
            <View style={[styles.line, styles.lineArtist]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    height: ROW_HEIGHT,
  },
  pulse: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  texts: {
    flex: 1,
    gap: 8,
  },
  line: {
    height: 11,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  lineName: {
    width: '62%',
  },
  lineArtist: {
    width: '38%',
  },
});
