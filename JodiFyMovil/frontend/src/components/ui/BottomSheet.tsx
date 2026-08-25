import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number;
  snapPoints?: string[];
  style?: StyleProp<ViewStyle>;
  dismissable?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Hoja inferior (bottom sheet) animada, reutilizable.
 * Reemplaza los diálogos del sistema con una UI consistente con el tema.
 */
export function BottomSheet({ visible, onClose, children, maxHeight = 0.78, snapPoints, style, dismissable = true }: Props) {
  const insets = useSafeAreaInsets();
  // Se mantiene montado durante la animacion de salida para que nunca parpadee.
  const [mounted, setMounted] = useState(visible);
  const closingRef = useRef(false);
  const resolvedMaxHeight =
    snapPoints && snapPoints.length > 0
      ? SCREEN_HEIGHT * (parseFloat(snapPoints[0] ?? '78') / 100)
      : SCREEN_HEIGHT * maxHeight;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setMounted(true);
      translateY.setValue(SCREEN_HEIGHT);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      if (closingRef.current) return;
      closingRef.current = true;
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          closingRef.current = false;
          setMounted(false);
          onClose();
        }
      });
    }
    // `mounted` omitido a proposito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, translateY]);

  const handleClose = useCallback(() => {
    if (!dismissable) return;
    setMounted(false);
    onClose();
  }, [dismissable, onClose]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: resolvedMaxHeight,
              paddingBottom: insets.bottom + 12,
              transform: [{ translateY }],
            },
            style,
          ]}
        >
          <View style={styles.handle} />
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
    backgroundColor: 'rgba(3,3,6,0.72)',
  },
  sheet: {
    backgroundColor: colors.surfaceSolid,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingTop: 10,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginBottom: 14,
  },
});