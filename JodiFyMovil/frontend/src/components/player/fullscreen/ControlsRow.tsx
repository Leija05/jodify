import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, StyleSheet, Text } from 'react-native';
import { PressableFluid } from '../../ui/PressableFluid';
import { colors, gradients } from '../../../theme';

interface Props {
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

export function ControlsRow({
  controlsOpacity,
  isPlaying,
  shuffle,
  repeat,
  onToggleShuffle,
  onPrevious,
  onTogglePlay,
  onNext,
  onCycleRepeat,
}: Props) {
  return (
    <Animated.View style={[{ opacity: controlsOpacity }, styles.controlsRow]}>
      <PressableFluid onPress={onToggleShuffle} haptic style={styles.sideBtn}>
        <Ionicons name="shuffle" size={20} color={shuffle ? colors.secondary : colors.textMuted} />
      </PressableFluid>
      <PressableFluid onPress={onPrevious} haptic style={styles.sideBtn}>
        <Ionicons name="play-skip-back" size={30} color={colors.text} />
      </PressableFluid>
      <PressableFluid onPress={onTogglePlay} haptic style={styles.playBtnWrap}>
        <LinearGradient colors={[gradients.play[0], gradients.play[1]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.playBtn}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color={colors.white} />
        </LinearGradient>
      </PressableFluid>
      <PressableFluid onPress={onNext} haptic style={styles.sideBtn}>
        <Ionicons name="play-skip-forward" size={30} color={colors.text} />
      </PressableFluid>
      <PressableFluid onPress={onCycleRepeat} haptic style={styles.sideBtn}>
        <Ionicons
          name={repeat === 'one' ? 'repeat' : 'repeat-outline'}
          size={20}
          color={repeat === 'off' ? colors.textMuted : colors.secondary}
        />
        {repeat === 'one' && <Text style={styles.repeatOne}>1</Text>}
      </PressableFluid>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 26,
    marginTop: 14,
  },
  sideBtn: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
    minHeight: 52,
  },
  playBtnWrap: {
    shadowColor: '#7F00FF',
    shadowOpacity: 0.7,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  repeatOne: {
    position: 'absolute',
    top: 2,
    right: 2,
    color: '#00E5FF',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9,
  },
});