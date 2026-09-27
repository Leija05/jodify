import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import { usePlayerStore } from '@stores/player.store';
import { useUiStore, type TabId } from '@stores/ui.store';
import { colors, typography, motion } from '@theme';
import { PressableFluid } from '@components/ui/PressableFluid';

const TABS: Array<{ id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }> = [
  { id: 'home', label: 'Inicio', icon: 'home-outline', iconActive: 'home' },
  { id: 'library', label: 'Biblioteca', icon: 'musical-notes-outline', iconActive: 'musical-notes' },
  { id: 'community', label: 'Comunidad', icon: 'people-outline', iconActive: 'people' },
  { id: 'settings', label: 'Ajustes', icon: 'settings-outline', iconActive: 'settings' },
];

const TAB_BAR_HEIGHT = 68;

export function TabBar() {
  const tab = useUiStore((s) => s.tab);
  const setTab = useUiStore((s) => s.setTab);
  const queueLength = usePlayerStore((s) => s.queue.length);
  const insets = useSafeAreaInsets();

  const [tabWidth, setTabWidth] = useState(0);
  const indicatorTranslate = React.useRef(new Animated.Value(0)).current;

  const onBarLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const measured = event.nativeEvent.layout.width - 8;
      const next = Math.max(measured / TABS.length, 0);
      setTabWidth(next);
      const activeIndex = TABS.findIndex((t) => t.id === tab);
      indicatorTranslate.setValue(activeIndex * next);
    },
    [indicatorTranslate, tab]
  );

  React.useEffect(() => {
    if (tabWidth <= 0) return;
    const targetIndex = TABS.findIndex((t) => t.id === tab);
    Animated.spring(indicatorTranslate, {
      toValue: targetIndex * tabWidth,
      ...motion.springQuick,
      useNativeDriver: true,
    }).start();
  }, [tab, tabWidth, indicatorTranslate]);

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar} onLayout={onBarLayout}>
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
        {tabWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                width: tabWidth,
                transform: [{ translateX: indicatorTranslate }],
              },
            ]}
          />
        )}
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <PressableFluid
              key={t.id}
              onPress={() => setTab(t.id)}
              haptic="selection"
              style={styles.item}
              hitSlop={8}
              testID={`tab-${t.id}`}
            >
              <View style={styles.itemInner}>
                {t.id === 'library' && queueLength > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{Math.min(queueLength, 99)}</Text>
                  </View>
                ) : null}
                <Ionicons
                  name={active ? t.iconActive : t.icon}
                  size={22}
                  color={active ? colors.white : colors.textMuted}
                />
                <Text style={[styles.label, active && styles.labelActive]}>{t.label}</Text>
              </View>
            </PressableFluid>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(14, 14, 22, 0.72)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 26,
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(127, 0, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(127, 0, 255, 0.5)',
  },
  item: {
    flex: 1,
  },
  itemInner: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  badgeText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 10,
    fontWeight: '700',
  },
  label: {
    color: colors.textMuted,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 11,
    fontWeight: '700',
  },
});