import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { login } from '../services/auth.service';
import { useLibraryStore } from '../store/library.store';
import { useSettingsStore } from '../store/settings.store';
import { colors, fonts, gradients, radius, safeArea, shadows } from '../theme';
import { PressableScale } from '../components/ui/PressableScale';
import { EqualizerBars } from '../components/ui/EqualizerBars';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Pantalla de inicio de sesión a pantalla completa.
 * Reemplaza al modal anterior (que tenía bugs visuales con el teclado y
 * en pantallas pequeñas): ahora es deslizable, respeta safe-area y el
 * teclado, y permite ver/ocultar la contraseña.
 */
export function AuthScreen({ visible, onClose }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUser = useSettingsStore((s) => s.setUser);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !busy;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const user = await login(username.trim(), password);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUser(user);
      void useLibraryStore.getState().refreshLikes();
      onClose();
      setUsername('');
      setPassword('');
      setShowPassword(false);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  }, [canSubmit, username, password, setUser, onClose]);

  const demoAccounts = useMemo(
    () => [
      { label: 'user', value: 'user123' },
      { label: 'admin', value: 'admin123' },
    ],
    [],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <LinearGradient colors={[gradients.primary[0], '#1a0033', colors.background]} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(0,240,255,0.10)', 'transparent']} style={styles.aurora} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.handleRow}>
              <View style={styles.handle} />
              <PressableScale onPress={onClose} haptic style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </PressableScale>
            </View>

            <View style={styles.logoZone}>
              <LinearGradient colors={[gradients.play[0], gradients.play[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoDisc}>
                <Ionicons name="musical-notes" size={34} color={colors.white} />
              </LinearGradient>
              <Text style={styles.logo}>
                Jodi<Text style={styles.logoAccent}>Fy</Text>
              </Text>
              <Text style={styles.tagline}>Free music, for friends</Text>
              <View style={styles.eqRow}>
                <EqualizerBars playing bars={5} height={14} barWidth={2.5} color={colors.secondary} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Iniciar sesión</Text>
              <Text style={styles.cardSubtitle}>
                Conecta tu cuenta para guardar favoritas, descargas y sincronizar tu historial.
              </Text>

              <View style={styles.field}>
                <View style={styles.fieldIcon}>
                  <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Usuario"
                  placeholderTextColor={colors.textDim}
                  value={username}
                  onChangeText={(t) => {
                    setUsername(t);
                    setError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <View style={styles.fieldIcon}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                </View>
                <TextInput
                  style={[styles.input, styles.inputWithToggle]}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.textDim}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  returnKeyType="done"
                  onSubmitEditing={() => void submit()}
                />
                <Pressable
                  hitSlop={8}
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.passwordToggle}
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textMuted} />
                </Pressable>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={15} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <PressableScale
                onPress={() => void submit()}
                disabled={!canSubmit}
                haptic
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                scaleTo={0.97}
              >
                <LinearGradient
                  colors={canSubmit ? [gradients.play[0], gradients.play[1]] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitBtnInner}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Text style={[styles.submitBtnText, !canSubmit && styles.submitBtnTextDisabled]}>Entrar</Text>
                      <Ionicons name="arrow-forward" size={17} color={canSubmit ? colors.white : colors.textMuted} />
                    </>
                  )}
                </LinearGradient>
              </PressableScale>

              <View style={styles.demoRow}>
                <Text style={styles.demoHint}>Cuentas de prueba:</Text>
                {demoAccounts.map((acc) => (
                  <PressableScale
                    key={acc.label}
                    haptic
                    scaleTo={0.94}
                    onPress={() => {
                      setUsername(acc.label);
                      setPassword(acc.value);
                      setError(null);
                    }}
                    style={styles.demoChip}
                  >
                    <Text style={styles.demoChipText}>
                      <Text style={styles.demoChipStrong}>{acc.label}</Text> · {acc.value}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  aurora: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  kav: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingTop: safeArea.top + 8,
    paddingBottom: safeArea.bottom + 24,
    paddingHorizontal: 22,
    justifyContent: 'space-between',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoZone: {
    alignItems: 'center',
    marginTop: 26,
    marginBottom: 10,
  },
  logoDisc: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  logo: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 34,
    letterSpacing: -1,
    marginTop: 14,
  },
  logoAccent: {
    color: colors.secondary,
  },
  tagline: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginTop: 2,
  },
  eqRow: {
    marginTop: 12,
    height: 16,
  },
  card: {
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.xl,
    padding: 22,
    gap: 14,
    ...shadows.card,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.title,
    fontSize: 21,
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 13,
    height: 50,
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14.5,
    padding: 0,
    height: '100%',
  },
  inputWithToggle: {
    paddingRight: 40,
  },
  passwordToggle: {
    position: 'absolute',
    right: 13,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,51,102,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,51,102,0.35)',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
  },
  submitBtn: {
    marginTop: 4,
    borderRadius: radius.md,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  submitBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
  },
  submitBtnText: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  submitBtnTextDisabled: {
    color: colors.textMuted,
  },
  demoRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  demoHint: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 11.5,
  },
  demoChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.25)',
  },
  demoChipText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  demoChipStrong: {
    color: colors.secondary,
    fontFamily: fonts.bodyBold,
  },
});