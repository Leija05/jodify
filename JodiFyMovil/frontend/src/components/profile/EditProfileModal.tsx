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
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { PressableFluid } from '@components/ui/PressableFluid';
import { UserAvatar } from '@components/ui/UserAvatar';
import { ProfileInspectionAnimation } from './ProfileInspectionAnimation';
import { useSettingsStore } from '@stores/settings.store';
import { useToastStore } from '@stores/toast.store';
import { useLibraryStore } from '@stores/library.store';
import { updateUserProfile } from '@services/users.service';
import { pickCoverUrl } from '@lib/utils';
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

import { PixelPet } from '../social/PixelPet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: TabKey;
}

type TabKey = 'identity' | 'anthem' | 'avatar' | 'discord' | 'pet' | 'frame' | 'theme' | 'animation';

const BANNER_GRADIENT_PRESETS = [
  { id: 'none', name: 'Original', start: '', end: '' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', start: '#00f0ff', end: '#ff007f' },
  { id: 'synth_sunset', name: 'Atardecer Synth', start: '#ff5e62', end: '#ff9966' },
  { id: 'midnight_violet', name: 'Violeta Medianoche', start: '#6366f1', end: '#a855f7' },
  { id: 'emerald_wave', name: 'Onda Esmeralda', start: '#0575e6', end: '#00f260' },
  { id: 'royal_gold', name: 'Oro Real', start: '#f7971e', end: '#ffd200' },
  { id: 'crimson_dark', name: 'Rubí Carmesí', start: '#ed213a', end: '#93291e' },
  { id: 'electric_lime', name: 'Lima Eléctrica', start: '#11998e', end: '#38ef7d' },
  { id: 'deep_space', name: 'Espacio Profundo', start: '#0f0c29', end: '#302b63' },
  { id: 'supernova_fire', name: 'Fuego Supernova', start: '#ff0844', end: '#ffb199' },
];

const PET_SPECIES_PRESETS = [
  {
    id: 'none',
    name: 'Sin Mascota',
    emoji: '🚫',
    description: 'No mostrar mascota compañera en tu perfil',
    variants: [],
  },
  {
    id: 'cat',
    name: 'Gatito Pixel Art',
    emoji: '🐱',
    description: 'Compañero felino que ronronea y baila al compás de cada beat',
    variants: [
      { id: 'orange', name: 'Naranja Callejero', previewColor: '#f97316' },
      { id: 'black', name: 'Pantera Negra', previewColor: '#18181b' },
      { id: 'white', name: 'Blanco Nieve', previewColor: '#ffffff' },
      { id: 'siamese', name: 'Siamés Místico', previewColor: '#fde68a' },
      { id: 'calico', name: 'Calicó Alegre', previewColor: '#ea580c' },
    ],
  },
  {
    id: 'dog',
    name: 'Perrito Fiel',
    emoji: '🐶',
    description: 'Compañero canino leal con cola alegre y sonrisa rítmica',
    variants: [
      { id: 'shiba', name: 'Shiba Inu', previewColor: '#f59e0b' },
      { id: 'corgi', name: 'Corgi Glotón', previewColor: '#ea580c' },
      { id: 'husky', name: 'Husky Siberiano', previewColor: '#334155' },
      { id: 'dalmatian', name: 'Dálmata Melómano', previewColor: '#f8fafc' },
    ],
  },
  {
    id: 'axolotl',
    name: 'Ajolote Mágico',
    emoji: '🫧',
    description: 'Espíritu de agua dulce con bioluminiscencia y carisma eterno',
    variants: [
      { id: 'pink', name: 'Rosa Melocotón', previewColor: '#f472b6' },
      { id: 'neon_cyan', name: 'Cian Neón Hi-Fi', previewColor: '#06b6d4' },
      { id: 'abyssal', name: 'Abisal Místico', previewColor: '#4c1d95' },
    ],
  },
  {
    id: 'magikarp',
    name: 'Magikarp Festivo',
    emoji: '🐟',
    description: '¡Usa Splash cada vez que cambia el drop de la canción!',
    variants: [
      { id: 'classic', name: 'Rojo Carmesí', previewColor: '#ef4444' },
      { id: 'golden', name: 'Shiny Dorado VIP', previewColor: '#fbbf24' },
    ],
  },
  {
    id: 'frog',
    name: 'Ranita Lo-Fi',
    emoji: '🐸',
    description: 'Relájate con beats de lluvia y una hojita de loto en su cabeza',
    variants: [
      { id: 'classic', name: 'Verde Bosque', previewColor: '#10b981' },
      { id: 'poison_dart', name: 'Azul Dardo Neón', previewColor: '#3b82f6' },
      { id: 'golden_frog', name: 'Rana Dorada', previewColor: '#fbbf24' },
    ],
  },
  {
    id: 'capybara',
    name: 'Capibara Zen',
    emoji: '🍊',
    description: 'La máxima encarnación de la paz mental, con una naranja zen',
    variants: [
      { id: 'classic', name: 'Marrón Tropical', previewColor: '#92400e' },
      { id: 'zen', name: 'Maestro Zen', previewColor: '#b45309' },
    ],
  },
  {
    id: 'penguin',
    name: 'Pingüino DJ',
    emoji: '🐧',
    description: 'Desliza sobre el hielo con audífonos puestos para pinchar música',
    variants: [
      { id: 'classic', name: 'Tuxedo Imperial', previewColor: '#0f172a' },
      { id: 'gentoo', name: 'Gentoo Ártico', previewColor: '#1e293b' },
      { id: 'cyber_penguin', name: 'Cyber Glaciar', previewColor: '#0284c7' },
    ],
  },
  {
    id: 'ghost',
    name: 'Fantasmita 8-Bit',
    emoji: '👻',
    description: 'Entidad espectral flotante amante de los sintetizadores retro',
    variants: [
      { id: 'classic', name: 'Vaporwave Celeste', previewColor: '#e0f2fe' },
      { id: 'neon', name: 'Neón Espectral', previewColor: '#c084fc' },
    ],
  },
  {
    id: 'fox',
    name: 'Kitsune Astuto',
    emoji: '🦊',
    description: 'Zorrito mítico con cola esponjosa y gran agilidad sonora',
    variants: [
      { id: 'classic', name: 'Fuego Carmesí', previewColor: '#f97316' },
      { id: 'arctic', name: 'Zorro Ártico', previewColor: '#f1f5f9' },
      { id: 'spirit', name: 'Espíritu Astral', previewColor: '#c084fc' },
    ],
  },
  {
    id: 'robot',
    name: 'CyberBot 808',
    emoji: '🤖',
    description: 'Chasis sintético con pantalla CRT y ecualizador LED incorporado',
    variants: [
      { id: 'classic', name: 'Titanio Retro 80s', previewColor: '#64748b' },
      { id: 'neon_matrix', name: 'Matrix Verde', previewColor: '#1e293b' },
      { id: 'golden_mech', name: 'Mecha Dorado VIP', previewColor: '#eab308' },
    ],
  },
  {
    id: 'dragon',
    name: 'Dragoncito Chibi',
    emoji: '🐲',
    description: 'Criatura legendaria que escupe chispitas al ritmo del bajo',
    variants: [
      { id: 'ruby', name: 'Dragón de Rubí', previewColor: '#e11d48' },
      { id: 'astral', name: 'Dragón Celestial', previewColor: '#818cf8' },
    ],
  },
];

export function EditProfileModal({ visible, onClose, initialTab }: EditProfileModalProps) {
  const user = useSettingsStore((s) => s.user);
  const updateUser = useSettingsStore((s) => s.updateUser);
  const showToast = useToastStore((s) => s.show);
  const librarySongs = useLibraryStore((s) => s.songs);

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab || 'identity');

  useEffect(() => {
    if (visible && initialTab) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [vibe, setVibe] = useState('');
  const [customBadge, setCustomBadge] = useState('');
  const [anthemSongId, setAnthemSongId] = useState<string | number | null>(null);
  const [anthemSongName, setAnthemSongName] = useState<string | null>(null);
  const [anthemSearch, setAnthemSearch] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [useDiscordAvatar, setUseDiscordAvatar] = useState(false);
  const [showDiscordActivity, setShowDiscordActivity] = useState(true);
  const [discordProfile, setDiscordProfile] = useState<{
    username?: string;
    display_name?: string;
    avatar_url?: string;
    found?: boolean;
    status?: string;
  } | null>(null);
  const [discordLoading, setDiscordLoading] = useState(false);

  const [avatarFrame, setAvatarFrame] = useState('none');
  const [theme, setTheme] = useState('aurora');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [profileAnimation, setProfileAnimation] = useState('astral-pulse');
  const [petType, setPetType] = useState('none');
  const [petVariant, setPetVariant] = useState('orange');
  const [petName, setPetName] = useState('');
  const [customGradientStart, setCustomGradientStart] = useState('');
  const [customGradientEnd, setCustomGradientEnd] = useState('');
  const [saving, setSaving] = useState(false);

  // Entrance animation
  const animValue = useMemo(() => new Animated.Value(0), []);

  const fetchDiscordInfo = useCallback(async (id: string) => {
    const clean = id.trim();
    if (!clean || !/^\d+$/.test(clean) || clean.length < 15) {
      setDiscordProfile(null);
      return;
    }
    setDiscordLoading(true);
    try {
      // 1. Try direct Lanyard API
      const res = await fetch(`https://api.lanyard.rest/v1/users/${clean}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json?.data?.discord_user) {
          const u = json.data.discord_user;
          const ext = u.avatar?.startsWith('a_') ? 'gif' : 'png';
          const avatar = u.avatar
            ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${ext}?size=256`
            : `https://cdn.discordapp.com/embed/avatars/${Math.abs(parseInt(clean.slice(-4), 10) || 0) % 5}.png`;
          setDiscordProfile({
            found: true,
            username: u.username,
            display_name: u.display_name || u.global_name,
            avatar_url: avatar,
            status: json.data.discord_status || 'offline',
          });
          return;
        }
      }

      // 2. Try backend resolver endpoint
      const apiBase = (process.env.EXPO_PUBLIC_API_BASE || 'https://jodify-backend.onrender.com').replace(/\/+$/, '');
      const bRes = await fetch(`${apiBase}/api/users/discord/lookup/${clean}`);
      if (bRes.ok) {
        const bJson = await bRes.json();
        if (bJson.found) {
          setDiscordProfile({
            found: true,
            username: bJson.username,
            display_name: bJson.display_name,
            avatar_url: bJson.avatar_url,
            status: bJson.status || 'offline',
          });
          return;
        }
      }

      // 3. Fallback when user is not present on Lanyard
      const lastDigits = parseInt(clean.slice(-4), 10) || 0;
      setDiscordProfile({
        found: false,
        username: `Discord (${clean.slice(-4)})`,
        avatar_url: `https://cdn.discordapp.com/embed/avatars/${Math.abs(lastDigits) % 5}.png`,
      });
    } catch {
      setDiscordProfile(null);
    } finally {
      setDiscordLoading(false);
    }
  }, []);

  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso necesario',
          'Se necesita permiso de acceso a fotos para seleccionar tu foto de perfil.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset) return;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        let finalUrl = asset.uri;
        if (asset.base64) {
          const mime = asset.mimeType || 'image/jpeg';
          finalUrl = `data:${mime};base64,${asset.base64}`;
        }
        setAvatarUrl(finalUrl);
        setUseDiscordAvatar(false);
        showToast('Foto cargada desde galería', 'success');
      }
    } catch (err: any) {
      console.warn('[EditProfileModal] Error picking image:', err);
      Alert.alert('Error', 'No se pudo cargar la imagen de la galería.');
    }
  };

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
      setAnthemSongId(user.anthem_song_id ?? null);
      setAnthemSongName(user.anthem_song_name ?? null);
      setAnthemSearch('');
      setAvatarUrl(user.avatar_url ?? '');
      setDiscordId(user.discord_id ?? '');
      setUseDiscordAvatar(user.avatar_source === 'discord');
      setShowDiscordActivity(user.show_discord_activity ?? true);
      setAvatarFrame(user.avatar_frame ?? 'none');
      setTheme(user.theme ?? 'aurora');
      setAccentColor(user.accent_color ?? '#10b981');
      setProfileAnimation(user.profile_animation || 'astral-pulse');
      setPetType(user.pet_type ?? 'none');
      setPetVariant(user.pet_variant ?? 'orange');
      setPetName(user.pet_name ?? '');
      setCustomGradientStart(user.custom_gradient_start ?? '');
      setCustomGradientEnd(user.custom_gradient_end ?? '');

      if (user.discord_id) {
        void fetchDiscordInfo(user.discord_id);
      } else {
        setDiscordProfile(null);
      }
    }
  }, [visible, user, fetchDiscordInfo]);

  const filteredAnthemSongs = useMemo(() => {
    if (!anthemSearch.trim()) return librarySongs;
    const q = anthemSearch.toLowerCase().trim();
    return librarySongs.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.artist && s.artist.toLowerCase().includes(q))
    );
  }, [librarySongs, anthemSearch]);

  const effectiveAvatarUrl = useMemo(() => {
    if (useDiscordAvatar) {
      if (discordProfile?.avatar_url) return discordProfile.avatar_url;
      const cachedDiscord = (user as any)?.discord_avatar_url;
      if (cachedDiscord) return cachedDiscord;
      if (discordId.trim().length > 10) {
        const lastDigits = parseInt(discordId.slice(-4), 10) || 0;
        return `https://cdn.discordapp.com/embed/avatars/${Math.abs(lastDigits) % 5}.png`;
      }
    }
    return avatarUrl.trim() || null;
  }, [useDiscordAvatar, discordId, discordProfile, avatarUrl, user]);

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
      const resolvedAvatarUrl = (useDiscordAvatar && discordProfile?.avatar_url)
        ? discordProfile.avatar_url
        : (avatarUrl.trim() || null);

      const payload = {
        display_name: displayName.trim() || user.username,
        bio: bio.trim(),
        vibe: vibe.trim() || null,
        custom_badge: customBadge.trim() || null,
        anthem_song_id: anthemSongId || null,
        anthem_song_name: anthemSongName ? anthemSongName.trim() : null,
        avatar_source: useDiscordAvatar ? ('discord' as const) : ('custom' as const),
        avatar_url: resolvedAvatarUrl,
        discord_id: discordId.trim() || null,
        show_discord_activity: showDiscordActivity,
        avatar_frame: avatarFrame || 'none',
        theme: theme || 'aurora',
        accent_color: accentColor || '#10b981',
        profile_animation: profileAnimation || 'astral-pulse',
        pet_type: petType || 'none',
        pet_variant: petVariant || 'orange',
        pet_name: petName.trim() || null,
        custom_gradient_start: customGradientStart.trim() || null,
        custom_gradient_end: customGradientEnd.trim() || null,
      };

      await updateUserProfile(user.username, payload);

      updateUser({
        display_name: payload.display_name,
        bio: payload.bio,
        vibe: payload.vibe || undefined,
        custom_badge: payload.custom_badge || undefined,
        anthem_song_id: payload.anthem_song_id ?? undefined,
        anthem_song_name: payload.anthem_song_name ?? undefined,
        avatar_source: payload.avatar_source,
        avatar_url: payload.avatar_url || undefined,
        discord_id: payload.discord_id || undefined,
        show_discord_activity: payload.show_discord_activity,
        avatar_frame: payload.avatar_frame,
        theme: payload.theme,
        accent_color: payload.accent_color,
        profile_animation: payload.profile_animation,
        pet_type: payload.pet_type,
        pet_variant: payload.pet_variant,
        pet_name: payload.pet_name || undefined,
        custom_gradient_start: payload.custom_gradient_start || undefined,
        custom_gradient_end: payload.custom_gradient_end || undefined,
      });

      // Synchronize in background with fresh database state
      void useSettingsStore.getState().refreshProfile();

      showToast('Perfil guardado con éxito', 'success');
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
              colors={[
                customGradientStart || accentColor + '30',
                customGradientEnd || 'rgba(12, 12, 24, 0.95)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.previewGradient}
            />
            <View style={styles.previewContent}>
              <UserAvatar
                avatarUrl={effectiveAvatarUrl}
                username={displayName || user?.username}
                frameId={avatarFrame}
                size={66}
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
                {anthemSongName ? (
                  <View style={styles.previewAnthemPill}>
                    <Ionicons name="disc" size={11} color="#00E5FF" />
                    <Text style={styles.previewAnthemText} numberOfLines={1}>
                      {anthemSongName}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Live Pet Preview in header if active */}
              {petType && petType !== 'none' && (
                <View style={styles.previewPetWrap}>
                  <PixelPet
                    petType={petType}
                    variant={petVariant}
                    petName={petName}
                    size={46}
                    interactive={true}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Tab Selector (Smooth Horizontal Scroll - No Overlapping) */}
          <View style={styles.tabBarContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBarScroll}
            >
              <PressableFluid
                onPress={() => setActiveTab('identity')}
                haptic="light"
                style={[styles.tabBtn, activeTab === 'identity' && styles.tabBtnActive]}
              >
                <Ionicons
                  name="person-outline"
                  size={15}
                  color={activeTab === 'identity' ? colors.white : colors.textMuted}
                />
                <Text style={[styles.tabText, activeTab === 'identity' && styles.tabTextActive]}>
                  Identidad
                </Text>
              </PressableFluid>

              <PressableFluid
                onPress={() => setActiveTab('anthem')}
                haptic="light"
                style={[styles.tabBtn, activeTab === 'anthem' && styles.tabBtnActive]}
              >
                <Ionicons
                  name="disc-outline"
                  size={15}
                  color={activeTab === 'anthem' ? '#00E5FF' : colors.textMuted}
                />
                <Text style={[styles.tabText, activeTab === 'anthem' && styles.tabTextActive]}>
                  Himno
                </Text>
              </PressableFluid>

              <PressableFluid
                onPress={() => setActiveTab('avatar')}
                haptic="light"
                style={[styles.tabBtn, activeTab === 'avatar' && styles.tabBtnActive]}
              >
                <Ionicons
                  name="image-outline"
                  size={15}
                  color={activeTab === 'avatar' ? colors.white : colors.textMuted}
                />
                <Text style={[styles.tabText, activeTab === 'avatar' && styles.tabTextActive]}>
                  Avatar
                </Text>
              </PressableFluid>

              <PressableFluid
                onPress={() => setActiveTab('discord')}
                haptic="light"
                style={[styles.tabBtn, activeTab === 'discord' && styles.tabBtnActive]}
              >
                <Ionicons
                  name="logo-discord"
                  size={15}
                  color={activeTab === 'discord' ? '#5865F2' : colors.textMuted}
                />
                <Text style={[styles.tabText, activeTab === 'discord' && styles.tabTextActive]}>
                  Discord
                </Text>
              </PressableFluid>

              <PressableFluid
                onPress={() => setActiveTab('pet')}
                haptic="light"
                style={[styles.tabBtn, activeTab === 'pet' && styles.tabBtnActive]}
              >
                <Ionicons
                  name="paw-outline"
                  size={15}
                  color={activeTab === 'pet' ? colors.white : colors.textMuted}
                />
                <Text style={[styles.tabText, activeTab === 'pet' && styles.tabTextActive]}>
                  Mascota
                </Text>
              </PressableFluid>

              <PressableFluid
                onPress={() => setActiveTab('frame')}
                haptic="light"
                style={[styles.tabBtn, activeTab === 'frame' && styles.tabBtnActive]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={15}
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
                  size={15}
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
                  size={15}
                  color={activeTab === 'animation' ? colors.white : colors.textMuted}
                />
                <Text style={[styles.tabText, activeTab === 'animation' && styles.tabTextActive]}>
                  Efecto
                </Text>
              </PressableFluid>
            </ScrollView>
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

            {activeTab === 'anthem' && (
              <View style={styles.sectionWrap}>
                <View>
                  <Text style={styles.sectionTitle}>Himno Musical del Perfil</Text>
                  <Text style={styles.sectionSubtitle}>
                    Tu rolón insignia se exhibirá con vitrina exclusiva y reproducción en tu perfil.
                  </Text>
                </View>

                {/* Currently selected anthem card */}
                {anthemSongName ? (
                  <View style={styles.anthemSelectedBox}>
                    <LinearGradient
                      colors={['rgba(0, 229, 255, 0.15)', 'rgba(127, 0, 255, 0.15)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.anthemSelectedLeft}>
                      <View style={styles.anthemSelectedDiscWrap}>
                        <Ionicons name="disc" size={24} color="#00E5FF" />
                      </View>
                      <View style={styles.anthemSelectedMeta}>
                        <Text style={styles.anthemSelectedTag}>HIMNO SELECCIONADO</Text>
                        <Text style={styles.anthemSelectedTitle} numberOfLines={1}>
                          {anthemSongName}
                        </Text>
                      </View>
                    </View>
                    <PressableFluid
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setAnthemSongId(null);
                        setAnthemSongName(null);
                      }}
                      haptic="light"
                      style={styles.anthemRemoveBtn}
                    >
                      <Ionicons name="trash-outline" size={15} color="#ff4d4f" />
                      <Text style={styles.anthemRemoveText}>Quitar</Text>
                    </PressableFluid>
                  </View>
                ) : (
                  <View style={styles.anthemNoneBox}>
                    <Ionicons name="disc-outline" size={24} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.anthemNoneText}>
                      Aún no tienes un himno activo. Elige una canción de tu biblioteca a continuación:
                    </Text>
                  </View>
                )}

                {/* Search bar */}
                <View style={styles.anthemSearchBox}>
                  <Ionicons name="search" size={16} color={colors.textMuted} style={styles.anthemSearchIcon} />
                  <TextInput
                    style={styles.anthemSearchInput}
                    value={anthemSearch}
                    onChangeText={setAnthemSearch}
                    placeholder="Buscar en tu biblioteca..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                  {anthemSearch.length > 0 && (
                    <PressableFluid
                      onPress={() => setAnthemSearch('')}
                      haptic="light"
                      style={styles.anthemSearchClear}
                    >
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </PressableFluid>
                  )}
                </View>

                {/* Song list */}
                <View style={styles.anthemSongListWrap}>
                  {filteredAnthemSongs.length === 0 ? (
                    <View style={styles.emptySearchWrap}>
                      <Ionicons name="musical-notes-outline" size={30} color="rgba(255,255,255,0.2)" />
                      <Text style={styles.emptySearchText}>
                        {anthemSearch.trim()
                          ? 'No se encontraron canciones que coincidan'
                          : 'No tienes canciones disponibles en tu biblioteca'}
                      </Text>
                    </View>
                  ) : (
                    filteredAnthemSongs.slice(0, 35).map((song) => {
                      const isSelected =
                        (anthemSongId && String(song.id) === String(anthemSongId)) ||
                        anthemSongName?.toLowerCase().trim() === song.name.toLowerCase().trim();
                      const cover = pickCoverUrl(song);

                      return (
                        <PressableFluid
                          key={String(song.id)}
                          onPress={() => {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setAnthemSongId(song.id);
                            setAnthemSongName(song.name);
                          }}
                          haptic="light"
                          style={[styles.anthemSongRow, isSelected && styles.anthemSongRowSelected]}
                        >
                          <View style={styles.anthemRowLeft}>
                            {cover ? (
                              <Image source={{ uri: cover }} style={styles.anthemRowCover} />
                            ) : (
                              <View style={styles.anthemRowPlaceholder}>
                                <Ionicons name="musical-note" size={16} color={colors.textMuted} />
                              </View>
                            )}
                            <View style={styles.anthemRowTexts}>
                              <Text
                                style={[styles.anthemRowTitle, isSelected && styles.anthemRowTitleSelected]}
                                numberOfLines={1}
                              >
                                {song.name}
                              </Text>
                              <Text style={styles.anthemRowArtist} numberOfLines={1}>
                                {song.artist || 'Artista desconocido'}
                              </Text>
                            </View>
                          </View>

                          <View style={[styles.anthemRadio, isSelected && styles.anthemRadioSelected]}>
                            {isSelected && <View style={styles.anthemRadioInner} />}
                          </View>
                        </PressableFluid>
                      );
                    })
                  )}
                </View>
              </View>
            )}

            {activeTab === 'avatar' && (
              <View style={styles.sectionWrap}>
                {/* 1. Galería del teléfono */}
                <Text style={styles.sectionTitle}>1. Foto desde tu Galería</Text>
                <Text style={styles.sectionSubtitle}>Sube cualquier foto de tu dispositivo móvil</Text>

                {(avatarUrl.startsWith('data:') || avatarUrl.startsWith('file:') || avatarUrl.startsWith('content:')) && !useDiscordAvatar ? (
                  <View style={styles.galleryPreviewCard}>
                    <Image source={{ uri: avatarUrl }} style={styles.galleryPreviewImg} />
                    <View style={styles.galleryPreviewMeta}>
                      <View style={styles.galleryBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                        <Text style={styles.galleryBadgeText}>Foto personalizada activa</Text>
                      </View>
                      <View style={styles.galleryBtnRow}>
                        <PressableFluid
                          onPress={handlePickFromGallery}
                          style={styles.galleryChangeBtn}
                          haptic="light"
                        >
                          <Ionicons name="camera-outline" size={14} color={colors.white} />
                          <Text style={styles.galleryBtnText}>Cambiar</Text>
                        </PressableFluid>
                        <PressableFluid
                          onPress={() => {
                            setAvatarUrl('');
                            useToastStore.getState().show('Foto personalizada removida', 'info');
                          }}
                          style={styles.galleryRemoveBtn}
                          haptic="light"
                        >
                          <Ionicons name="trash-outline" size={14} color="#ff3366" />
                          <Text style={[styles.galleryBtnText, { color: '#ff3366' }]}>Quitar</Text>
                        </PressableFluid>
                      </View>
                    </View>
                  </View>
                ) : (
                  <PressableFluid
                    onPress={handlePickFromGallery}
                    style={styles.galleryUploadBtn}
                    haptic="medium"
                  >
                    <View style={styles.galleryUploadIconWrap}>
                      <Ionicons name="images" size={24} color="#00E5FF" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.galleryUploadTitle}>Elegir foto de la galería</Text>
                      <Text style={styles.galleryUploadSub}>Selecciona una imagen de tu dispositivo (JPG, PNG)</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
                  </PressableFluid>
                )}

                <View style={styles.divider} />

                {/* 2. Colección Exclusiva JodiFy */}
                <Text style={styles.sectionTitle}>2. Colección Exclusiva JodiFy</Text>
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

                {/* 3. Pegar URL Directa */}
                <Text style={styles.sectionTitle}>3. Pegar URL Directa de Imagen</Text>
                <TextInput
                  style={styles.input}
                  value={avatarUrl.startsWith('data:') ? 'Foto personalizada (base64)' : avatarUrl}
                  onChangeText={(val) => {
                    setAvatarUrl(val);
                    setUseDiscordAvatar(false);
                  }}
                  placeholder="https://ejemplo.com/tu-foto.jpg"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!avatarUrl.startsWith('data:')}
                />

                <View style={styles.divider} />

                {/* 4. Acceso directo a Discord */}
                <PressableFluid
                  onPress={() => setActiveTab('discord')}
                  style={styles.discordBannerBtn}
                  haptic="light"
                >
                  <View style={styles.discordIconWrap}>
                    <Ionicons name="logo-discord" size={22} color="#5865F2" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.discordBannerTitle}>¿Quieres usar tu foto de Discord?</Text>
                    <Text style={styles.discordBannerSub}>
                      {discordProfile?.found
                        ? `Conectado como @${discordProfile.username}`
                        : 'Configura tu Discord ID en la pestaña Discord'}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="#5865F2" />
                </PressableFluid>
              </View>
            )}

            {activeTab === 'discord' && (
              <View style={styles.sectionWrap}>
                <View style={styles.discordHeaderCard}>
                  <View style={styles.discordLogoCircle}>
                    <Ionicons name="logo-discord" size={28} color="#5865F2" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.discordHeaderTitle}>Vinculación con Discord</Text>
                    <Text style={styles.discordHeaderSub}>
                      Sincroniza tu foto de perfil real y tu actividad musical directamente en tu perfil.
                    </Text>
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>1. Tu Discord ID</Text>
                <Text style={styles.sectionSubtitle}>Introduce tu ID numérico de Discord (17-19 dígitos)</Text>
                <View style={styles.discordInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={discordId}
                    onChangeText={(val) => {
                      setDiscordId(val);
                      if (val.trim().length >= 17) {
                        void fetchDiscordInfo(val);
                      }
                    }}
                    placeholder="Ej. 768431429313888266"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="numeric"
                  />
                  <PressableFluid
                    onPress={() => void fetchDiscordInfo(discordId)}
                    style={styles.discordVerifyBtn}
                    haptic="medium"
                    disabled={discordLoading || !discordId.trim()}
                  >
                    {discordLoading ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Ionicons name="search" size={15} color={colors.white} />
                        <Text style={styles.discordVerifyText}>Buscar</Text>
                      </>
                    )}
                  </PressableFluid>
                </View>

                {/* Live Discord User Preview */}
                {discordProfile && (
                  <View style={[styles.discordProfileCard, discordProfile.found && styles.discordProfileCardFound]}>
                    <View style={styles.discordProfileTop}>
                      {discordProfile.avatar_url ? (
                        <Image source={{ uri: discordProfile.avatar_url }} style={styles.discordAvatarImg} />
                      ) : (
                        <View style={styles.discordAvatarPlaceholder}>
                          <Ionicons name="logo-discord" size={24} color="#5865F2" />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.discordProfileName} numberOfLines={1}>
                          {discordProfile.display_name || discordProfile.username || 'Usuario Discord'}
                        </Text>
                        <Text style={styles.discordProfileTag}>@{discordProfile.username}</Text>
                        <View style={[styles.discordStatusBadge, discordProfile.found ? styles.discordStatusBadgeSuccess : styles.discordStatusBadgeWarn]}>
                          <Ionicons
                            name={discordProfile.found ? 'checkmark-circle' : 'alert-circle'}
                            size={12}
                            color={discordProfile.found ? '#10b981' : '#f59e0b'}
                          />
                          <Text style={[styles.discordStatusText, { color: discordProfile.found ? '#10b981' : '#f59e0b' }]}>
                            {discordProfile.found ? 'Avatar oficial encontrado en HD' : 'Avatar básico (no detectado en Lanyard)'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.switchRow}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.switchLabel}>Usar foto de perfil de Discord</Text>
                        <Text style={styles.switchSublabel}>
                          Se mostrará tu avatar real de Discord como foto de tu cuenta en JodiFy.
                        </Text>
                      </View>
                      <Switch
                        value={useDiscordAvatar}
                        onValueChange={(val) => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setUseDiscordAvatar(val);
                          if (val && discordProfile?.avatar_url) {
                            setAvatarUrl(discordProfile.avatar_url);
                          }
                        }}
                        trackColor={{ false: '#222', true: '#5865F2' }}
                        thumbColor={colors.white}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.divider} />

                {/* Show activity switch */}
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.switchLabel}>Mostrar actividad de Discord</Text>
                    <Text style={styles.switchSublabel}>
                      Permite que otros usuarios vean tu presencia y estado de Discord en tu perfil social.
                    </Text>
                  </View>
                  <Switch
                    value={showDiscordActivity}
                    onValueChange={(val) => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowDiscordActivity(val);
                    }}
                    trackColor={{ false: '#222', true: '#10b981' }}
                    thumbColor={colors.white}
                  />
                </View>

                {/* Help and troubleshooting box */}
                <View style={styles.discordHelpBox}>
                  <Text style={styles.discordHelpTitle}>💡 ¿Por qué no carga mi foto de Discord?</Text>
                  <Text style={styles.discordHelpText}>
                    Discord protege la privacidad de sus usuarios y no comparte fotos fuera de su plataforma por defecto. Para que tu foto y estado se sincronicen en vivo:
                  </Text>
                  <Text style={styles.discordHelpStep}>
                    1. Únete una sola vez al servidor público de la API: <Text style={{ color: '#00E5FF', fontWeight: 'bold' }}>discord.gg/lanyard</Text>
                  </Text>
                  <Text style={styles.discordHelpStep}>
                    2. Vuelve aquí e introduce tu Discord ID; tu foto y estado aparecerán de inmediato.
                  </Text>
                  <Text style={styles.discordHelpStep}>
                    3. Si no deseas unirte a ningún servidor, puedes subir cualquier foto directamente desde la pestaña <Text style={{ color: colors.white, fontWeight: 'bold' }}>Avatar &gt; Galería</Text>.
                  </Text>
                </View>
              </View>
            )}

            {activeTab === 'pet' && (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>Mascota Virtual Compañera</Text>
                <Text style={styles.sectionSubtitle}>
                  Elige a tu fiel amigo sonoro. Reaccionará al ritmo de tus canciones y hablará contigo.
                </Text>

                {/* Interactive Pet Playground Card */}
                {petType !== 'none' && (
                  <View style={styles.petPlaygroundCard}>
                    <LinearGradient
                      colors={['rgba(0, 229, 255, 0.15)', 'rgba(127, 0, 255, 0.1)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.petPlaygroundCenter}>
                      <PixelPet
                        petType={petType}
                        variant={petVariant}
                        petName={petName}
                        size={64}
                        interactive={true}
                      />
                      <Text style={styles.petPlaygroundHint}>¡Toca a tu mascota para interactuar!</Text>
                    </View>
                  </View>
                )}

                {/* Pet Name input */}
                {petType !== 'none' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Nombre de tu mascota</Text>
                    <TextInput
                      style={styles.input}
                      value={petName}
                      onChangeText={setPetName}
                      placeholder="Ej. Michi, Shiba, Karp, etc."
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      maxLength={20}
                    />
                  </View>
                )}

                {/* Variant Selector for currently selected pet */}
                {(() => {
                  const currentSpec = PET_SPECIES_PRESETS.find((p) => p.id === petType);
                  if (!currentSpec || currentSpec.variants.length === 0) return null;
                  return (
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Pelaje / Variante de Color</Text>
                      <View style={styles.variantsRow}>
                        {currentSpec.variants.map((v) => {
                          const isSelected = petVariant === v.id;
                          return (
                            <PressableFluid
                              key={v.id}
                              onPress={() => {
                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setPetVariant(v.id);
                              }}
                              style={[
                                styles.variantChip,
                                isSelected && { borderColor: v.previewColor, backgroundColor: v.previewColor + '25' },
                              ]}
                            >
                              <View style={[styles.variantDot, { backgroundColor: v.previewColor }]} />
                              <Text style={[styles.variantName, isSelected && { color: colors.white }]}>
                                {v.name}
                              </Text>
                            </PressableFluid>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}

                {/* Species List */}
                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Especies Disponibles</Text>
                <View style={styles.speciesList}>
                  {PET_SPECIES_PRESETS.map((spec) => {
                    const isSelected = petType === spec.id;
                    return (
                      <PressableFluid
                        key={spec.id}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setPetType(spec.id);
                          if (spec.variants.length > 0 && !spec.variants.some((v) => v.id === petVariant)) {
                            setPetVariant(spec.variants[0]!.id);
                          }
                        }}
                        style={[styles.speciesCard, isSelected && styles.speciesCardActive]}
                        scaleTo={0.97}
                      >
                        <View style={styles.speciesLeft}>
                          {spec.id === 'none' ? (
                            <View style={styles.noneIconBox}>
                              <Ionicons name="close-circle-outline" size={24} color={colors.textMuted} />
                            </View>
                          ) : (
                            <View style={styles.speciesIconBox}>
                              <PixelPet petType={spec.id} variant={spec.variants[0]?.id || 'orange'} size={40} interactive={false} />
                            </View>
                          )}
                          <View style={styles.speciesInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.speciesTitle, isSelected && { color: colors.white }]}>
                                {spec.name}
                              </Text>
                              <Text>{spec.emoji}</Text>
                            </View>
                            <Text style={styles.speciesDesc} numberOfLines={2}>
                              {spec.description}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color="#00E5FF" />
                        )}
                      </PressableFluid>
                    );
                  })}
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

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Banner & Degradado Personalizado</Text>
                <Text style={styles.sectionSubtitle}>
                  Elige un degradado de fondo para la cabecera de tu perfil
                </Text>

                <View style={styles.bannerGrid}>
                  {BANNER_GRADIENT_PRESETS.map((bp) => {
                    const isSelected =
                      (bp.id === 'none' && !customGradientStart) ||
                      (customGradientStart === bp.start && customGradientEnd === bp.end);

                    return (
                      <PressableFluid
                        key={bp.id}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setCustomGradientStart(bp.start);
                          setCustomGradientEnd(bp.end);
                        }}
                        style={[styles.bannerCard, isSelected && styles.bannerCardActive]}
                        scaleTo={0.96}
                      >
                        {bp.start ? (
                          <LinearGradient
                            colors={[bp.start, bp.end]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.bannerGradientThumb}
                          />
                        ) : (
                          <View style={[styles.bannerGradientThumb, { backgroundColor: '#1a1a2e' }]} />
                        )}
                        <Text style={[styles.bannerName, isSelected && { color: colors.white }]}>
                          {bp.name}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={16} color="#00E5FF" style={{ marginLeft: 'auto' }} />
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
    marginTop: 3,
    fontStyle: 'italic',
  },
  previewAnthemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    alignSelf: 'flex-start',
    maxWidth: '96%',
  },
  previewAnthemText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00E5FF',
    flexShrink: 1,
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBarScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(127, 0, 255, 0.25)',
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
  previewPetWrap: {
    marginLeft: 'auto',
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  petPlaygroundCard: {
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  petPlaygroundCenter: {
    alignItems: 'center',
    gap: 4,
  },
  petPlaygroundHint: {
    color: '#00E5FF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  variantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  variantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  variantDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  variantName: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  speciesList: {
    gap: 8,
    marginTop: 6,
  },
  speciesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  speciesCardActive: {
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
  },
  speciesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  speciesIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noneIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speciesInfo: {
    flex: 1,
  },
  speciesTitle: {
    color: colors.textSecondary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  speciesDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  bannerGrid: {
    gap: 8,
    marginTop: 4,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  bannerCardActive: {
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
  },
  bannerGradientThumb: {
    width: 40,
    height: 24,
    borderRadius: 8,
  },
  bannerName: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  anthemSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#00E5FF',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
  },
  anthemSelectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  anthemSelectedDiscWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anthemSelectedMeta: {
    flex: 1,
  },
  anthemSelectedTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00E5FF',
    letterSpacing: 0.5,
  },
  anthemSelectedTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.white,
    marginTop: 1,
  },
  anthemRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 77, 79, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 79, 0.3)',
  },
  anthemRemoveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ff4d4f',
  },
  anthemNoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  anthemNoneText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  anthemSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  anthemSearchIcon: {
    marginRight: 8,
  },
  anthemSearchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
    paddingVertical: 8,
  },
  anthemSearchClear: {
    padding: 4,
  },
  anthemSongListWrap: {
    gap: 8,
    marginTop: 4,
  },
  anthemSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  anthemSongRowSelected: {
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  anthemRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  anthemRowCover: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  anthemRowPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anthemRowTexts: {
    flex: 1,
  },
  anthemRowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  anthemRowTitleSelected: {
    color: '#00E5FF',
    fontWeight: '700',
  },
  anthemRowArtist: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  anthemRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anthemRadioSelected: {
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
  },
  anthemRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00E5FF',
  },
  emptySearchWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptySearchText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },

  // Gallery upload & preview
  galleryUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    borderStyle: 'dashed',
  },
  galleryUploadIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryUploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  galleryUploadSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  galleryPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1.2,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    gap: 12,
  },
  galleryPreviewImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  galleryPreviewMeta: {
    flex: 1,
    gap: 6,
  },
  galleryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  galleryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  galleryBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  galleryChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  galleryRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 51, 102, 0.12)',
  },
  galleryBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },

  // Discord button in Avatar tab
  discordBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(88, 101, 242, 0.12)',
    borderWidth: 1.2,
    borderColor: 'rgba(88, 101, 242, 0.35)',
  },
  discordIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(88, 101, 242, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discordBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  discordBannerSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
  },

  // Discord tab styles
  discordHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(88, 101, 242, 0.15)',
    borderWidth: 1.2,
    borderColor: 'rgba(88, 101, 242, 0.35)',
  },
  discordLogoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(88, 101, 242, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discordHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  discordHeaderSub: {
    fontSize: 11.5,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  discordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discordVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#5865F2',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 14,
  },
  discordVerifyText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  discordProfileCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 6,
  },
  discordProfileCardFound: {
    backgroundColor: 'rgba(88, 101, 242, 0.08)',
    borderColor: 'rgba(88, 101, 242, 0.4)',
  },
  discordProfileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discordAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#5865F2',
    backgroundColor: '#111',
  },
  discordAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(88, 101, 242, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discordProfileName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  discordProfileTag: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  discordStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  discordStatusBadgeSuccess: {},
  discordStatusBadgeWarn: {},
  discordStatusText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  switchSublabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  discordHelpBox: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
    marginTop: 8,
  },
  discordHelpTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#00E5FF',
    marginBottom: 2,
  },
  discordHelpText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  discordHelpStep: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    paddingLeft: 4,
  },
});
