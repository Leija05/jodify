import React from 'react';
import { Animated, View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableFluid } from '@components/ui/PressableFluid';
import { colors } from '@theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FullscreenHeaderProps {
  opacity: Animated.Value;
  onDismiss: () => void;
  onQueuePress: () => void;
  displayMode: 'cover' | 'vinyl';
  onToggleDisplayMode: () => void;
  insets: ReturnType<typeof useSafeAreaInsets>;
}

export const FullscreenHeader = React.forwardRef<View, FullscreenHeaderProps>(
  ({ opacity, onDismiss, onQueuePress, displayMode, onToggleDisplayMode, insets }, ref) => {
    return (
      <Animated.View
        ref={ref}
        style={[
          styles.container,
          { opacity, paddingTop: insets.top + 6 },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.content} pointerEvents="box-none">
          <PressableFluid onPress={onDismiss} haptic="light" hitSlop={12} style={styles.actionBtn}>
            <Ionicons name="chevron-down" size={26} color={colors.white} />
          </PressableFluid>

          {/* Center Mode Pill (Apple Music / Turntable Toggle) */}
          <PressableFluid
            onPress={onToggleDisplayMode}
            haptic="light"
            style={styles.modeTogglePill}
          >
            <Ionicons
              name={displayMode === 'vinyl' ? 'disc' : 'albums-outline'}
              size={14}
              color={colors.secondary}
            />
            <Text style={styles.modeToggleText}>
              {displayMode === 'vinyl' ? 'Modo Vinilo' : 'Carátula'}
            </Text>
          </PressableFluid>

          <PressableFluid onPress={onQueuePress} haptic="light" hitSlop={12} style={styles.actionBtn}>
            <Ionicons name="list-outline" size={24} color={colors.textSecondary} />
          </PressableFluid>
        </View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  actionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modeTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modeToggleText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.2,
  },
});

FullscreenHeader.displayName = 'FullscreenHeader';