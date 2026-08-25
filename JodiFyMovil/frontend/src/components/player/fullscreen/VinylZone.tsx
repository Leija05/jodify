import { VinylDisc } from '../VinylDisc';
import { Animated, StyleSheet, View } from 'react-native';

interface Props {
  song: any;
  vinylScale: Animated.Value;
  size: number;
  isPlaying: boolean;
}

export function VinylZone({
  song,
  vinylScale,
  size,
  isPlaying,
}: Props) {
  return (
    <View style={styles.vinylZone}>
      <Animated.View style={{ transform: [{ scale: vinylScale }] }}>
        <VinylDisc song={song} size={size} playing={isPlaying} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  vinylZone: {
    alignItems: 'center',
    paddingTop: 12,
  },
});