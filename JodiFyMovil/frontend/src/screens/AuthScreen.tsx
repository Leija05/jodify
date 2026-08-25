import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { useSecretCombo } from '../hooks/useSecretCombo';
import { login } from '../services/auth.service';
import { useLibraryStore } from '../store/library.store';
import { useSettingsStore } from '../store/settings.store';
import { useUiStore } from '../store/ui.store';
import { colors, typography, gradients, radius, safeArea, shadows } from '../theme';
import { PressableFluid } from '../components/ui/PressableFluid';
import { EqualizerBars } from '../components/ui/EqualizerBars';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Pantalla de inicio de sesión a pantalla completa - Rediseño premium
 * - Sin handle bar (no es un sheet)
 * - Gradient más sutil y elegante
 * - Campos refinados con focus states
 * - Secret combo: 5 taps en logo + 2 taps en tagline (o 7 taps directos en logo)
 */
export function AuthScreen({ visible, onClose }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  const setUser = useSettingsStore((s) => s.setUser);
  const openSecret = useUiStore((s) => s.openSecret);
  const { handleLogoPress, handleTaglinePress } = useSecretCombo(openSecret);
  
  const usernameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const logoRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(logoRotation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [logoRotation]);

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

  const focusPassword = useCallback(() => {
    passwordInputRef.current?.focus();
  }, []);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <LinearGradient colors={['rgba(127,0,255,0.12)', '#0a0015', colors.background]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(0,240,255,0.03)', 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.aurora} />
        <View style={styles.vignette} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.closeRow}>
              <PressableFluid onPress={onClose} haptic style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </PressableFluid>
            </View>

            <Pressable onPress={handleLogoPress} style={styles.logoZone} hitSlop={12}>
              <View style={styles.logoDiscWrapper}>
                <Animated.View style={{ transform: [{ rotate: logoRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
                  <LinearGradient colors={[gradients.play[0], gradients.play[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoDisc}>
                    <Ionicons name="musical-notes" size={36} color={colors.white} />
                  </LinearGradient>
                </Animated.View>
                <View style={styles.logoRing} />
              </View>
              <Text style={styles.logo}>
                Jodi<Text style={styles.logoAccent}>Fy</Text>
              </Text>
              <Pressable onPress={handleTaglinePress} hitSlop={8}>
                <Text style={styles.tagline}>Free music, for friends</Text>
              </Pressable>
              <View style={styles.eqRow}>
                <EqualizerBars playing bars={5} height={14} barWidth={2.5} color={colors.secondary} />
              </View>
            </Pressable>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Iniciar sesión</Text>
              <Text style={styles.cardSubtitle}>
                Conecta tu cuenta para guardar favoritas, descargas y sincronizar tu historial.
              </Text>

              <View style={[
                styles.field,
                usernameFocused && styles.fieldFocused,
                error && !usernameFocused && !passwordFocused && styles.fieldError
              ]}>
                <View style={styles.fieldIcon}>
                  <Ionicons name="person-outline" size={20} color={usernameFocused ? colors.secondary : colors.textMuted} />
                </View>
                <TextInput
                  ref={usernameInputRef}
                  style={styles.input}
                  placeholder="Usuario"
                  placeholderTextColor={colors.textDim}
                  value={username}
                  onChangeText={(t) => {
                    setUsername(t);
                    setError(null);
                  }}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                  onSubmitEditing={focusPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  returnKeyType="next"
                  textContentType="username"
                />
              </View>

              <View style={[
                styles.field,
                passwordFocused && styles.fieldFocused,
                error && !usernameFocused && !passwordFocused && styles.fieldError
              ]}>
                <View style={styles.fieldIcon}>
                  <Ionicons name="lock-closed-outline" size={20} color={passwordFocused ? colors.secondary : colors.textMuted} />
                </View>
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.input, styles.inputWithToggle]}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.textDim}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError(null);
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onSubmitEditing={() => void submit()}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  returnKeyType="done"
                  textContentType="password"
                />
                <Pressable
                  hitSlop={8}
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.passwordToggle}
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={15} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <PressableFluid
                onPress={() => void submit()}
                disabled={!canSubmit}
                haptic
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                scaleTo={0.97}
              >
                <LinearGradient
                  colors={canSubmit ? gradients.play : (['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)'] as const)}
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
              </PressableFluid>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o prueba con</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.demoRow}>
                {demoAccounts.map((acc) => (
                  <PressableFluid
                    key={acc.label}
                    haptic
                    scaleTo={0.94}
                    onPress={() => {
                      setUsername(acc.label);
                      setPassword(acc.value);
                      setError(null);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={styles.demoChip}
                  >
                    <Text style={styles.demoChipText}>
                      <Text style={styles.demoChipStrong}>{acc.label}</Text> · {acc.value}
                    </Text>
</PressableFluid>
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
    height: 300,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
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
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoZone: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  logoDiscWrapper: {
    position: 'relative',
  },
  logoDisc: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  logoRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(127,0,255,0.3)',
  },
  logo: {
    color: colors.white,
    fontFamily: typography.displayMedium.fontFamily,
    fontSize: 36,
    letterSpacing: -1.2,
    marginTop: 16,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  logoAccent: {
    color: colors.secondary,
  },
  tagline: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 13.5,
    marginTop: 3,
    letterSpacing: 0.3,
  },
  eqRow: {
    marginTop: 14,
    height: 16,
  },
  card: {
    backgroundColor: 'rgba(8,8,12,0.85)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.xl,
    padding: 24,
    gap: 16,
    ...shadows.card,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 52,
  },
  fieldFocused: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(0,240,255,0.05)',
    shadowColor: colors.secondary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  fieldError: {
    borderColor: colors.error,
    backgroundColor: 'rgba(255,51,102,0.05)',
  },
  fieldIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    padding: 0,
    height: '100%',
  },
  inputWithToggle: {
    paddingRight: 44,
  },
  passwordToggle: {
    position: 'absolute',
    right: 14,
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
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 12.5,
  },
  submitBtn: {
    marginTop: 6,
    borderRadius: radius.md,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
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
    height: 54,
  },
  submitBtnText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  submitBtnTextDisabled: {
    color: colors.textMuted,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textDim,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 11.5,
    letterSpacing: 0.5,
  },
  demoRow: {
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  demoChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,240,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
  },
  demoChipText: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 12.5,
  },
  demoChipStrong: {
    color: colors.secondary,
    fontFamily: typography.labelLarge.fontFamily,
  },
});