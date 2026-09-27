import React from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

export const ControlsRow = React.forwardRef<View, ControlsRowProps>(
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
            <Ionicons name="play-skip-back" size={30} color={colors.text} />
          </PressableFluid>

          <PressableFluid onPress={onTogglePlay} haptic="medium" style={styles.playBtn}>
            <View style={styles.playBtnFill}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color={colors.white} />
            </View>
          </PressableFluid>

          <PressableFluid onPress={onNext} haptic="light" style={styles.controlBtn} hitSlop={8}>
            <Ionicons name="play-skip-forward" size={30} color={colors.text} />
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
            <Ionicons name={repeat === 'one' ? 'repeat' : 'repeat'} size={24} color={repeat !== 'off' ? colors.secondary : colors.textSecondary} />
          </PressableFluid>
        </View>
      </Animated.View>
    );
  }
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127,0,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(127,0,255,0.3)',
  },
  controlBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryStrong,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  playBtnFill: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
});

ControlsRow.displayName = 'ControlsRow';