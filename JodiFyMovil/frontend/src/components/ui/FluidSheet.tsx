import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, motion, elevation, typography, useReducedMotion } from '../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FluidSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Fracción de la altura de pantalla ocupada por el sheet (0..1). */
  maxHeight?: number;
  /** Alturas visibles del sheet como fracciones de pantalla, de menor a mayor. */
  snapPoints?: number[];
  style?: StyleProp<ViewStyle> | undefined;
  dismissible?: boolean | undefined;
  showHandle?: boolean | undefined;
  title?: string | undefined;
  titleAction?: React.ReactNode;
}

const DEFAULT_SNAP_POINTS = [0.5, 0.9];
const DISMISS_DRAG = 120;
const DISMISS_VELOCITY = 0.5;

/**
 * Sheet inferior con arrastre continuo, snaps elásticos y salida animada.
 * A diferencia de un Modal plano, permanece montado durante la animación
 * de salida: el contenido nunca "parpadea" al cerrarse.
 */
export function FluidSheet({
  visible,
  onClose,
  children,
  maxHeight = 0.95,
  snapPoints = DEFAULT_SNAP_POINTS,
  style,
  dismissible = true,
  showHandle = true,
  title,
  titleAction,
}: FluidSheetProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  // El sheet se mantiene montado mientras dura la animación de salida.
  const [mounted, setMounted] = useState(visible);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const snapIndexRef = useRef(snapPoints.length - 1);
  const closingRef = useRef(false);
  const dismissibleRef = useRef(dismissible);
  const onCloseRef = useRef(onClose);
  dismissibleRef.current = dismissible;
  onCloseRef.current = onClose;

  const snapTargetY = useCallback(
    (index: number) => {
      const fraction = snapPoints[Math.max(0, Math.min(index, snapPoints.length - 1))] ?? 0.9;
      return SCREEN_HEIGHT - SCREEN_HEIGHT * fraction * maxHeight;
    },
    [snapPoints, maxHeight],
  );

  const finishClose = useCallback(() => {
    closingRef.current = false;
    setMounted(false);
    onCloseRef.current();
  }, []);

  const animateOut = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (reduceMotion) {
      translateY.setValue(SCREEN_HEIGHT);
      finishClose();
      return;
    }
    Animated.spring(translateY, {
      toValue: SCREEN_HEIGHT,
      ...motion.springQuick,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) finishClose();
    });
  }, [translateY, reduceMotion, finishClose]);

  const snapTo = useCallback(
    (index: number, velocity = 0) => {
      if (index < 0) {
        if (dismissibleRef.current) animateOut();
        return;
      }
      const clamped = Math.min(index, snapPoints.length - 1);
      snapIndexRef.current = clamped;
      const targetY = snapTargetY(clamped);
      if (reduceMotion) {
        translateY.setValue(targetY);
        return;
      }
      Animated.spring(translateY, {
        toValue: targetY,
        ...motion.springDrawer,
        velocity,
        useNativeDriver: true,
      }).start();
    },
    [animateOut, snapPoints.length, snapTargetY, translateY, reduceMotion],
  );

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setMounted(true);
      const topY = snapTargetY(snapPoints.length - 1);
      snapIndexRef.current = snapPoints.length - 1;
      if (reduceMotion) {
        translateY.setValue(topY);
        return;
      }
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, {
        toValue: topY,
        ...motion.springDrawer,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      animateOut();
    }
    // `mounted` intencionalmente omitido: reaccionar solo a cambios de `visible`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const getY = useCallback(
    () => (translateY as unknown as { _value: number })._value,
    [translateY],
  );

  const panHandlers = useMemo(() => {
    let dragStartY = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e: GestureResponderEvent, gs: PanResponderGestureState) =>
        Math.abs(gs.dy) > 6 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderGrant: () => {
        dragStartY = getY();
      },
      onPanResponderMove: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
        let next = dragStartY + gs.dy;
        // Resistencia elástica al arrastrar por encima del tope.
        const topLimit = snapTargetY(snapPoints.length - 1);
        if (next < topLimit) next = topLimit + (next - topLimit) * 0.18;
        translateY.setValue(Math.max(next, 0));
      },
      onPanResponderRelease: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
        const { vy } = gs;
        const dragged = getY() - dragStartY;
        if ((dragged > DISMISS_DRAG && vy > 0.2) || vy > DISMISS_VELOCITY) {
          snapTo(-1, vy);
          return;
        }
        // Snap más cercano según posición final + velocidad.
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i < snapPoints.length; i++) {
          const d = Math.abs(getY() - snapTargetY(i));
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
        const flingUp = vy < -DISMISS_VELOCITY * 0.6;
        snapTo(flingUp ? Math.min(best + 1, snapPoints.length - 1) : best, vy);
      },
      onPanResponderTerminate: () => {
        snapTo(snapIndexRef.current);
      },
    }).panHandlers;
  }, [snapTo, snapPoints.length, snapTargetY, translateY, getY]);

  const handleClosePress = useCallback(() => {
    if (!dismissible) return;
    animateOut();
  }, [dismissible, animateOut]);

  if (!mounted) return null;

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={handleClosePress} visible>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={handleClosePress}
          accessibilityLabel="Cerrar"
          accessibilityRole="button"
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: SCREEN_HEIGHT * maxHeight,
              paddingBottom: insets.bottom + 12,
              transform: [{ translateY }],
            },
            style,
          ]}
          {...panHandlers}
        >
          {showHandle && <View style={styles.handle} />}
          {title != null && (
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {titleAction}
            </View>
          )}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,3,5,0.72)',
  },
  sheet: {
    backgroundColor: colors.surfaceSolid,
    borderTopLeftRadius: radius.sheetOuter,
    borderTopRightRadius: radius.sheetOuter,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingTop: 10,
    overflow: 'hidden',
    ...elevation.level3,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text,
    flexShrink: 1,
  },
});
