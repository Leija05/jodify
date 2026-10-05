import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated, StyleSheet, Text, View, Pressable, Platform, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { usePlayerStore } from '@stores/player.store';
import { useUiStore, type TabId } from '@stores/ui.store';
import { getSongPalette } from '@lib/palette';
import { colors, typography, motion } from '@theme';

const TABS: Array<{ id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }> = [
  { id: 'home', label: 'Inicio', icon: 'home-outline', iconActive: 'home' },
  { id: 'library', label: 'Biblioteca', icon: 'musical-notes-outline', iconActive: 'musical-notes' },
  { id: 'community', label: 'Comunidad', icon: 'people-outline', iconActive: 'people' },
  { id: 'settings', label: 'Ajustes', icon: 'settings-outline', iconActive: 'settings' },
];

const TAB_ROUTES: Record<TabId, string> = {
  home: '/(tabs)',
  library: '/(tabs)/library',
  community: '/(tabs)/community',
  settings: '/(tabs)/settings',
};

const TAB_BAR_HEIGHT = 68;

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const tab = useUiStore((s) => s.tab);
  const setTab = useUiStore((s) => s.setTab);
  const queueLength = usePlayerStore((s) => s.queue.length);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const palette = useMemo(() => getSongPalette(currentSong), [currentSong]);
  const insets = useSafeAreaInsets();

  const [tabWidth, setTabWidth] = useState(0);
  const indicatorTranslate = React.useRef(new Animated.Value(0)).current;

  // Sync active tab indicator from URL path
  React.useEffect(() => {
    if (pathname.includes('/library')) {
      setTab('library');
    } else if (pathname.includes('/community')) {
      setTab('community');
    } else if (pathname.includes('/settings')) {
      setTab('settings');
    } else if (pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index') {
      setTab('home');
    }
  }, [pathname, setTab]);

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

  const handleTabPress = (tabId: TabId) => {
    setTab(tabId);
    void Haptics.selectionAsync();
    const target = TAB_ROUTES[tabId];
    if (target) {
      router.navigate(target as any);
    }
  };

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 8) }]}>
      {/* Outer Machined Shell with Hairline Glow */}
      <View style={[styles.outerShell, { shadowColor: palette.primary }]}>
        {/* Inner Glass Core */}
        <View style={styles.innerCore} onLayout={onBarLayout}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8, 8, 14, 0.96)', borderRadius: 26 }]} />
          )}

          {/* Top Hairline Specular Highlight */}
          <View style={styles.specularHighlight} />

          {tabWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.indicator,
                {
                  width: tabWidth,
                  transform: [{ translateX: indicatorTranslate }],
                  backgroundColor: palette.primary + '28',
                  borderColor: palette.secondary + '60',
                  shadowColor: palette.primary,
                },
              ]}
            >
              <View
                style={[
                  styles.activeGlowDot,
                  { backgroundColor: palette.secondary, shadowColor: palette.secondary },
                ]}
              />
            </Animated.View>
          )}

          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => handleTabPress(t.id)}
                style={styles.item}
                hitSlop={6}
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
                  <Text style={[styles.label, active && [styles.labelActive, { color: colors.white }]]}>
                    {t.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
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
  outerShell: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30,
    padding: 2.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 18,
  },
  innerCore: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 10, 18, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 27.5,
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    pointerEvents: 'none',
  },
  indicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 4,
    borderRadius: 22,
    backgroundColor: 'rgba(127, 0, 255, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(127, 0, 255, 0.55)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 4,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 4,
  },
  activeGlowDot: {
    width: 14,
    height: 2.5,
    borderRadius: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  itemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
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
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 10,
  },
  label: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  labelActive: {
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});