import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { devAccess, redeemAccessToken } from '../services/auth.service';
import { useLibraryStore } from '../store/library.store';
import { useSettingsStore } from '../store/settings.store';
import { useUiStore } from '../store/ui.store';
import { colors, typography, gradients, radius } from '../theme';
import { PressableScale } from '../components/ui/PressableScale';

type Mode = 'dev' | 'token';

const inputRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  paddingHorizontal: 14,
  height: 52,
  gap: 10,
};

/**
 * Acceso especial oculto: permite entrar con clave de desarrollo (dev) o
 * canjear un token de acceso (admin/mod). Se abre con una combinación de
 * toques sobre el logo de la app.
 */
export function SecretAccessScreen() {
  const open = useUiStore((s) => s.secretOpen);
  const close = useUiStore((s) => s.closeSecret);
  const setUser = useSettingsStore((s) => s.setUser);
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('dev');
  const [devKey, setDevKey] = useState('');
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setDevKey('');
    setToken('');
    setUsername('');
    setPassword('');
    setError(null);
    setBusy(false);
  }, []);

  const handleClose = useCallback(() => {
    if (busy) return;
    resetForm();
    close();
  }, [busy, close, resetForm]);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const user =
        mode === 'dev'
          ? await devAccess(devKey.trim())
          : await redeemAccessToken(token.trim(), username.trim(), password);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUser(user);
      void useLibraryStore.getState().refreshLikes();
      resetForm();
      close();
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : 'No se pudo completar el acceso');
    } finally {
      setBusy(false);
    }
  }, [mode, devKey, token, username, password, setUser, close, resetForm]);

  const canSubmit = busy ? false : mode === 'dev' ? devKey.trim().length > 0 : token.trim().length > 0 && username.trim().length > 0 && password.length > 0;

  return (
    <Modal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.container}>
        <LinearGradient colors={[gradients.primary[0], '#120022', colors.background]} style={StyleSheet.absoluteFill} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.handleRow}>
              <View style={styles.handle} />
              <PressableScale onPress={handleClose} haptic style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </PressableScale>
            </View>

            <View style={styles.hero}>
              <LinearGradient colors={[gradients.play[0], gradients.play[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroIcon}>
                <Ionicons name="shield-checkmark" size={30} color={colors.white} />
              </LinearGradient>
              <Text style={styles.heroTitle}>Acceso especial</Text>
              <Text style={styles.heroSubtitle}>
                Entra con una clave de desarrollo o canjea un token de acceso para administrar la plataforma.
              </Text>
            </View>

            <View style={styles.tabs}>
              <PressableScale onPress={() => { setMode('dev'); setError(null); }} style={[styles.tab, mode === 'dev' && styles.tabActive]} scaleTo={0.97}>
                <Ionicons name="code-slash" size={16} color={mode === 'dev' ? colors.white : colors.textMuted} />
                <Text style={[styles.tabText, mode === 'dev' && styles.tabTextActive]}>Clave dev</Text>
              </PressableScale>
              <PressableScale onPress={() => { setMode('token'); setError(null); }} style={[styles.tab, mode === 'token' && styles.tabActive]} scaleTo={0.97}>
                <Ionicons name="key" size={16} color={mode === 'token' ? colors.white : colors.textMuted} />
                <Text style={[styles.tabText, mode === 'token' && styles.tabTextActive]}>Token admin</Text>
              </PressableScale>
            </View>

            <View style={styles.card}>
              {mode === 'dev' ? (
                <>
                  <Text style={styles.fieldLabel}>Clave de desarrollo</Text>
                  <View style={inputRowStyle}>
                    <Ionicons name="key-outline" size={18} color={colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="JDFYDEV-XXXX…"
                      placeholderTextColor={colors.textDim}
                      value={devKey}
                      onChangeText={(t) => { setDevKey(t); setError(null); }}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      autoComplete="off"
                      returnKeyType="done"
                      onSubmitEditing={() => void submit()}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>Token de acceso</Text>
                  <View style={inputRowStyle}>
                    <Ionicons name="ticket-outline" size={18} color={colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="JDFY-XXXX-XXXX-XXXX-XXXX"
                      placeholderTextColor={colors.textDim}
                      value={token}
                      onChangeText={(t) => { setToken(t); setError(null); }}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      autoComplete="off"
                      returnKeyType="next"
                    />
                  </View>
                  <Text style={styles.fieldLabel}>Usuario nuevo</Text>
                  <View style={inputRowStyle}>
                    <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="Nombre de usuario"
                      placeholderTextColor={colors.textDim}
                      value={username}
                      onChangeText={(t) => { setUsername(t); setError(null); }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="username"
                      returnKeyType="next"
                    />
                  </View>
                  <Text style={styles.fieldLabel}>Contraseña</Text>
                  <View style={inputRowStyle}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="Mínimo 4 caracteres"
                      placeholderTextColor={colors.textDim}
                      value={password}
                      onChangeText={(t) => { setPassword(t); setError(null); }}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      returnKeyType="done"
                      onSubmitEditing={() => void submit()}
                    />
                  </View>
                </>
              )}

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
                    <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
                      {mode === 'dev' ? 'Entrar como dev' : 'Canjear y entrar'}
                    </Text>
                  )}
                </LinearGradient>
              </PressableScale>

              <Text style={styles.footnote}>
                Solo para administración. El acceso queda registrado en el panel del dev.
              </Text>
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
  kav: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
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
  hero: {
    alignItems: 'center',
    marginTop: 26,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: 'rgba(127,0,255,0.22)',
    borderColor: 'rgba(127,0,255,0.6)',
  },
  tabText: {
    color: colors.textMuted,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13.5,
  },
  tabTextActive: {
    color: colors.white,
  },
  card: {
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.xl,
    padding: 20,
    gap: 10,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 12,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14.5,
    padding: 0,
    height: '100%',
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
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 12.5,
  },
  submitBtn: {
    marginTop: 6,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnInner: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 15,
  },
  submitTextDisabled: {
    color: colors.textMuted,
  },
  footnote: {
    color: colors.textDim,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
  },
});