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
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { PressableFluid } from '@components/ui/PressableFluid';
import { useSettingsStore } from '@stores/settings.store';
import { updateUserProfile } from '@services/users.service';
import { colors, typography, radius, gradients } from '@theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // Sync initial state when modal opens
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
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Miembro de JodiFy';
    }
  }, [user?.created_at]);

  // Preview Avatar logic
  const activeAvatarPreview = useMemo(() => {
    if (useDiscordAvatar && discordId.trim().length > 10) {
      // In JodiFy, discord avatar url format or direct cdn
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
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

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
                  <Text style={styles.subtitle}>Información y personalización de perfil</Text>
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
            >
              {/* Account Status Card */}
              <View style={styles.accountBadgeCard}>
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
                  <View style={[styles.roleBadgeIcon, { backgroundColor: roleMeta.bg, borderColor: roleMeta.color }]}>
                    <Ionicons name={roleMeta.icon} size={13} color={roleMeta.color} />
                  </View>
                </View>

                <View style={styles.accountMetaInfo}>
                  <Text style={styles.accountUsername}>@{user.username}</Text>
                  <View style={[styles.roleTag, { backgroundColor: roleMeta.bg, borderColor: roleMeta.color }]}>
                    <Text style={[styles.roleTagText, { color: roleMeta.color }]}>{roleMeta.label}</Text>
                  </View>
                  <Text style={styles.createdDateText}>
                    <Ionicons name="calendar-outline" size={12} color={colors.textMuted} /> Creada el {formattedCreatedAt}
                  </Text>
                </View>
              </View>

              {/* Name Section */}
              <Text style={styles.sectionHeader}>NOMBRE EN PANTALLA</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-circle-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Tu apodo o nombre artístico"
                  placeholderTextColor={colors.textMuted}
                  style={styles.textInput}
                  maxLength={32}
                />
              </View>
              <Text style={styles.fieldHelp}>Este es el nombre visible en la comunidad, Jams y reproductor.</Text>

              {/* Discord Connection */}
              <Text style={styles.sectionHeader}>CONEXIÓN CON DISCORD</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="logo-discord" size={20} color="#5865F2" style={styles.inputIcon} />
                <TextInput
                  value={discordId}
                  onChangeText={setDiscordId}
                  placeholder="ID de Discord (ej: 8291039485729102)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  style={styles.textInput}
                />
              </View>

              {discordId.trim().length > 0 && (
                <View style={styles.toggleRow}>
                  <View style={styles.toggleTextWrap}>
                    <Text style={styles.toggleTitle}>Usar avatar de Discord</Text>
                    <Text style={styles.toggleSubtitle}>Sincroniza tu foto de perfil con tu cuenta de Discord</Text>
                  </View>
                  <Switch
                    value={useDiscordAvatar}
                    onValueChange={(val) => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setUseDiscordAvatar(val);
                    }}
                    trackColor={{ false: '#26223D', true: colors.primary }}
                    thumbColor={useDiscordAvatar ? colors.white : '#888'}
                  />
                </View>
              )}

              {/* Avatar Presets Selection */}
              <Text style={styles.sectionHeader}>FOTOS DE PERFIL DE LA APP</Text>
              <Text style={styles.fieldHelp}>Elige un avatar oficial de JodiFy para tu cuenta:</Text>

              <View style={styles.presetsGrid}>
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
                          <Ionicons name="checkmark" size={14} color={colors.white} />
                        </View>
                      )}
                      <Text style={[styles.presetName, isSelected && styles.presetNameActive]} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </PressableFluid>
                  );
                })}
              </View>

              {/* Custom Image URL Option */}
              <Text style={styles.sectionHeader}>O INGRESA URL DE FOTO PERSONALIZADA</Text>
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
                />
              </View>

              {/* Spacer */}
              <View style={{ height: 28 }} />
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
  container: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(127, 0, 255, 0.28)',
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
    letterSpacing: typography.headlineMedium.letterSpacing,
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
  accountBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    gap: 16,
    marginBottom: 20,
  },
  avatarPreviewWrap: {
    position: 'relative',
  },
  avatarPreviewImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: colors.white,
    fontFamily: typography.displayMedium.fontFamily,
    fontSize: typography.displayMedium.fontSize,
  },
  roleBadgeIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  accountMetaInfo: {
    flex: 1,
  },
  accountUsername: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: typography.headlineMedium.fontSize,
  },
  roleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginVertical: 4,
  },
  roleTagText: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  createdDateText: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    color: colors.secondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 8,
    fontWeight: '700',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
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
    fontSize: 11.5,
    marginTop: 6,
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(88, 101, 242, 0.12)',
    borderRadius: radius.md,
    padding: 12,
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(88, 101, 242, 0.3)',
  },
  toggleTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13,
  },
  toggleSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
    marginTop: 2,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  presetCard: {
    width: (SCREEN_WIDTH - 64) / 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.md,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative',
  },
  presetCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(127, 0, 255, 0.18)',
  },
  presetImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 6,
  },
  presetCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetName: {
    color: colors.textMuted,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10.5,
  },
  presetNameActive: {
    color: colors.white,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
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
    paddingVertical: 14,
    gap: 8,
  },
  saveBtnText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
