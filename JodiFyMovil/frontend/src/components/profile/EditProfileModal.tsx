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
  Keyboard,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { PressableFluid } from '@components/ui/PressableFluid';
import { UserAvatar } from '@components/ui/UserAvatar';
import { ProfileInspectionAnimation } from './ProfileInspectionAnimation';
import { useSettingsStore } from '@stores/settings.store';
import { useToastStore } from '@stores/toast.store';
import { updateUserProfile } from '@services/users.service';
import {
  AVATAR_PRESETS,
  AVATAR_FRAMES,
  PROFILE_THEMES,
  PROFILE_BADGES,
  VIBE_PRESETS,
  PROFILE_ANIMATIONS,
  getProfileAnimationDefinition,
} from '@lib/avatar';
import { colors } from '@theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabKey = 'identity' | 'avatar' | 'frame' | 'theme' | 'animation';

export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const user = useSettingsStore((s) => s.user);
  const updateUser = useSettingsStore((s) => s.updateUser);
  const showToast = useToastStore((s) => s.show);

  const [activeTab, setActiveTab] = useState<TabKey>('identity');

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [vibe, setVibe] = useState('');
  const [customBadge, setCustomBadge] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [useDiscordAvatar, setUseDiscordAvatar] = useState(false);
  const [avatarFrame, setAvatarFrame] = useState('none');
  const [theme, setTheme] = useState('aurora');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [profileAnimation, setProfileAnimation] = useState('astral-pulse');
  const [saving, setSaving] = useState(false);

  // Entrance animation
  const animValue = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (visible) {
      Animated.spring(animValue, {
        toValue: 1,
        damping: 18,
        stiffness: 140,
        useNativeDriver: true,
      }).start();
    } else {
      animValue.setValue(0);
    }
  }, [visible, animValue]);

  useEffect(() => {
    if (visible && user) {
      setDisplayName(user.display_name ?? user.username);
      setBio(user.bio ?? '');
      setVibe(user.vibe ?? '');
      setCustomBadge(user.custom_badge ?? '');
      setAvatarUrl(user.avatar_url ?? '');
      setDiscordId(user.discord_id ?? '');
      setUseDiscordAvatar(user.avatar_source === 'discord');
      setAvatarFrame(user.avatar_frame ?? 'none');
      setTheme(user.theme ?? 'aurora');
      setAccentColor(user.accent_color ?? '#10b981');
      setProfileAnimation(user.profile_animation || 'astral-pulse');
    }
  }, [visible, user]);

  const effectiveAvatarUrl = useMemo(() => {
    if (useDiscordAvatar && discordId.trim().length > 10) {
      const lastDigits = parseInt(discordId.slice(-4), 10) || 0;
      return `https://cdn.discordapp.com/embed/avatars/${Math.abs(lastDigits) % 5}.png`;
    }
    return avatarUrl.trim() || null;
  }, [useDiscordAvatar, discordId, avatarUrl]);

  const handleSelectPreset = useCallback((url: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAvatarUrl(url);
    setUseDiscordAvatar(false);
  }, []);

  const handleSelectFrame = useCallback((frameId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAvatarFrame(frameId);
  }, []);

  const handleSelectTheme = useCallback((themeDef: (typeof PROFILE_THEMES)[0]) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(themeDef.id);
    setAccentColor(themeDef.primaryColor);
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();

    try {
      await updateUserProfile(user.username, {
        display_name: displayName.trim() || user.username,
        bio: bio.trim() || undefined,
        vibe: vibe.trim() || undefined,
        custom_badge: customBadge.trim() || undefined,
        avatar_source: useDiscordAvatar ? 'discord' : 'custom',
        avatar_url: avatarUrl.trim() || undefined,
        discord_id: discordId.trim() || undefined,
        avatar_frame: avatarFrame,
        theme: theme,
        accent_color: accentColor,
        profile_animation: profileAnimation,
      });

      updateUser({
        display_name: displayName.trim() || user.username,
        bio: bio.trim() || undefined,
        vibe: vibe.trim() || undefined,
        custom_badge: customBadge.trim() || undefined,
        avatar_source: useDiscordAvatar ? 'discord' : 'custom',
        avatar_url: avatarUrl.trim() || undefined,
        discord_id: discordId.trim() || undefined,
        avatar_frame: avatarFrame,
        theme: theme,
        accent_color: accentColor,
        profile_animation: profileAnimation,
      });

      showToast('Perfil y decoración actualizados', 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Error al guardar cambios', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: animValue,
              transform: [
                {
                  scale: animValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Personalizar Perfil</Text>
              <Text style={styles.subtitle}>Estilo, identidad y decoración JodiFy</Text>
            </View>
            <PressableFluid onPress={onClose} haptic="light" style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </PressableFluid>
          </View>

          {/* Live Preview Card */}
          <View style={styles.previewCard}>
            <LinearGradient
              colors={[accentColor + '25', '#0c0c18']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.previewGradient}
            />
            <View style={styles.previewContent}>
              <UserAvatar
                avatarUrl={effectiveAvatarUrl}
                username={displayName || user?.username}
                frameId={avatarFrame}
                size={68}
                showPresence
                presence="online"
              />
              <View style={styles.previewTexts}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewName} numberOfLines={1}>
                    {displayName || user?.username}
                  </Text>
                  {customBadge ? (
                    <View style={[styles.badgePill, { borderColor: accentColor + '88' }]}>
                      <Text style={[styles.badgeText, { color: accentColor }]}>{customBadge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.previewUsername}>@{user?.username}</Text>
                {vibe ? (
                  <Text style={styles.previewVibe} numberOfLines={1}>
                    {vibe}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabBar}>
            <PressableFluid
              onPress={() => setActiveTab('identity')}
              haptic="light"
              style={[styles.tabBtn, activeTab === 'identity' && styles.tabBtnActive]}
            >
              <Ionicons
                name="person-outline"
                size={16}
                color={activeTab === 'identity' ? colors.white : colors.textMuted}
              />
              <Text style={[styles.tabText, activeTab === 'identity' && styles.tabTextActive]}>
                Identidad
              </Text>
            </PressableFluid>

            <PressableFluid
              onPress={() => setActiveTab('avatar')}
              haptic="light"
              style={[styles.tabBtn, activeTab === 'avatar' && styles.tabBtnActive]}
            >
              <Ionicons
                name="image-outline"
                size={16}
                color={activeTab === 'avatar' ? colors.white : colors.textMuted}
              />
              <Text style={[styles.tabText, activeTab === 'avatar' && styles.tabTextActive]}>
                Avatar
              </Text>
            </PressableFluid>

            <PressableFluid
              onPress={() => setActiveTab('frame')}
              haptic="light"
              style={[styles.tabBtn, activeTab === 'frame' && styles.tabBtnActive]}
            >
              <Ionicons
                name="sparkles-outline"
                size={16}
                color={activeTab === 'frame' ? colors.white : colors.textMuted}
              />
              <Text style={[styles.tabText, activeTab === 'frame' && styles.tabTextActive]}>
                Marcos
              </Text>
            </PressableFluid>

            <PressableFluid
              onPress={() => setActiveTab('theme')}
              haptic="light"
              style={[styles.tabBtn, activeTab === 'theme' && styles.tabBtnActive]}
            >
              <Ionicons
                name="color-palette-outline"
                size={16}
                color={activeTab === 'theme' ? colors.white : colors.textMuted}
              />
              <Text style={[styles.tabText, activeTab === 'theme' && styles.tabTextActive]}>
                Tema
              </Text>
            </PressableFluid>

            <PressableFluid
              onPress={() => setActiveTab('animation')}
              haptic="light"
              style={[styles.tabBtn, activeTab === 'animation' && styles.tabBtnActive]}
            >
              <Ionicons
                name="flash-outline"
                size={16}
                color={activeTab === 'animation' ? colors.white : colors.textMuted}
              />
              <Text style={[styles.tabText, activeTab === 'animation' && styles.tabTextActive]}>
                Efecto
              </Text>
            </PressableFluid>
          </View>

          {/* Tab Content */}
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {activeTab === 'identity' && (
              <View style={styles.sectionWrap}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Nombre para mostrar</Text>
                  <TextInput
                    style={styles.input}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Tu alias musical"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    maxLength={32}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabel}>Biografía</Text>
                    <Text style={styles.charCount}>{bio.length}/160</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Escribe una pequeña descripción sobre tus gustos musicales..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                    maxLength={160}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Tu Vibra Musical (Vibe)</Text>
                  <TextInput
                    style={styles.input}
                    value={vibe}
                    onChangeText={setVibe}
                    placeholder="Ej. 🌙 Modo Chill & Relax"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    {VIBE_PRESETS.map((vp) => (
                      <PressableFluid
                        key={vp}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setVibe(vp);
                        }}
                        style={[styles.chip, vibe === vp && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, vibe === vp && styles.chipTextActive]}>
                          {vp}
                        </Text>
                      </PressableFluid>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Insignia personalizada</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    {PROFILE_BADGES.map((pb) => (
                      <PressableFluid
                        key={pb}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setCustomBadge(customBadge === pb ? '' : pb);
                        }}
                        style={[styles.chip, customBadge === pb && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, customBadge === pb && styles.chipTextActive]}>
                          {pb}
                        </Text>
                      </PressableFluid>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}

            {activeTab === 'avatar' && (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>1. Colección Exclusiva JodiFy</Text>
                <Text style={styles.sectionSubtitle}>Selecciona un avatar oficial en alta resolución</Text>
                <View style={styles.presetsGrid}>
                  {AVATAR_PRESETS.map((preset) => {
                    const isSelected = !useDiscordAvatar && avatarUrl === preset.url;
                    return (
                      <PressableFluid
                        key={preset.id}
                        onPress={() => handleSelectPreset(preset.url)}
                        style={[styles.presetCard, isSelected && styles.presetCardActive]}
                        scaleTo={0.94}
                      >
                        <Image source={{ uri: preset.url }} style={styles.presetImg} />
                        <Text style={[styles.presetName, isSelected && styles.presetNameActive]} numberOfLines={1}>
                          {preset.name}
                        </Text>
                      </PressableFluid>
                    );
                  })}
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>2. Pegar URL Directa de Imagen</Text>
                <TextInput
                  style={styles.input}
                  value={avatarUrl}
                  onChangeText={(val) => {
                    setAvatarUrl(val);
                    setUseDiscordAvatar(false);
                  }}
                  placeholder="https://ejemplo.com/tu-foto.jpg"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>3. Vincular con Discord</Text>
                <TextInput
                  style={styles.input}
                  value={discordId}
                  onChangeText={setDiscordId}
                  placeholder="Tu Discord ID (ej. 433384948984971264)"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="numeric"
                />
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Usar foto de perfil de Discord</Text>
                  <Switch
                    value={useDiscordAvatar}
                    onValueChange={(val) => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setUseDiscordAvatar(val);
                    }}
                    trackColor={{ false: '#222', true: colors.primary }}
                    thumbColor={colors.white}
                  />
                </View>
              </View>
            )}

            {activeTab === 'frame' && (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>Marcos de Avatar Dinámicos</Text>
                <Text style={styles.sectionSubtitle}>
                  Añade un halo decorativo con energía sonora alrededor de tu avatar
                </Text>
                <View style={styles.framesGrid}>
                  {AVATAR_FRAMES.map((f) => {
                    const isSelected = avatarFrame === f.id;
                    return (
                      <PressableFluid
                        key={f.id}
                        onPress={() => handleSelectFrame(f.id)}
                        style={[styles.frameCard, isSelected && styles.frameCardActive]}
                        scaleTo={0.96}
                      >
                        <UserAvatar
                          avatarUrl={effectiveAvatarUrl}
                          username={displayName || user?.username}
                          frameId={f.id}
                          size={54}
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.frameName, isSelected && styles.frameNameActive]}>
                            {f.name}
                          </Text>
                          <Text style={styles.frameDesc} numberOfLines={2}>
                            {f.description}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
                        )}
                      </PressableFluid>
                    );
                  })}
                </View>
              </View>
            )}

            {activeTab === 'theme' && (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>Temas & Atmósferas de Perfil</Text>
                <Text style={styles.sectionSubtitle}>
                  Cambia el color de acento y gradiente que ilumina tu perfil
                </Text>
                <View style={styles.themesGrid}>
                  {PROFILE_THEMES.map((th) => {
                    const isSelected = theme === th.id;
                    return (
                      <PressableFluid
                        key={th.id}
                        onPress={() => handleSelectTheme(th)}
                        style={[styles.themeCard, isSelected && styles.themeCardActive]}
                        scaleTo={0.96}
                      >
                        <LinearGradient
                          colors={th.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.themeGradientBar}
                        />
                        <View style={styles.themeInfo}>
                          <Text style={[styles.themeName, isSelected && styles.themeNameActive]}>
                            {th.name}
                          </Text>
                          <Text style={styles.themeDesc}>{th.description}</Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color={th.primaryColor} />
                        )}
                      </PressableFluid>
                    );
                  })}
                </View>
              </View>
            )}

            {activeTab === 'animation' && (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionSubtitle}>
                  Efecto visual que se activa al abrir tu perfil para ti y los miembros que te inspeccionen en la comunidad.
                </Text>

                {/* Live Preview Card */}
                <View style={styles.animationPreviewContainer}>
                  <ProfileInspectionAnimation animationId={profileAnimation} showBadge={false} />
                  <View style={styles.previewAvatarWrap}>
                    <UserAvatar
                      user={{
                        username: user?.username || 'tú',
                        display_name: displayName || user?.username,
                        avatar_url: effectiveAvatarUrl,
                        avatar_frame: avatarFrame,
                        avatar_source: useDiscordAvatar ? 'discord' : 'custom',
                      }}
                      size={64}
                    />
                    <Text style={styles.previewAnimTitle}>{displayName || user?.username}</Text>
                    <View
                      style={[
                        styles.previewAnimBadge,
                        { borderColor: getProfileAnimationDefinition(profileAnimation).accent },
                      ]}
                    >
                      <Ionicons
                        name="sparkles"
                        size={11}
                        color={getProfileAnimationDefinition(profileAnimation).accent}
                      />
                      <Text
                        style={[
                          styles.previewAnimBadgeText,
                          { color: getProfileAnimationDefinition(profileAnimation).accent },
                        ]}
                      >
                        {getProfileAnimationDefinition(profileAnimation).name.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Animations List */}
                <View style={styles.animationsList}>
                  {PROFILE_ANIMATIONS.map((anim) => {
                    const isSelected = profileAnimation === anim.id;
                    return (
                      <PressableFluid
                        key={anim.id}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setProfileAnimation(anim.id);
                        }}
                        style={[
                          styles.animCard,
                          isSelected && {
                            borderColor: anim.accent,
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.animIconWrap,
                            {
                              backgroundColor:
                                anim.id === 'none'
                                  ? 'rgba(255,255,255,0.06)'
                                  : anim.accent + '22',
                              borderColor: anim.accent,
                            },
                          ]}
                        >
                          <Ionicons
                            name={anim.icon as any}
                            size={20}
                            color={anim.id === 'none' ? colors.textMuted : anim.accent}
                          />
                        </View>
                        <View style={styles.animInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.animName, isSelected && { color: colors.white }]}>
                              {anim.name}
                            </Text>
                            <View
                              style={[
                                styles.animBadgeWrap,
                                {
                                  backgroundColor:
                                    anim.id === 'none'
                                      ? 'rgba(255,255,255,0.08)'
                                      : anim.accent + '25',
                                },
                              ]}
                            >
                              <Text style={[styles.animBadgeText, { color: anim.accent }]}>
                                {anim.badge}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.animDesc} numberOfLines={2}>
                            {anim.description}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color={anim.accent} />
                        )}
                      </PressableFluid>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Bottom Save Bar */}
          <View style={styles.bottomBar}>
            <PressableFluid
              onPress={handleSave}
              haptic="medium"
              disabled={saving}
              style={styles.saveBtn}
            >
              <LinearGradient
                colors={['#7F00FF', '#00E5FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtnGradient}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color={colors.white} />
                    <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                  </>
                )}
              </LinearGradient>
            </PressableFluid>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 3, 8, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 30,
  },
  container: {
    width: Math.min(SCREEN_WIDTH - 24, 460),
    maxHeight: '92%',
    backgroundColor: 'rgba(16, 16, 28, 0.98)',
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    display: 'flex',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  previewCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  previewTexts: {
    flex: 1,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  previewName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  previewUsername: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  previewVibe: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(127, 0, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(127, 0, 255, 0.6)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  scrollArea: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionWrap: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 11,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.white,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  chipsScroll: {
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    borderColor: colors.secondary,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: -2,
    marginBottom: 6,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  presetCard: {
    width: (SCREEN_WIDTH - 80) / 4,
    alignItems: 'center',
    padding: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  presetCardActive: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
  },
  presetImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#111',
  },
  presetName: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  presetNameActive: {
    color: colors.white,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  framesGrid: {
    gap: 8,
  },
  frameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  frameCardActive: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  frameName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  frameNameActive: {
    color: colors.secondary,
  },
  frameDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  themesGrid: {
    gap: 8,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  themeCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(127, 0, 255, 0.15)',
  },
  themeGradientBar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  themeNameActive: {
    color: colors.white,
  },
  themeDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  animationPreviewContainer: {
    height: 180,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  previewAvatarWrap: {
    alignItems: 'center',
    gap: 6,
    zIndex: 2,
  },
  previewAnimTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  previewAnimBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  previewAnimBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  animationsList: {
    gap: 8,
  },
  animCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  animIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animInfo: {
    flex: 1,
  },
  animName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  animBadgeWrap: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  animBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  animDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(12, 12, 22, 0.95)',
  },
  saveBtn: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
