import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography, radius } from '../../theme';
import { PressableFluid } from './PressableFluid';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string | undefined;
  action?: { label: string; onPress: () => void } | undefined;
}

export function EmptyState({ icon = 'musical-notes-outline', title, subtitle, action }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={34} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? (
        <PressableFluid
          onPress={action.onPress}
          haptic="light"
          hitSlop={6}
          style={styles.actionBtn}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </PressableFluid>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(127,0,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(127,0,255,0.35)',
  },
  title: {
    color: colors.text,
    fontFamily: typography.headlineSmall.fontFamily,
    fontSize: 16,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
  actionBtn: {
    marginTop: 18,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primaryStrong,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  actionText: {
    color: colors.text,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    letterSpacing: typography.labelLarge.letterSpacing,
  },
});
