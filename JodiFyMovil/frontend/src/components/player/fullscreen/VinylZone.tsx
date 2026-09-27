import React from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { VinylDisc } from '@components/player/VinylDisc';

interface VinylZoneProps {
  song: any;
  vinylScale: Animated.Value;
  size: number;
  isPlaying: boolean;
}

export const VinylZone = React.forwardRef<View, VinylZoneProps>(
  ({ song, vinylScale, size, isPlaying }, ref) => {
    return (
      <Animated.View
        ref={ref}
        style={[
          styles.container,
          { transform: [{ scale: vinylScale }] },
        ]}
      >
        <VinylDisc
          song={song}
          size={size}
          isPlaying={isPlaying}
        />
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
});