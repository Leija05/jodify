import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { usePlayerStore } from '../store/player.store';
import { useUiStore, type TabId } from '../store/ui.store';
import { colors, typography, radius, motion, elevation } from '../theme';
import { PressableFluid } from '../components/ui/PressableFluid';

const TABS: Array<{ id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }> = [
  { id: 'home', label: 'Inicio', icon: 'home-outline', iconActive: 'home' },
  { id: 'library', label: 'Biblioteca', icon: 'musical-notes-outline', iconActive: 'musical-notes' },
  { id: 'community', label: 'Comunidad', icon: 'people-outline', iconActive: 'people' },
  { id: 'settings', label: 'Ajustes', icon: 'settings-outline', iconActive: 'settings' },
];

const TAB_BAR_HEIGHT = 80;

export function TabBar() {
  const tab = useUiStore((s) => s.tab);
  const setTab = useUiStore((s) => s.setTab);
  const queueLength = usePlayerStore((s) => s.queue.length);
  const insets = useSafeAreaInsets();

  // El indicador se calcula con el ancho REAL medido de la barra:
  // cada tab es flex:1, asi que su ancho es (anchoUtil / cantidadDeTabs).
  const [tabWidth, setTabWidth] = useState(0);
  const indicatorTranslate = React.useRef(new Animated.Value(0)).current;
  const indicatorWidth = React.useRef(new Animated.Value(0)).current;

  const onBarLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const measured = event.nativeEvent.layout.width - 8; // paddingHorizontal 4+4
      const next = Math.max(measured / TABS.length, 0);
      setTabWidth(next);
      indicatorWidth.setValue(next);
      const activeIndex = TABS.findIndex((t) => t.id === tab);
      indicatorTranslate.setValue(activeIndex * next);
    },
    [indicatorTranslate, indicatorWidth, tab],
  );

  React.useEffect(() => {
    if (tabWidth <= 0) return;
    const targetIndex = TABS.findIndex((t) => t.id === tab);
    Animated.parallel([
      Animated.spring(indicatorTranslate, {
        toValue: targetIndex * tabWidth,
        ...motion.springQuick,
        useNativeDriver: true,
      }),
      Animated.spring(indicatorWidth, {
        toValue: tabWidth,
        ...motion.springQuick,
        useNativeDriver: true,
      }),
    ]).start();
  }, [tab, tabWidth, indicatorTranslate, indicatorWidth]);

  return (
    <View style={[styles.wrap, { bottom: insets.bottom }]}>
      <View style={styles.bar} onLayout={onBarLayout}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              transform: [{ translateX: indicatorTranslate }],
              width: indicatorWidth,
            },
          ]}
        />
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
                  size={26}
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
    left: 12,
    right: 12,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.xl,
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 4,
    ...elevation.level3,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    ...elevation.level1,
  },
  item: {
    flex: 1,
  },
  itemInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 11,
    fontWeight: '600',
  },
  label: {
    color: colors.textMuted,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 12,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13,
    fontWeight: '600',
  },
});
