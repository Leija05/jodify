import { useEffect, useRef } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export type UpdateModalStatus = 'available' | 'installing' | 'blocked' | 'error';

interface UpdateModalProps {
  visible: boolean;
  current: string;
  latest: string;
  notes: string;
  status: UpdateModalStatus;
  onInstall: () => void;
  onLater: () => void;
  onClose: () => void;
}

const ACCENT = '#9b5cff';
const BARS = [0, 1, 2, 3, 4];

function Equalizer({ active }: { active: boolean }) {
  const bars = useRef(BARS.map(() => new Animated.Value(0.22))).current;

  useEffect(() => {
    if (!active) {
      bars.forEach((b) => b.stopAnimation());
      bars.forEach((b) => b.setValue(0.22));
      return;
    }
    const loops = bars.map((bar) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, { toValue: 1, duration: 340, useNativeDriver: true }),
          Animated.timing(bar, { toValue: 0.4, duration: 260, useNativeDriver: true }),
          Animated.timing(bar, { toValue: 0.22, duration: 240, useNativeDriver: true }),
        ]),
        { resetBeforeIteration: true },
      ),
    );
    const timers = loops.map((loop, i) => setTimeout(() => loop.start(), i * 95));
    return () => {
      timers.forEach(clearTimeout);
      loops.forEach((l) => l.stop());
    };
  }, [active, bars]);

  return (
    <View style={styles.eq} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[styles.eqBar, { transform: [{ scaleY: bar }] }]}
        />
      ))}
    </View>
  );
}

export function UpdateModal({ visible, current, latest, notes, status, onInstall, onLater }: UpdateModalProps) {
  const installing = status === 'installing';
  const ready = !installing && (status === 'available' || status === 'error' || status === 'blocked');

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable style={styles.close} onPress={onLater} accessibilityLabel="Cerrar" hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <View style={styles.mark}>
            <Text style={styles.markText}>⬇</Text>
          </View>
          <Equalizer active={installing} />

          <Text style={styles.eyebrow}>
            {installing ? 'Descargando actualización' : 'Nueva versión disponible'}
          </Text>

          <View style={styles.versions}>
            <Text style={[styles.chip, styles.chipOld]}>v{current}</Text>
            <Text style={styles.arrow}>→</Text>
            <Text style={[styles.chip, styles.chipNew]}>v{latest}</Text>
          </View>

          <View style={styles.body}>
            {status === 'blocked' ? (
              <Text style={styles.notes}>
                {Platform.OS === 'ios'
                  ? 'En iOS las actualizaciones se instalan desde la App Store.'
                  : 'El APK de esta versión no está disponible todavía.'}
              </Text>
            ) : status === 'error' ? (
              <Text style={styles.notes}>
                No se pudo instalar la actualización. Revisá que el dispositivo permita instalar apps de orígenes desconocidos.
              </Text>
            ) : notes ? (
              <Text style={styles.notes} numberOfLines={5}>
                {notes}
              </Text>
            ) : (
              <Text style={styles.notes}>
                {installing
                  ? 'La nueva versión se está descargando dentro de la app. Podés seguir usando JodiFy.'
                  : 'Ya está lista la nueva versión. Instalala desde aquí, sin salir de la app.'}
              </Text>
            )}

            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.btnPrimary]}
                onPress={onInstall}
                disabled={installing}
                accessibilityRole="button"
              >
                <Text style={styles.btnPrimaryText}>
                  {installing ? 'Descargando…' : status === 'error' || status === 'blocked' ? 'Reintentar' : 'Actualizar ahora'}
                </Text>
              </Pressable>
              {ready && (
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={onLater} accessibilityRole="button">
                  <Text style={styles.btnGhostText}>Después</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#16161d',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 18,
  },
  close: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  closeText: {
    color: 'rgba(244,244,246,0.55)',
    fontSize: 13,
    fontWeight: '600',
  },
  mark: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 12,
  },
  markText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
  },
  eq: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 22,
    gap: 4,
    marginTop: 14,
  },
  eqBar: {
    width: 5,
    height: 22,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  eyebrow: {
    marginTop: 12,
    fontSize: 10.5,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: 'rgba(244,244,246,0.5)',
    fontWeight: '600',
  },
  versions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  chip: {
    fontSize: 19,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 11,
    overflow: 'hidden',
  },
  chipOld: {
    color: 'rgba(244,244,246,0.45)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    textDecorationLine: 'line-through',
  },
  arrow: {
    color: 'rgba(244,244,246,0.5)',
    fontSize: 15,
  },
  chipNew: {
    color: '#fff',
    backgroundColor: 'rgba(155,92,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(155,92,255,0.55)',
  },
  body: {
    width: '100%',
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 16,
    gap: 16,
  },
  notes: {
    color: 'rgba(244,244,246,0.55)',
    fontSize: 12.5,
    lineHeight: 19,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  btnGhostText: {
    color: '#f4f4f6',
    fontSize: 13.5,
    fontWeight: '600',
  },
});