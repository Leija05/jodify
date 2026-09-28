import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  Switch,
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { PressableFluid } from '@components/ui/PressableFluid';
import { useSettingsStore } from '@stores/settings.store';
import { updateUserProfile } from '@services/users.service';
import { colors, typography, radius, gradients } from '@theme';

const PRESET_AVATARS = [
  { id: 'neon', name: 'Cyber Wave', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=240&h=240&fit=crop' },
  { id: 'dj', name: 'Bass Master', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=240&h=240&fit=crop' },
  { id: 'vinyl', name: 'Vinyl Club', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&h=240&fit=crop' },
  { id: 'synth', name: 'Synth Girl', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop' },
  { id: 'tokyo', name: 'Urban Beat', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&h=240&fit=crop' },
  { id: 'mask', name: 'Phantom DJ', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&h=240&fit=crop' },
];

interface AccountDetailsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AccountDetailsModal({ visible, onClose }: AccountDetailsModalProps) {
  const user = useSettingsStore((s) => s.user);
  const updateUser = useSettingsStore((s) => s.updateUser);

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [useDiscordAvatar, setUseDiscordAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setDisplayName(user.display_name ?? user.username);
      setAvatarUrl(user.avatar_url ?? '');
      setDiscordId(user.discord_id ?? '');
      setUseDiscordAvatar(user.avatar_source === 'discord');
    }
  }, [visible, user]);

  const role = (user?.role || 'user').toLowerCase();

  const roleMeta = useMemo(() => {
    switch (role) {
      case 'admin':
        return { label: 'ADMINISTRADOR', color: '#FF3D5C', icon: 'shield-checkmark' as const, bg: 'rgba(255, 61, 92, 0.15)' };
      case 'mod':
        return { label: 'MODERADOR', color: '#FFB300', icon: 'star' as const, bg: 'rgba(255, 179, 0, 0.15)' };
      case 'dev':
        return { label: 'DESARROLLADOR', color: '#7F00FF', icon: 'code-slash' as const, bg: 'rgba(127, 0, 255, 0.15)' };
      default:
        return { label: 'USUARIO VIP', color: '#00E5FF', icon: 'musical-notes' as const, bg: 'rgba(0, 229, 255, 0.15)' };
    }
  }, [role]);

  const formattedCreatedAt = useMemo(() => {
    if (!user?.created_at) return 'Miembro fundador';
    try {
      const d = new Date(user.created_at);
      return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'Miembro de JodiFy';
    }
  }, [user?.created_at]);

  const activeAvatarPreview = useMemo(() => {
    if (useDiscordAvatar && discordId.trim().length > 10) {
      return `https://cdn.discordapp.com/embed/avatars/${parseInt(discordId.slice(-2) || '0', 10) % 5}.png`;
    }
    if (avatarUrl.trim().length > 0) {
      return avatarUrl.trim();
    }
    return null;
  }, [useDiscordAvatar, discordId, avatarUrl]);

  const handleSelectPreset = useCallback((url: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAvatarUrl(url);
    setUseDiscordAvatar(false);
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();

    try {
      const payload: {
        display_name?: string;
        avatar_url?: string;
        avatar_source?: 'custom' | 'discord';
        discord_id?: string;
      } = {
        display_name: displayName.trim() || user.username,
        avatar_source: useDiscordAvatar ? 'discord' : 'custom',
      };
      if (avatarUrl.trim()) {
        payload.avatar_url = avatarUrl.trim();
      }
      if (discordId.trim()) {
        payload.discord_id = discordId.trim();
      }

      const updated = await updateUserProfile(user.username, payload);

      updateUser({
        display_name: updated.display_name ?? displayName.trim(),
        avatar_url: updated.avatar_url ?? (avatarUrl.trim() || null),
        avatar_source: useDiscordAvatar ? 'discord' : 'custom',
        discord_id: discordId.trim() || null,
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('¡Perfil actualizado!', 'Tus cambios ya se reflejan en toda la comunidad JodiFy.');
      onClose();
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err?.message || 'No se pudo guardar la información del perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !user) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismissZone} onPress={() => { Keyboard.dismiss(); onClose(); }} />

        <View style={styles.container}>
          <LinearGradient
            colors={['#16132A', '#0D0B14']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.sheetGradient}
          >
            {/* Modal Header */}
            <View style={styles.header}>
              <View style={styles.handle} />
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.title}>Mi Cuenta</Text>
                  <Text style={styles.subtitle}>Identidad, foto y conexiones</Text>
                </View>
                <PressableFluid onPress={onClose} haptic="light" style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </PressableFluid>
              </View>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              {/* ===== SECCIÓN 1: IDENTIDAD ===== */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={[styles.sectionIcon, { backgroundColor: 'rgba(127, 0, 255, 0.12)' }]}>
                    <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.sectionTitle}>IDENTIDAD</Text>
                    <Text style={styles.sectionSubtitle}>Cómo te ven en la comunidad</Text>
                  </View>
                </View>

                {/* Avatar + Name grouped together */}
                <View style={styles.identityGroup}>
                  {/* Avatar Preview & Selection */}
                  <View style={styles.avatarSection}>
                    <View style={styles.avatarPreviewWrap}>
                      {activeAvatarPreview ? (
                        <Image source={{ uri: activeAvatarPreview }} style={styles.avatarPreviewImg} />
                      ) : (
                        <LinearGradient colors={gradients.play} style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarPlaceholderText}>
                            {(displayName || user.username).slice(0, 1).toUpperCase()}
                          </Text>
                        </LinearGradient>
                      )}
                      {useDiscordAvatar && discordId.trim().length > 10 && (
                        <View style={styles.discordAvatarBadge}>
                          <Ionicons name="logo-discord" size={12} color="#5865F2" />
                        </View>
                      )}
                    </View>

                    <Text style={styles.avatarLabel}>Foto de perfil</Text>
                    <Text style={styles.avatarHint}>
                      {useDiscordAvatar ? 'Usando avatar de Discord' : avatarUrl ? 'Imagen personalizada' : 'Avatar por defecto de JodiFy'}
                    </Text>
                  </View>

                  {/* Name Input */}
                  <View style={styles.nameInputWrap}>
                    <Text style={styles.fieldLabel}>Nombre en pantalla</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="person-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
                      <TextInput
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="Tu apodo o nombre artístico"
                        placeholderTextColor={colors.textMuted}
                        style={styles.textInput}
                        maxLength={32}
                        autoCapitalize="words"
                        autoCorrect={false}
                      />
                    </View>
                    <Text style={styles.fieldHelp}>Visible en Jams, reproductor y comunidad (máx. 32 caracteres)</Text>
                  </View>
                </View>

                {/* Avatar Options: Presets + Custom URL */}
                <View style={styles.avatarOptions}>
                  <Text style={styles.optionGroupTitle}>FOTOS DE JODIFY</Text>
                  <Text style={styles.optionGroupSubtitle}>Elige un avatar oficial para tu perfil</Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.presetsScrollContent}
                    style={styles.presetsScroll}
                  >
                    {PRESET_AVATARS.map((p) => {
                      const isSelected = !useDiscordAvatar && avatarUrl === p.url;
                      return (
                        <PressableFluid
                          key={p.id}
                          onPress={() => handleSelectPreset(p.url)}
                          haptic="light"
                          style={[styles.presetCard, isSelected && styles.presetCardActive]}
                        >
                          <Image source={{ uri: p.url }} style={styles.presetImg} />
                          {isSelected && (
                            <View style={styles.presetCheckmark}>
                              <Ionicons name="checkmark" size={16} color={colors.white} />
                            </View>
                          )}
                          <Text style={[styles.presetName, isSelected && styles.presetNameActive]} numberOfLines={1}>
                            {p.name}
                          </Text>
                        </PressableFluid>
                      );
                    })}
                  </ScrollView>

                  <Text style={styles.optionGroupTitle}>O URL PERSONALIZADA</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="link-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      value={avatarUrl}
                      onChangeText={(val) => {
                        setAvatarUrl(val);
                        if (useDiscordAvatar) setUseDiscordAvatar(false);
                      }}
                      placeholder="https://i.imgur.com/tu-foto.jpg"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.textInput}
                      keyboardType="url"
                    />
                  </View>
                  <Text style={styles.fieldHelp}>Enlace directo a imagen (JPG, PNG, WebP · máx. 2 MB)</Text>
                </View>
              </View>

              {/* ===== SECCIÓN 2: CONEXIONES ===== */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={[styles.sectionIcon, { backgroundColor: 'rgba(88, 101, 242, 0.12)' }]}>
                    <Ionicons name="logo-discord" size={20} color="#5865F2" />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.sectionTitle}>CONEXIÓN DISCORD</Text>
                    <Text style={styles.sectionSubtitle}>Sincroniza avatar y muestra tu ID</Text>
                  </View>
                </View>

                <View style={styles.discordInputWrap}>
                  <Text style={styles.fieldLabel}>ID de Discord</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="logo-discord" size={20} color="#5865F2" style={styles.inputIcon} />
                    <TextInput
                      value={discordId}
                      onChangeText={setDiscordId}
                      placeholder="Ej: 8291039485729102"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      style={styles.textInput}
                    />
                  </View>
                  <Text style={styles.fieldHelp}>
                    Encuentra tu ID: Ajustes de Usuario → Avanzado → ID de Usuario (Modo Desarrollador)
                  </Text>
                </View>

                {discordId.trim().length > 0 && (
                  <View style={styles.discordAvatarToggle}>
                    <View style={styles.toggleContent}>
                      <View style={styles.toggleIconWrap}>
                        <Ionicons name="image-outline" size={20} color={colors.secondary} />
                      </View>
                      <View style={styles.toggleTextWrap}>
                        <Text style={styles.toggleTitle}>Usar avatar de Discord</Text>
                        <Text style={styles.toggleSubtitle}>Sincroniza automáticamente tu foto de perfil</Text>
                      </View>
                    </View>
                    <Switch
                      value={useDiscordAvatar}
                      onValueChange={(val) => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setUseDiscordAvatar(val);
                        if (val) setAvatarUrl('');
                      }}
                      trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: '#5865F2' }}
                      thumbColor={useDiscordAvatar ? colors.white : '#888'}
                    />
                  </View>
                )}
              </View>

              {/* ===== SECCIÓN 3: INFORMACIÓN DE CUENTA ===== */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={[styles.sectionIcon, { backgroundColor: 'rgba(0, 229, 255, 0.12)' }]}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.secondary} />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.sectionTitle}>INFORMACIÓN</Text>
                    <Text style={styles.sectionSubtitle}>Datos de tu cuenta en JodiFy</Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Usuario</Text>
                    <Text style={styles.infoValue}>@{user.username}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Rol</Text>
                    <View style={[styles.infoRoleBadge, { backgroundColor: roleMeta.bg, borderColor: roleMeta.color }]}>
                      <Text style={[styles.infoRoleText, { color: roleMeta.color }]}>{roleMeta.label}</Text>
                    </View>
                  </View>
                  <View style={[styles.infoItem, styles.infoItemFull]}>
                    <Text style={styles.infoLabel}>Cuenta creada</Text>
                    <View style={styles.infoDateRow}>
                      <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.infoValue}>{formattedCreatedAt}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={{ height: 32 }} />
            </ScrollView>

            {/* Bottom Save Action */}
            <View style={styles.footer}>
              <PressableFluid
                onPress={handleSave}
                disabled={saving}
                haptic="medium"
                style={styles.saveBtn}
              >
                <LinearGradient
                  colors={gradients.play}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtnFill}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                      <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                    </>
                  )}
                </LinearGradient>
              </PressableFluid>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  backdropDismissZone: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: '100%',
    height: '88%',
    maxHeight: '92%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(127, 0, 255, 0.28)',
    backgroundColor: '#0D0B14',
  },
  sheetGradient: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    marginBottom: 12,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: typography.headlineMedium.fontSize,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  /* Section Card */
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
    marginTop: 1,
  },
  /* Identity Group - Avatar + Name side by side on wide, stacked on narrow */
  identityGroup: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  avatarSection: {
    flex: 0,
    width: 100,
    alignItems: 'center',
  },
  avatarPreviewWrap: {
    position: 'relative',
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  avatarPreviewImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7F00FF',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  avatarPlaceholderText: {
    color: colors.white,
    fontFamily: typography.displayLarge.fontFamily,
    fontSize: 40,
    fontWeight: '700',
  },
  discordAvatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#5865F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0D0B14',
  },
  avatarLabel: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  avatarHint: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 10.5,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 14,
  },
  nameInputWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10.5,
    letterSpacing: 0.8,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: colors.white,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
  },
  fieldHelp: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
  },
  /* Avatar Options */
  avatarOptions: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 20,
  },
  optionGroupTitle: {
    color: colors.secondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10.5,
    letterSpacing: 1,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  optionGroupSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
    marginBottom: 14,
  },
  presetsScroll: {
    marginBottom: 20,
  },
  presetsScrollContent: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    gap: 12,
  },
  presetCard: {
    width: 88,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.lg,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  presetCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(127, 0, 255, 0.18)',
  },
  presetImg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: 8,
  },
  presetCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0D0B14',
  },
  presetName: {
    color: colors.textMuted,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10.5,
    textAlign: 'center',
  },
  presetNameActive: {
    color: colors.white,
    fontWeight: '700',
  },
  /* Discord Input */
  discordInputWrap: {
    marginBottom: 14,
  },
  discordAvatarToggle: {
    backgroundColor: 'rgba(88, 101, 242, 0.1)',
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(88, 101, 242, 0.25)',
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(88, 101, 242, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
  },
  toggleSubtitle: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
    marginTop: 1,
  },
  /* Info Grid */
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    minWidth: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoItemFull: {
    flexBasis: '100%',
  },
  infoLabel: {
    color: colors.textMuted,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    color: colors.white,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 13.5,
    fontWeight: '500',
  },
  infoRoleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  infoRoleText: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  /* Footer */
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0D0B14',
  },
  saveBtn: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  saveBtnFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  saveBtnText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});