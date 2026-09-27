import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { PressableFluid } from '@components/ui/PressableFluid';
import { colors, typography, radius, motion, elevation } from '@theme';

interface UpdateModalProps {
  visible: boolean;
  current: string;
  latest: string;
  notes: string;
  status: 'idle' | 'downloading' | 'installing' | 'success' | 'error';
  onInstall: () => void;
  onLater: () => void;
  onClose: () => void;
}

export const UpdateModal = React.forwardRef<View, UpdateModalProps>(
  ({
    visible,
    current,
    latest,
    notes,
    status,
    onInstall,
    onLater,
    onClose,
  }, ref) => {
    const scale = useRef(new Animated.Value(0.9)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      if (visible) {
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, ...motion.springDefault, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: motion.duration.fast, useNativeDriver: true }),
        ]).start();
        setProgress(0);
      } else {
        Animated.parallel([
          Animated.spring(scale, { toValue: 0.9, ...motion.springDefault, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: motion.duration.fast, useNativeDriver: true }),
        ]).start();
      }
    }, [visible]);

    useEffect(() => {
      if (status === 'downloading') {
        const interval = setInterval(() => {
          setProgress(p => Math.min(100, p + Math.random() * 15));
        }, 500);
        return () => clearInterval(interval);
      } else if (status === 'installing') {
        setProgress(100);
      }
      return undefined;
    }, [status]);

    if (!visible && ((opacity as any)._value ?? 0) === 0) return null;

    return (
      <Modal
        visible={visible}
        animationType="none"
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        <Animated.View
          style={[
            styles.backdrop,
            { opacity },
          ]}
          onStartShouldSetResponder={() => true}
          onResponderRelease={onLater}
        />
        <Animated.View
          ref={ref}
          style={[
            styles.modal,
            { opacity, transform: [{ scale }] },
          ]}
        >
          <LinearGradient
            colors={['rgba(127,0,255,0.3)', 'rgba(0,229,255,0.2)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.content}>
            <View style={styles.header}>
              <Ionicons name="download-outline" size={32} color={colors.secondary} />
              <Text style={styles.title}>Actualización disponible</Text>
              <PressableFluid onPress={onClose} haptic="light" hitSlop={12} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </PressableFluid>
            </View>

            <View style={styles.versionRow}>
              <View style={styles.versionBox}>
                <Text style={styles.versionLabel}>Actual</Text>
                <Text style={styles.versionValue}>v{current}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.textMuted} />
              <View style={styles.versionBox}>
                <Text style={styles.versionLabel}>Nueva</Text>
                <Text style={styles.versionValueNew}>v{latest}</Text>
              </View>
            </View>

            {notes && (
              <View style={styles.notes}>
                <Text style={styles.notesTitle}>Novedades</Text>
                <Text style={styles.notesText}>{notes}</Text>
              </View>
            )}

            {status === 'downloading' && (
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      { width: `${progress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>Descargando… {Math.round(progress)}%</Text>
              </View>
            )}

            {status === 'installing' && (
              <View style={styles.installing}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.installingText}>Instalando actualización…</Text>
              </View>
            )}

            {status === 'success' && (
              <View style={styles.success}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                <Text style={styles.successText}>¡Actualizado a v{latest}!</Text>
                <Text style={styles.successSub}>Reinicia la app para aplicar cambios</Text>
              </View>
            )}

            {status === 'error' && (
              <View style={styles.error}>
                <Ionicons name="alert-circle" size={48} color={colors.error} />
                <Text style={styles.errorText}>Error al actualizar</Text>
                <PressableFluid onPress={onInstall} haptic="medium" style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Reintentar</Text>
                </PressableFluid>
              </View>
            )}

            {status === 'idle' ? (
              <View style={styles.buttons}>
                <PressableFluid onPress={onLater} haptic="light" style={styles.laterBtn}>
                  <Text style={styles.laterBtnText}>Más tarde</Text>
                </PressableFluid>
                <PressableFluid onPress={onInstall} haptic="medium" style={styles.installBtn}>
                  <LinearGradient
                    colors={['#7F00FF', '#B800FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.installBtnFill}
                  >
                    <Text style={styles.installBtnText}>Instalar ahora</Text>
                  </LinearGradient>
                </PressableFluid>
              </View>
            ) : null}
          </View>
        </Animated.View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modal: {
    margin: 24,
    borderRadius: radius.xxl,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    ...elevation.level4,
  },
  content: {
    padding: 24,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: typography.headlineMedium.fontSize,
    letterSpacing: typography.headlineMedium.letterSpacing,
    marginLeft: 12,
  },
  closeBtn: {
    padding: 8,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  versionBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  versionLabel: {
    color: colors.textMuted,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    textTransform: 'uppercase',
  },
  versionValue: {
    color: colors.text,
    fontFamily: typography.displaySmall.fontFamily,
    fontSize: typography.displaySmall.fontSize,
    letterSpacing: typography.displaySmall.letterSpacing,
    marginTop: 4,
  },
  versionValueNew: {
    color: colors.secondary,
    fontFamily: typography.displaySmall.fontFamily,
    fontSize: typography.displaySmall.fontSize,
    letterSpacing: typography.displaySmall.letterSpacing,
    marginTop: 4,
  },
  notes: {
    gap: 8,
  },
  notesTitle: {
    color: colors.textSecondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    textTransform: 'uppercase',
  },
  notesText: {
    color: colors.textSecondary,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    lineHeight: typography.bodySmall.lineHeight,
  },
  progressContainer: {
    gap: 8,
    paddingTop: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  progressText: {
    color: colors.textSecondary,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
    textAlign: 'center',
  },
  installing: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  installingText: {
    color: colors.textSecondary,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
  },
  success: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  successText: {
    color: colors.success,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: typography.headlineMedium.fontSize,
    letterSpacing: typography.headlineMedium.letterSpacing,
  },
  successSub: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
  },
  error: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  errorText: {
    color: colors.error,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: typography.headlineMedium.fontSize,
    letterSpacing: typography.headlineMedium.letterSpacing,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.error,
  },
  retryBtnText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  laterBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  laterBtnText: {
    color: colors.text,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
  },
  installBtn: {
    flex: 1,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  installBtnFill: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  installBtnText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
    fontWeight: '600',
  },
});