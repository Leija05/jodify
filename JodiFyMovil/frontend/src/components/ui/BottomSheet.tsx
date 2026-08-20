import React, { useCallback, useEffect, useRef } from 'react';
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
  style?: StyleProp<ViewStyle>;
  dismissable?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Hoja inferior (bottom sheet) animada, reutilizable.
 * Reemplaza los diálogos del sistema con una UI consistente con el tema.
 */
export function BottomSheet({ visible, onClose, children, maxHeight = 0.78, style, dismissable = true }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  const handleClose = useCallback(() => {
    if (!dismissable) return;
    onClose();
  }, [dismissable, onClose]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
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