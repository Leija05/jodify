import React from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableFluid } from '@components/ui/PressableFluid';
import { colors } from '@theme';

interface ControlsRowProps {
  controlsOpacity: Animated.Value;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  onToggleShuffle: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onCycleRepeat: () => void;
}

export const ControlsRow = React.memo(
  React.forwardRef<View, ControlsRowProps>(
    ({
    controlsOpacity,
    isPlaying,
    shuffle,
    repeat,
    onToggleShuffle,
    onPrevious,
    onTogglePlay,
    onNext,
    onCycleRepeat,
  }, ref) => {
    return (
      <Animated.View
        ref={ref}
        style={[
          styles.container,
          { opacity: controlsOpacity },
        ]}
      >
        <View style={styles.row}>
          <PressableFluid
            onPress={onToggleShuffle}
            haptic="light"
            style={[
              styles.controlBtn,
              shuffle && styles.controlBtnActive,
            ]}
            hitSlop={8}
          >
            <Ionicons name="shuffle" size={24} color={shuffle ? colors.secondary : colors.textSecondary} />
          </PressableFluid>

          <PressableFluid onPress={onPrevious} haptic="light" style={styles.controlBtn} hitSlop={8}>
            <Ionicons name="play-skip-back" size={28} color={colors.text} />
          </PressableFluid>

          <PressableFluid onPress={onTogglePlay} haptic="medium" style={styles.playBtn}>
            <LinearGradient
              colors={['#7F00FF', '#00E5FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playBtnFill}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={colors.white} />
            </LinearGradient>
          </PressableFluid>

          <PressableFluid onPress={onNext} haptic="light" style={styles.controlBtn} hitSlop={8}>
            <Ionicons name="play-skip-forward" size={28} color={colors.text} />
          </PressableFluid>

          <PressableFluid
            onPress={onCycleRepeat}
            haptic="light"
            style={[
              styles.controlBtn,
              repeat !== 'off' && styles.controlBtnActive,
            ]}
            hitSlop={8}
          >
            <Ionicons name="repeat" size={24} color={repeat !== 'off' ? colors.secondary : colors.textSecondary} />
            {repeat === 'one' && (
              <View style={styles.repeatOneBadge}>
                <Text style={styles.repeatOneText}>1</Text>
              </View>
            )}
          </PressableFluid>
        </View>
      </Animated.View>
    );
  })
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.16)',
    borderColor: 'rgba(0, 229, 255, 0.45)',
    shadowColor: '#00E5FF',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  repeatOneBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    backgroundColor: colors.secondary,
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOneText: {
    color: colors.black,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 10,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7F00FF',
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  playBtnFill: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

ControlsRow.displayName = 'ControlsRow';