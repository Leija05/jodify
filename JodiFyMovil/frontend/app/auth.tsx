import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { PressableFluid } from '@/components/ui/PressableFluid';
import { ActivityIndicator, StyleSheet, Text, TextInput, View, Image } from 'react-native';
import { login, validateToken, saveToken } from '@/services/auth.service';
import { GUEST_HINT } from '@/lib/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useToastStore } from '@/stores/toast.store';
import { colors, typography, radius, elevation } from '@/theme';
import { mmkv } from '@/lib/mmkv';

interface AuthScreenProps {
  visible: boolean;
  onClose: () => void;
}

export default function AuthScreen({ visible, onClose }: AuthScreenProps) {
  if (!visible) return null;

  const { setUser: doLogin } = useSettingsStore();
  const showToast = useToastStore((s) => s.show);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSession, setKeepSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [tokenPanel, setTokenPanel] = useState(false);
  const [token, setToken] = useState('');
  const [saveTokenPermanent, setSaveTokenPermanent] = useState(false);
  const [validating, setValidating] = useState(false);
  const [savedBusy, setSavedBusy] = useState(false);

  const submit = async (e: any) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await login(username, password);
      await saveToken(res.token);
      doLogin(res.user);
      onClose();
      showToast('Bienvenido de nuevo', 'success');
    } catch (e: any) {
      setError(e.message ?? 'Usuario o contraseña incorrectos');
      showToast(e.message ?? 'Error al iniciar sesión', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleTokenSuccess = async (result: any, _save: boolean) => {
    await saveToken(result.token);
    doLogin(result.user);
    showToast(result.role === 'admin' ? 'Token de admin validado' : 'Token dev validado', 'success');
    onClose();
  };

  const handleSavedLogin = async () => {
    setSavedBusy(true);
    try {
      const token = await mmkv.getString('auth.token');
      if (token) {
        const res = await validateToken(token);
        await saveToken(res.token);
        doLogin(res.user);
        onClose();
        showToast('Entrada con token guardado', 'success');
      } else {
        showToast('No hay token guardado', 'error');
      }
    } catch (e: any) {
      showToast(e.message ?? 'El token guardado no es válido', 'error');
    } finally {
      setSavedBusy(false);
    }
  };

  const handleTokenValidate = async () => {
    if (!token.trim()) return;
    setValidating(true);
    try {
      const res = await validateToken(token.trim());
      await saveToken(res.token);
      if (saveTokenPermanent) {
        // Token already saved
      }
      handleTokenSuccess(res, saveTokenPermanent);
    } catch (e: any) {
      showToast(e.message ?? 'Token inválido', 'error');
      setValidating(false);
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.backdrop} onStartShouldSetResponder={() => true} onResponderRelease={onClose} />
      <PressableFluid onPress={onClose} style={styles.closeBtn} hitSlop={20}>
        <Ionicons name="close" size={28} color={colors.textMuted} />
      </PressableFluid>

      <View style={styles.card} pointerEvents="box-only">
        <View style={styles.logoSection}>
          <View style={styles.logoWrapper}>
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require('../assets/images/icon.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brand}>
            Jodi<Text style={{ color: colors.secondary }}>Fy</Text>
          </Text>
          <Text style={styles.tagline}>Free Music For Friends</Text>
        </View>

        {!tokenPanel ? (
          <>
            {mmkv.getString('auth.token') && (
              <PressableFluid
                onPress={handleSavedLogin}
                disabled={savedBusy}
                haptic="light"
                style={styles.savedTokenBtn}
              >
                <Ionicons name="shield-checkmark" size={14} color={colors.white} />
                <Text style={styles.savedTokenText}>{savedBusy ? 'Validando…' : 'Entrar con token guardado'}</Text>
              </PressableFluid>
            )}

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Usuario"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  autoFocus
                  data-testid="login-username"
                />
              </View>

              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  placeholder="Contraseña"
                  value={password}
                  onChangeText={setPassword}
                  autoComplete="current-password"
                  data-testid="login-password"
                />
                <PressableFluid onPress={() => setShowPassword(v => !v)} hitSlop={8} style={styles.passwordToggle}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                </PressableFluid>
              </View>

              <PressableFluid
                onPress={() => setKeepSession(v => !v)}
                haptic="selection"
                style={styles.remember}
              >
                <View style={[styles.toggle, keepSession && styles.toggleOn]}>
                  <View style={styles.toggleKnob} />
                </View>
                <Text style={styles.rememberText}>Mantener sesión</Text>
              </PressableFluid>

              {error && <Text style={styles.error}>{error}</Text>}

              <PressableFluid
                onPress={() => submit({ preventDefault: () => {} } as any)}
                disabled={busy}
                haptic="medium"
                style={styles.submitBtn}
              >
                <Text style={styles.submitText}>{busy ? 'Entrando…' : 'Entrar'}</Text>
              </PressableFluid>
            </View>

            <Text style={styles.hint}>Invitado: <Text style={styles.hintStrong}>{GUEST_HINT}</Text></Text>

            <PressableFluid
              onPress={() => setTokenPanel(true)}
              haptic="light"
              style={styles.tokenLink}
            >
              <Text style={styles.tokenLinkText}>Acceso por token (dev/admin)</Text>
            </PressableFluid>
          </>
        ) : validating ? (
          <View style={styles.tokenValidating}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.tokenValidatingText}>Validando token…</Text>
          </View>
        ) : (
          <View style={styles.tokenEntry}>
            <PressableFluid onPress={() => setTokenPanel(false)} haptic="light" style={styles.tokenBack} hitSlop={8}>
              <Ionicons name="chevron-back-outline" size={24} color={colors.textMuted} />
            </PressableFluid>

            <View style={styles.tokenEntryHead}>
              <View style={styles.tokenEntryIcon}>
                <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.tokenEntryTitle}>Acceso por token</Text>
                <Text style={styles.tokenEntrySub}>Token de desarrollo o administrador</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="Ingresa el token"
                value={token}
                onChangeText={setToken}
                autoFocus
                data-testid="dev-token-input"
              />
            </View>

            <PressableFluid
              onPress={() => setSaveTokenPermanent(v => !v)}
              haptic="selection"
              style={styles.remember}
            >
              <View style={[styles.toggle, saveTokenPermanent && styles.toggleOn]}>
                <View style={styles.toggleKnob} />
              </View>
              <Text style={styles.rememberText}>Guardar token permanentemente</Text>
            </PressableFluid>

            <PressableFluid
              onPress={handleTokenValidate}
              disabled={!token.trim()}
              haptic="medium"
              style={styles.submitBtn}
            >
              <Text style={styles.submitText}>Validar token</Text>
            </PressableFluid>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 16,
    zIndex: 10,
    padding: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    margin: 16,
    marginTop: 80,
    borderRadius: radius.xxl,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 24,
    ...elevation.level4,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryStrong,
    marginBottom: 16,
  },
  logoImg: {
    width: 56,
    height: 56,
  },
  brand: {
    color: colors.white,
    fontFamily: typography.displayMedium.fontFamily,
    fontSize: typography.displayMedium.fontSize,
    letterSpacing: typography.displayMedium.letterSpacing,
    lineHeight: typography.displayMedium.lineHeight,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  tagline: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    marginTop: 4,
  },
  savedTokenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
    marginBottom: 16,
  },
  savedTokenText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    lineHeight: typography.bodyMedium.lineHeight,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordToggle: {
    padding: 8,
  },
  remember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryStrong,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rememberText: {
    color: colors.textSecondary,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
  },
  error: {
    color: colors.error,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    marginTop: -8,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  submitText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: typography.labelLarge.fontSize,
    letterSpacing: typography.labelLarge.letterSpacing,
    fontWeight: '600',
  },
  hint: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    textAlign: 'center',
    marginTop: 16,
  },
  hintStrong: {
    fontWeight: '600',
  },
  tokenLink: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  tokenLinkText: {
    color: colors.secondary,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    textDecorationLine: 'underline',
  },
  tokenValidating: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  tokenValidatingText: {
    color: colors.textSecondary,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
  },
  tokenEntry: {
    gap: 16,
  },
  tokenBack: {
    alignSelf: 'flex-start',
    padding: 8,
  },
  tokenEntryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  tokenEntryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenEntryTitle: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: typography.headlineMedium.fontSize,
    letterSpacing: typography.headlineMedium.letterSpacing,
  },
  tokenEntrySub: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    marginTop: 2,
  },
});