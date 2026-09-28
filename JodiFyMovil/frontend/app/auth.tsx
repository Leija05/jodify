import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { PressableFluid } from '@/components/ui/PressableFluid';
import { login, validateToken, saveToken } from '@/services/auth.service';
import { useSettingsStore } from '@/stores/settings.store';
import { useToastStore } from '@/stores/toast.store';
import { colors, typography, radius } from '@/theme';
import { mmkv } from '@/lib/mmkv';

interface AuthScreenProps {
  visible: boolean;
  onClose: () => void;
}

export default function AuthScreen({ visible, onClose }: AuthScreenProps) {
  const { setUser: doLogin } = useSettingsStore();
  const showToast = useToastStore((s) => s.show);

  const [activeTab, setActiveTab] = useState<'login' | 'token'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSession, setKeepSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [token, setToken] = useState('');
  const [saveTokenPermanent, setSaveTokenPermanent] = useState(true);
  const [validating, setValidating] = useState(false);
  const [savedBusy, setSavedBusy] = useState(false);

  const [userFocused, setUserFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [tokenFocused, setTokenFocused] = useState(false);

  if (!visible) return null;

  const handleLoginSubmit = async () => {
    if (!username.trim() || !password) {
      setError('Por favor completa todos los campos');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setBusy(true);
    setError(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await login(username.trim(), password);
      await saveToken(res.token);
      doLogin(res.user);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`¡Hola de nuevo, ${res.user.username}!`, 'success');
      onClose();
    } catch (e: any) {
      const msg = e.message ?? 'Usuario o contraseña incorrectos';
      setError(msg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleGuestLogin = async () => {
    setBusy(true);
    setError(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await login('guest', 'guest');
      await saveToken(res.token);
      doLogin(res.user);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Acceso como Invitado concedido', 'success');
      onClose();
    } catch {
      // Fallback local guest session
      doLogin({ id: 0, username: 'guest', role: 'user', is_online: 1 });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Sesión de invitado activa', 'success');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleSavedLogin = async () => {
    setSavedBusy(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const savedToken = mmkv.getString('auth.token');
      if (savedToken) {
        const res = await validateToken(savedToken);
        await saveToken(res.token);
        doLogin(res.user);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Sesión restaurada con token guardado', 'success');
        onClose();
      } else {
        showToast('No hay token guardado', 'error');
      }
    } catch (e: any) {
      showToast(e.message ?? 'El token guardado ya no es válido', 'error');
    } finally {
      setSavedBusy(false);
    }
  };

  const handleTokenValidate = async () => {
    if (!token.trim()) return;
    setValidating(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await validateToken(token.trim());
      await saveToken(res.token);
      doLogin(res.user);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(res.user.role === 'admin' ? 'Token de Administrador verificado' : 'Token verificado con éxito', 'success');
      onClose();
    } catch (e: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(e.message ?? 'Token inválido o expirado', 'error');
      setValidating(false);
    }
  };

  const savedTokenExists = !!mmkv.getString('auth.token');

  return (
    <View style={styles.overlay}>
      <PressableFluid
        onPress={onClose}
        style={styles.backdrop}
        haptic={false}
        testID="auth-backdrop"
      >
        <View style={styles.backdropCover} />
      </PressableFluid>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalCard}>
            {/* Header with Close */}
            <View style={styles.headerBar}>
              <View style={styles.badgeIndicator} />
              <PressableFluid
                onPress={onClose}
                haptic="light"
                style={styles.closeBtn}
                hitSlop={12}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </PressableFluid>
            </View>

            {/* Logo Section */}
            <View style={styles.brandHero}>
              <LinearGradient
                colors={['#7F00FF', '#00E5FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoOuter}
              >
                <View style={styles.logoInner}>
                  <Image
                    source={require('../assets/images/icon.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </LinearGradient>
              <Text style={styles.brandTitle}>
                Jodi<Text style={{ color: colors.secondary }}>Fy</Text>
              </Text>
              <Text style={styles.brandSubtitle}>Música libre y compartida</Text>
            </View>

            {/* Quick Saved Token Banner */}
            {savedTokenExists && (
              <PressableFluid
                onPress={handleSavedLogin}
                disabled={savedBusy}
                haptic="light"
                style={styles.savedTokenPill}
              >
                <Ionicons name="shield-checkmark" size={16} color={colors.secondary} />
                <Text style={styles.savedTokenText}>
                  {savedBusy ? 'Validando sesión…' : 'Reconectar con token guardado'}
                </Text>
                <Ionicons name="arrow-forward" size={14} color={colors.secondary} />
              </PressableFluid>
            )}

            {/* Segmented Tab Switcher */}
            <View style={styles.tabBar}>
              <PressableFluid
                onPress={() => {
                  void Haptics.selectionAsync();
                  setActiveTab('login');
                }}
                style={[styles.tabItem, activeTab === 'login' && styles.tabItemActive]}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={18}
                  color={activeTab === 'login' ? colors.white : colors.textMuted}
                />
                <Text style={[styles.tabLabel, activeTab === 'login' && styles.tabLabelActive]}>
                  Cuenta
                </Text>
              </PressableFluid>

              <PressableFluid
                onPress={() => {
                  void Haptics.selectionAsync();
                  setActiveTab('token');
                }}
                style={[styles.tabItem, activeTab === 'token' && styles.tabItemActive]}
              >
                <Ionicons
                  name="key-outline"
                  size={18}
                  color={activeTab === 'token' ? colors.white : colors.textMuted}
                />
                <Text style={[styles.tabLabel, activeTab === 'token' && styles.tabLabelActive]}>
                  Token VIP
                </Text>
              </PressableFluid>
            </View>

            {/* Form Section */}
            {activeTab === 'login' ? (
              <View style={styles.formContainer}>
                {/* Username Input */}
                <View style={[styles.inputBox, userFocused && styles.inputBoxFocused]}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={userFocused ? colors.secondary : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Usuario"
                    placeholderTextColor={colors.textMuted}
                    value={username}
                    onChangeText={(val) => {
                      setUsername(val);
                      if (error) setError(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setUserFocused(true)}
                    onBlur={() => setUserFocused(false)}
                    returnKeyType="next"
                  />
                </View>

                {/* Password Input */}
                <View style={[styles.inputBox, passFocused && styles.inputBoxFocused]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={passFocused ? colors.secondary : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Contraseña"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (error) setError(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => setPassFocused(false)}
                    returnKeyType="done"
                    onSubmitEditing={handleLoginSubmit}
                  />
                  <PressableFluid
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={8}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </PressableFluid>
                </View>

                {/* Keep Session Checkbox */}
                <PressableFluid
                  onPress={() => setKeepSession((v) => !v)}
                  haptic="selection"
                  style={styles.rememberRow}
                >
                  <View style={[styles.switchTrack, keepSession && styles.switchTrackActive]}>
                    <View style={[styles.switchThumb, keepSession && styles.switchThumbActive]} />
                  </View>
                  <Text style={styles.rememberLabel}>Mantener sesión iniciada</Text>
                </PressableFluid>

                {/* Error Banner */}
                {error && (
                  <View style={styles.errorAlert}>
                    <Ionicons name="alert-circle" size={16} color={colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Submit Button */}
                <PressableFluid
                  onPress={handleLoginSubmit}
                  disabled={busy}
                  haptic="medium"
                  scaleTo={0.97}
                  style={styles.primaryBtn}
                >
                  <LinearGradient
                    colors={['#7F00FF', '#00E5FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryGradient}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>Iniciar Sesión</Text>
                        <Ionicons name="arrow-forward" size={18} color={colors.white} />
                      </>
                    )}
                  </LinearGradient>
                </PressableFluid>

                {/* Fast Guest Access */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>o</Text>
                  <View style={styles.dividerLine} />
                </View>

                <PressableFluid
                  onPress={handleGuestLogin}
                  disabled={busy}
                  haptic="light"
                  scaleTo={0.97}
                  style={styles.guestBtn}
                >
                  <Ionicons name="sparkles-outline" size={18} color={colors.secondary} />
                  <Text style={styles.guestBtnText}>Continuar como Invitado</Text>
                </PressableFluid>
              </View>
            ) : (
              /* Token Entry Tab */
              <View style={styles.formContainer}>
                <View style={styles.tokenNotice}>
                  <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                  <View style={styles.tokenNoticeText}>
                    <Text style={styles.tokenNoticeTitle}>Acceso por Token Maestro</Text>
                    <Text style={styles.tokenNoticeSub}>
                      Para administradores, desarrolladores o accesos VIP otorgados por el equipo.
                    </Text>
                  </View>
                </View>

                <View style={[styles.inputBox, tokenFocused && styles.inputBoxFocused]}>
                  <Ionicons
                    name="key-outline"
                    size={20}
                    color={tokenFocused ? colors.secondary : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Pega o escribe tu token aquí"
                    placeholderTextColor={colors.textMuted}
                    value={token}
                    onChangeText={setToken}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setTokenFocused(true)}
                    onBlur={() => setTokenFocused(false)}
                    secureTextEntry
                  />
                </View>

                <PressableFluid
                  onPress={() => setSaveTokenPermanent((v) => !v)}
                  haptic="selection"
                  style={styles.rememberRow}
                >
                  <View style={[styles.switchTrack, saveTokenPermanent && styles.switchTrackActive]}>
                    <View style={[styles.switchThumb, saveTokenPermanent && styles.switchThumbActive]} />
                  </View>
                  <Text style={styles.rememberLabel}>Guardar token en este dispositivo</Text>
                </PressableFluid>

                <PressableFluid
                  onPress={handleTokenValidate}
                  disabled={!token.trim() || validating}
                  haptic="medium"
                  scaleTo={0.97}
                  style={[styles.primaryBtn, !token.trim() && { opacity: 0.5 }]}
                >
                  <LinearGradient
                    colors={['#7F00FF', '#00E5FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryGradient}
                  >
                    {validating ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>Validar y Entrar</Text>
                        <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                      </>
                    )}
                  </LinearGradient>
                </PressableFluid>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropCover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 3, 5, 0.85)',
  },
  keyboardContainer: {
    width: '100%',
    maxHeight: '92%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalCard: {
    width: '100%',
    borderRadius: 30,
    backgroundColor: 'rgba(15, 15, 24, 0.96)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 20,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoOuter: {
    width: 68,
    height: 68,
    borderRadius: 22,
    padding: 2,
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  logoInner: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#0a0a12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  brandTitle: {
    color: colors.white,
    fontFamily: typography.displayMedium.fontFamily,
    fontSize: 26,
    letterSpacing: -0.6,
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 13,
    letterSpacing: 0.1,
    marginTop: 2,
  },
  savedTokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    marginBottom: 16,
  },
  savedTokenText: {
    color: colors.secondary,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: 'rgba(127, 0, 255, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(127, 0, 255, 0.5)',
  },
  tabLabel: {
    color: colors.textMuted,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13,
  },
  tabLabelActive: {
    color: colors.white,
  },
  formContainer: {
    gap: 14,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 52,
  },
  inputBoxFocused: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(0, 229, 255, 0.04)',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: colors.white,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  switchTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchTrackActive: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  rememberLabel: {
    color: colors.textSecondary,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 13,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 61, 92, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 61, 92, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  primaryGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    color: colors.textMuted,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 12,
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  guestBtnText: {
    color: colors.text,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 14,
  },
  tokenNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(127, 0, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(127, 0, 255, 0.25)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 4,
  },
  tokenNoticeText: {
    flex: 1,
    gap: 2,
  },
  tokenNoticeTitle: {
    color: colors.white,
    fontFamily: typography.headlineSmall.fontFamily,
    fontSize: 14,
  },
  tokenNoticeSub: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
    lineHeight: 16,
  },
});