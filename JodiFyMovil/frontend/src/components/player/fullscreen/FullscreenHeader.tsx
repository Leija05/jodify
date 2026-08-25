import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text } from 'react-native';
import { PressableFluid } from '../../ui/PressableFluid';
import { colors, typography } from '../../../theme';

interface Props {
  opacity: Animated.Value;
  onDismiss: () => void;
  onQueuePress: () => void;
  insets: { top: number };
}

export function FullscreenHeader({
  opacity,
  onDismiss,
  onQueuePress,
  insets,
}: Props) {
  return (
    <Animated.View style={[{ opacity }, styles.topBar, { paddingTop: insets.top + 6 }]}>
      <PressableFluid onPress={onDismiss} haptic style={styles.topBtn}>
        <Ionicons name="chevron-down" size={24} color={colors.text} />
      </PressableFluid>
      <Text style={styles.topLabel} numberOfLines={1}>
        Reproduciendo
      </Text>
      <PressableFluid onPress={onQueuePress} haptic style={styles.topBtn}>
        <Ionicons name="list" size={21} color={colors.text} />
      </PressableFluid>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 12,
  },
  topBtn: {
    padding: 11,
  },
  topLabel: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    letterSpacing: typography.labelLarge.letterSpacing,
    lineHeight: typography.labelLarge.lineHeight,
    textAlign: 'center',
  },
});