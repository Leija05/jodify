import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';
import { usePlayerStore } from '../store/player.store';
import { useUiStore, type TabId } from '../store/ui.store';
import { colors, fonts, gradients, radius } from '../theme';
import { PressableScale } from '../components/ui/PressableScale';

const TABS: Array<{ id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }> = [
  { id: 'home', label: 'Inicio', icon: 'home-outline', iconActive: 'home' },
  { id: 'library', label: 'Biblioteca', icon: 'musical-notes-outline', iconActive: 'musical-notes' },
  { id: 'settings', label: 'Ajustes', icon: 'settings-outline', iconActive: 'settings' },
];

export function TabBar() {
  const tab = useUiStore((s) => s.tab);
  const setTab = useUiStore((s) => s.setTab);
  const queueLength = usePlayerStore((s) => s.queue.length);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.bar}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <PressableScale key={t.id} onPress={() => setTab(t.id)} haptic style={styles.item} scaleTo={0.9}>
              <View style={styles.itemInner}>
                {t.id === 'library' && queueLength > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{Math.min(queueLength, 99)}</Text>
                  </View>
                ) : null}
                {active && (
                  <LinearGradient
                    colors={[gradients.primary[0], gradients.play[1]] as const}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.activePill}
                  />
                )}
                <Ionicons name={active ? t.iconActive : t.icon} size={22} color={active ? colors.white : colors.textMuted} />
                <Text style={[styles.label, active && styles.labelActive]}>{t.label}</Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 40,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(13,13,19,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: 6,
    shadowColor: colors.black,
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  item: {
    flex: 1,
  },
  itemInner: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 7,
    position: 'relative',
    overflow: 'hidden',
  },
  activePill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 14,
    right: 14,
    borderRadius: radius.pill,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: 22,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 9,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 10.5,
  },
  labelActive: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
  },
});