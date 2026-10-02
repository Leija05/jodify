import { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJamStore } from '@stores/jam.store';
import { useUiStore } from '@stores/ui.store';
import { useSettingsStore } from '@stores/settings.store';
import { jamService, resolveHostRecommendation } from '@services/jam.service';
import { colors } from '@theme';

export function JamModal() {
  const insets = useSafeAreaInsets();
  const visible = useUiStore((s) => s.jamModalOpen);
  const closeJamModal = useUiStore((s) => s.closeJamModal);

  const active = useJamStore((s) => s.active);
  const code = useJamStore((s) => s.code);
  const isHost = useJamStore((s) => s.isHost);
  const users = useJamStore((s) => s.users);
  const permissions = useJamStore((s) => s.permissions);
  const pendingRecommendations = useJamStore((s) => s.pendingRecommendations);
  const startJam = useJamStore((s) => s.start);
  const stopJam = useJamStore((s) => s.stop);
  const setPermissions = useJamStore((s) => s.setPermissions);
  const broadcastConfig = useJamStore((s) => s.broadcastConfig);

  const user = useSettingsStore((s) => s.user);
  const username = user?.username ?? 'Móvil';

  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleJoin = useCallback(async () => {
    const clean = inputCode.trim().toUpperCase();
    if (clean.length < 4) {
      setErrorMsg('El código debe tener 4 caracteres');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const session = await jamService.fetchActiveSession(clean);
      if (!session || !session.is_active) {
        setErrorMsg('No se encontró una sesión Jam activa con ese código');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      startJam(clean, false, session.id);
      setInputCode('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Error al conectar con la sesión Jam');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [inputCode, startJam]);

  const handleCreate = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await jamService.createSession(username);
      startJam(result.code, true, result.sessionId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Error al crear la sesión Jam');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [username, startJam]);

  const handleLeaveOrClose = useCallback(() => {
    Alert.alert(
      isHost ? '¿Finalizar sesión Jam?' : '¿Salir del Jam?',
      isHost
        ? 'Todos los participantes desconectarán su sincronización.'
        : 'Dejarás de sincronizar música con el grupo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isHost ? 'Finalizar' : 'Salir',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            stopJam();
          },
        },
      ]
    );
  }, [isHost, stopJam]);

  const handleToggleAllowQueue = useCallback(
    (value: boolean) => {
      setPermissions({ ...permissions, allowQueueAdd: value });
      broadcastConfig();
      Haptics.selectionAsync();
    },
    [permissions, setPermissions, broadcastConfig]
  );

  const handleToggleAllowPlayback = useCallback(
    (value: boolean) => {
      setPermissions({ ...permissions, allowPlaybackControl: value });
      broadcastConfig();
      Haptics.selectionAsync();
    },
    [permissions, setPermissions, broadcastConfig]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={closeJamModal}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <View style={styles.jamIconBadge}>
                <Ionicons name="people" size={20} color="#00E676" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>JodiFy Jam</Text>
                <Text style={styles.sheetSubtitle}>
                  {active
                    ? isHost
                      ? 'Eres el anfitrión de la sesión'
                      : 'Sincronizado con el anfitrión'
                    : 'Música en tiempo real con amigos y escritorio'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={closeJamModal} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {active ? (
              // ACTIVE SESSION VIEW
              <View style={styles.activeContainer}>
                {/* Code Card */}
                <View style={styles.codeCard}>
                  <Text style={styles.codeLabel}>CÓDIGO DE SESIÓN</Text>
                  <Text style={styles.codeText}>{code}</Text>
                  <Text style={styles.codeHint}>
                    {isHost
                      ? 'Escribe este código en JodiFy Escritorio o compártelo'
                      : 'Conectado a la sesión en vivo'}
                  </Text>
                </View>

                {/* Host Controls */}
                {isHost && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Permisos para invitados</Text>
                    <View style={styles.permRow}>
                      <View style={styles.permTextWrap}>
                        <Text style={styles.permLabel}>Agregar a la cola</Text>
                        <Text style={styles.permDesc}>Los miembros pueden añadir temas a la cola</Text>
                      </View>
                      <Switch
                        value={permissions.allowQueueAdd}
                        onValueChange={handleToggleAllowQueue}
                        trackColor={{ false: '#333', true: '#00E676' }}
                      />
                    </View>
                    <View style={styles.permRow}>
                      <View style={styles.permTextWrap}>
                        <Text style={styles.permLabel}>Control de reproducción</Text>
                        <Text style={styles.permDesc}>Permitir a otros pausar y cambiar canciones</Text>
                      </View>
                      <Switch
                        value={permissions.allowPlaybackControl}
                        onValueChange={handleToggleAllowPlayback}
                        trackColor={{ false: '#333', true: '#00E676' }}
                      />
                    </View>
                  </View>
                )}

                {/* Recommendations (Host only) */}
                {isHost && pendingRecommendations.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      Recomendaciones ({pendingRecommendations.length})
                    </Text>
                    {pendingRecommendations.map((rec, i) => (
                      <View key={`${rec.songId}-${i}`} style={styles.recCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recSongName} numberOfLines={1}>{rec.songName}</Text>
                          <Text style={styles.recUser}>Recomendado por {rec.username}</Text>
                        </View>
                        <View style={styles.recActions}>
                          <TouchableOpacity
                            onPress={() => resolveHostRecommendation(i, 'play')}
                            style={[styles.recBtn, { backgroundColor: '#00E676' }]}
                          >
                            <Ionicons name="play" size={14} color="#000" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => resolveHostRecommendation(i, 'queue')}
                            style={[styles.recBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                          >
                            <Ionicons name="add" size={16} color="#FFF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => resolveHostRecommendation(i, 'reject')}
                            style={[styles.recBtn, { backgroundColor: 'rgba(255,59,48,0.2)' }]}
                          >
                            <Ionicons name="close" size={14} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Members list */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Participantes ({users.length || 1})
                  </Text>
                  {users.length === 0 ? (
                    <View style={styles.memberRow}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                          {username.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.memberName}>{username} (Tú)</Text>
                      {isHost && <Text style={styles.hostBadge}>HOST</Text>}
                    </View>
                  ) : (
                    users.map((u, i) => (
                      <View key={`${u.username}-${i}`} style={styles.memberRow}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberAvatarText}>
                            {u.username.slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.memberName}>
                          {u.username}{u.username.toLowerCase() === username.toLowerCase() ? ' (Tú)' : ''}
                        </Text>
                        {u.isHost && <Text style={styles.hostBadge}>HOST</Text>}
                      </View>
                    ))
                  )}
                </View>

                {/* Leave / Close button */}
                <TouchableOpacity onPress={handleLeaveOrClose} style={styles.leaveBtn}>
                  <Ionicons name="exit-outline" size={18} color="#FF5252" />
                  <Text style={styles.leaveBtnText}>
                    {isHost ? 'Finalizar sesión Jam' : 'Salir del Jam'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              // NOT ACTIVE VIEW
              <View style={styles.inactiveContainer}>
                {/* Join Card */}
                <View style={styles.cardBox}>
                  <Text style={styles.boxTitle}>Unirse a un Jam</Text>
                  <Text style={styles.boxSubtitle}>
                    Ingresa el código de 4 caracteres de JodiFy Escritorio o de un amigo
                  </Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.codeInput}
                      placeholder="XXXX"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={inputCode}
                      onChangeText={(t) => setInputCode(t.toUpperCase().slice(0, 4))}
                      maxLength={4}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      onPress={handleJoin}
                      disabled={loading || inputCode.trim().length < 4}
                      style={[
                        styles.joinBtn,
                        (loading || inputCode.trim().length < 4) && styles.btnDisabled,
                      ]}
                    >
                      {loading ? (
                        <ActivityIndicator color="#000" size="small" />
                      ) : (
                        <Text style={styles.joinBtnText}>Unirse</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
                </View>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>O BIEN</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Create Card */}
                <View style={styles.cardBox}>
                  <Text style={styles.boxTitle}>Crear un Jam</Text>
                  <Text style={styles.boxSubtitle}>
                    Sé el anfitrión y controla lo que suena en tus dispositivos o con amigos
                  </Text>
                  <TouchableOpacity
                    onPress={handleCreate}
                    disabled={loading}
                    style={styles.createBtn}
                  >
                    <LinearGradient
                      colors={['#7F00FF', '#E100FF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientBtn}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={18} color="#FFF" />
                          <Text style={styles.createBtnText}>Iniciar nuevo Jam</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#121216',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  jamIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0,230,118,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  sheetBody: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingVertical: 18,
    gap: 20,
  },
  inactiveContainer: {
    gap: 16,
  },
  cardBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  boxTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  boxSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 4,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  joinBtn: {
    backgroundColor: '#00E676',
    borderRadius: 14,
    paddingHorizontal: 20,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  joinBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 12,
    marginTop: 8,
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
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  createBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradientBtn: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  activeContainer: {
    gap: 20,
  },
  codeCard: {
    backgroundColor: 'rgba(0,230,118,0.06)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.2)',
  },
  codeLabel: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  codeText: {
    color: '#FFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 6,
  },
  codeHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  permTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  permLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  permDesc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  recSongName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  recUser: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  recActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  recBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(127,0,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  memberName: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
  },
  hostBadge: {
    backgroundColor: 'rgba(0,230,118,0.15)',
    color: '#00E676',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,82,82,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,82,82,0.2)',
  },
  leaveBtnText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '700',
  },
});
