import { useState, useMemo, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { API_HOST } from '@lib/constants';
import { EmptyState } from '@components/ui/EmptyState';
import { DoubleBezelCard } from '@components/ui/DoubleBezelCard';
import { PressableFluid } from '@components/ui/PressableFluid';
import { Slider } from '@components/ui/Slider';
import { DynamicBackground } from '@components/player/DynamicBackground';
import { EqualizerBars } from '@components/ui/EqualizerBars';
import { currentAppVersion } from '@services/update.service';
import { clearAllDownloads } from '@services/downloads.service';
import { useLibraryStore } from '@stores/library.store';
import { useSettingsStore } from '@stores/settings.store';
import { usePlayerStore } from '@stores/player.store';
import { useEqStore } from '@stores/eq.store';
import { updateLabel, useUpdateStore } from '@stores/update.store';
import { useUiStore } from '@stores/ui.store';
import { UserProfileModal } from '@components/profile/UserProfileModal';
import { EditProfileModal } from '@components/profile/EditProfileModal';
import { UserAvatar } from '@components/ui/UserAvatar';
import { getSongPalette } from '@lib/palette';
import { pickCoverUrl, resolveSongTitle, calculateMelomanoLevel } from '@lib/utils';
import { PetCompanionCard } from '@components/social/PetCompanionCard';
import { PixelPet } from '@components/social/PixelPet';
import { colors, typography, radius, gradients } from '@theme';

const QUICK_PRESETS = [
  { id: 'flat', label: 'Flat' },
  { id: 'bass', label: 'Bass Boost' },
  { id: 'rock', label: 'Rock' },
  { id: 'electronic', label: 'Electronic' },
  { id: 'vocal', label: 'Vocal' },
  { id: 'pop', label: 'Pop' },
];

export default function SettingsScreen() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [accountDetailsOpen, setAccountDetailsOpen] = useState(false);

  const user = useSettingsStore((s) => s.user);
  const refreshProfile = useSettingsStore((s) => s.refreshProfile);
  const logout = useSettingsStore((s) => s.logout);
  const sleepTimer = useSettingsStore((s) => s.sleepTimer);
  const startSleepTimer = useSettingsStore((s) => s.startSleepTimer);
  const cancelSleepTimer = useSettingsStore((s) => s.cancelSleepTimer);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const likedIds = useLibraryStore((s) => s.likedIds);
  const updateStatus = useUpdateStore((s) => s.status);
  const updateInfo = useUpdateStore((s) => s.info);
  const runCheck = useUpdateStore((s) => s.runCheck);
  const openModal = useUpdateStore((s) => s.openModal);

  const openAuth = useUiStore((s) => s.openAuth);
  const openEqualizer = useUiStore((s) => s.openEqualizer);

  // Equalizer store status
  const eqEnabled = useEqStore((s) => s.enabled);
  const eqPreset = useEqStore((s) => s.preset);
  const bassBoost = useEqStore((s) => s.bassBoost);
  const virtualizer = useEqStore((s) => s.virtualizer);
  const setEqEnabled = useEqStore((s) => s.setEnabled);
  const setEqPreset = useEqStore((s) => s.setPreset);
  const setBassBoost = useEqStore((s) => s.setBassBoost);
  const setVirtualizer = useEqStore((s) => s.setVirtualizer);

  const sleepActive = sleepTimer.endAt !== null && !sleepTimer.triggered;

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

  const melomano = useMemo(() => {
    return calculateMelomanoLevel({
      liked: likedIds.length,
      played: downloadedIds.length,
      downloaded: downloadedIds.length,
      listening_seconds: user?.listening_seconds ?? 0,
    });
  }, [user?.listening_seconds, likedIds.length, downloadedIds.length]);


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

  const handleClearDownloads = () => {
    Alert.alert(
      'Borrar descargas',
      '¿Deseas eliminar todas las canciones descargadas de tu dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void clearAllDownloads().then(() => useLibraryStore.getState().clearDownloads());
          },
        },
      ]
    );
  };

  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const songPalette = useMemo(() => getSongPalette(currentSong), [currentSong]);
  const currentCover = useMemo(() => (currentSong ? pickCoverUrl(currentSong) : null), [currentSong]);
  const currentSongTitle = useMemo(() => (currentSong ? resolveSongTitle(currentSong) : ''), [currentSong]);

  return (
    <View style={styles.screenWrapper}>
      {/* Dynamic Background adapting to current song cover art */}
      <DynamicBackground song={currentSong} intensity={0.85} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Ajustes</Text>
        <Text style={styles.screenSubtitle}>Configuración del sistema, audio DSP y cuenta</Text>
      </View>

      {/* SECTION 1: CUENTA & IDENTIDAD */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Cuenta & Identidad</Text>
        {currentSong && (
          <View style={[styles.adaptiveThemeBadge, { borderColor: songPalette.secondary + '50' }]}>
            <View style={[styles.adaptiveThemeDot, { backgroundColor: songPalette.secondary }]} />
            <Text style={[styles.adaptiveThemeText, { color: songPalette.secondary }]}>FONDO DINÁMICO ACTIVO</Text>
          </View>
        )}
      </View>

      {user ? (
        <DoubleBezelCard
          style={[
            styles.card,
            styles.identityCardOuter,
            currentSong && {
              borderColor: songPalette.primary + '55',
            },
          ]}
          innerStyle={[
            styles.identityCardInner,
            currentSong && {
              backgroundColor: 'rgba(12, 12, 22, 0.72)',
            },
          ]}
          elevated
          innerPadding={0}
        >
          {/* Ambient Glowing Header Banner inside the card derived from the current song */}
          {currentSong && (
            <LinearGradient
              colors={[
                songPalette.primary + '35',
                songPalette.secondary + '15',
                'transparent',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardCoverGlow}
              pointerEvents="none"
            />
          )}

          {/* Top Hero: Avatar, Names, Role, Edit Pill */}
          <View style={styles.identityHero}>
            <PressableFluid onPress={() => setProfileOpen(true)} haptic="light" style={styles.identityAvatarWrap}>
              <UserAvatar user={user} size={58} showPresence presence="online" />
            </PressableFluid>

            <View style={styles.identityInfo}>
              <View style={styles.identityNameRow}>
                <Text style={styles.identityDisplayName} numberOfLines={1}>
                  {user.display_name || user.username}
                </Text>
                <View style={[styles.roleChip, { backgroundColor: roleMeta.bg, borderColor: roleMeta.color }]}>
                  <Text style={[styles.roleChipText, { color: roleMeta.color }]}>{roleMeta.label}</Text>
                </View>
              </View>

              <Text style={styles.identityUsernameHandle}>@{user.username}</Text>

              <View style={styles.identityMetaRow}>
                <View style={styles.identityMetaItem}>
                  <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                  <Text style={styles.identityMetaText}>{formattedCreatedAt}</Text>
                </View>
                {user.avatar_source === 'discord' && (
                  <View style={styles.identityMetaItem}>
                    <Ionicons name="logo-discord" size={11} color="#5865F2" />
                    <Text style={[styles.identityMetaText, { color: '#8899FF' }]}>Discord</Text>
                  </View>
                )}
              </View>
            </View>

            {user?.pet_type && user?.pet_type !== 'none' && (
              <View style={styles.heroPetWrap}>
                <PixelPet
                  petType={user.pet_type}
                  variant={user.pet_variant}
                  petName={user.pet_name}
                  size={46}
                  interactive={true}
                />
              </View>
            )}

            {/* Quick Edit Button */}
            <PressableFluid
              onPress={() => setAccountDetailsOpen(true)}
              haptic="medium"
              style={styles.editProfileBtn}
              hitSlop={8}
            >
              <Ionicons name="pencil" size={13} color={colors.white} />
              <Text style={styles.editProfileBtnText}>Editar</Text>
            </PressableFluid>
          </View>

          {/* Virtual Pet Companion Card */}
          <View style={{ paddingHorizontal: 16 }}>
            <PetCompanionCard
              petType={user.pet_type}
              petVariant={user.pet_variant}
              petName={user.pet_name}
              isCurrentUser={true}
              onCustomize={() => setAccountDetailsOpen(true)}
            />
          </View>

          {/* Now Playing Identity Live Bar (when listening to a song) */}
          {currentSong && (
            <PressableFluid
              onPress={() => useUiStore.getState().openFullscreen()}
              haptic="light"
              style={styles.identityListeningBar}
            >
              <View style={styles.listeningBarLeft}>
                <View style={styles.listeningCoverWrap}>
                  {currentCover ? (
                    <Image source={{ uri: currentCover }} style={styles.listeningCover} resizeMode="cover" />
                  ) : (
                    <View style={[styles.listeningCover, { backgroundColor: songPalette.primary }]} />
                  )}
                  {isPlaying && (
                    <View style={styles.listeningEqualizerOverlay}>
                      <EqualizerBars playing bars={3} height={9} barWidth={2} color="#00FF88" />
                    </View>
                  )}
                </View>
                <View style={styles.listeningTexts}>
                  <Text style={styles.listeningTag}>SINTONIZANDO EN ESTE PERFIL</Text>
                  <Text style={styles.listeningSongTitle} numberOfLines={1}>
                    {currentSongTitle}
                  </Text>
                </View>
              </View>
              <View style={[styles.listeningActionPill, { borderColor: songPalette.secondary + '50' }]}>
                <Text style={[styles.listeningActionText, { color: songPalette.secondary }]}>Reproductor</Text>
                <Ionicons name="chevron-forward" size={12} color={songPalette.secondary} />
              </View>
            </PressableFluid>
          )}

          {/* Metrics Shelf: Nivel Melómano, Horas, Favoritas, Descargas */}
          <View style={styles.metricsShelf}>
            <View style={styles.metricCell}>
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(255, 215, 0, 0.14)' }]}>
                <Text style={{ fontSize: 13 }}>{melomano.badgeEmoji}</Text>
              </View>
              <Text style={[styles.metricNumber, { color: '#FFD700' }]}>Nv. {melomano.level}</Text>
              <Text style={styles.metricLabel}>{melomano.title}</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricCell}>
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(0, 229, 255, 0.14)' }]}>
                <Ionicons name="time" size={14} color="#00E5FF" />
              </View>
              <Text style={[styles.metricNumber, { color: '#00E5FF' }]}>{melomano.listenedHours}h</Text>
              <Text style={styles.metricLabel}>Escuchadas</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricCell}>
              <View style={styles.metricIconWrap}>
                <Ionicons name="heart" size={14} color={colors.accent} />
              </View>
              <Text style={styles.metricNumber}>{likedIds.length}</Text>
              <Text style={styles.metricLabel}>Favoritas</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricCell}>
              <View style={styles.metricIconWrap}>
                <Ionicons name="cloud-done" size={14} color={colors.secondary} />
              </View>
              <Text style={styles.metricNumber}>{downloadedIds.length}</Text>
              <Text style={styles.metricLabel}>Descargas</Text>
            </View>
          </View>

          {/* Melomano XP Micro Bar */}
          <View style={styles.xpMicroBarWrap}>
            <View style={styles.xpMicroLabels}>
              <Text style={styles.xpMicroTitle}>Progreso a Nivel {melomano.level + 1}</Text>
              <Text style={styles.xpMicroValue}>{melomano.progressPercent}% XP</Text>
            </View>
            <View style={styles.xpMicroTrack}>
              <LinearGradient
                colors={['#FFD700', '#00E5FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.xpMicroFill, { width: `${melomano.progressPercent}%` }]}
              />
            </View>
          </View>

          {/* Action List Section */}
          <View style={styles.accountActionList}>
            {/* Action 1: Personalizar Perfil & Avatar */}
            <PressableFluid
              onPress={() => setAccountDetailsOpen(true)}
              haptic="light"
              style={styles.accountListRow}
            >
              <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(0, 229, 255, 0.12)' }]}>
                <Ionicons name="sparkles" size={18} color={colors.secondary} />
              </View>
              <View style={styles.rowTexts}>
                <Text style={styles.rowTitle}>Personalizar Perfil & Avatar</Text>
                <Text style={styles.rowSubtitle}>Foto de perfil, nombre artístico y Discord ID</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </PressableFluid>

            <View style={styles.rowSeparator} />

            {/* Action 2: Ver Perfil en la Comunidad */}
            <PressableFluid
              onPress={() => setProfileOpen(true)}
              haptic="light"
              style={styles.accountListRow}
            >
              <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(127, 0, 255, 0.16)' }]}>
                <Ionicons name="person" size={18} color={colors.primary} />
              </View>
              <View style={styles.rowTexts}>
                <Text style={styles.rowTitle}>Ver Perfil en la Comunidad</Text>
                <Text style={styles.rowSubtitle}>Vista pública, biografía y favoritos compartidos</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </PressableFluid>

            <View style={styles.rowSeparator} />

            {/* Action 3: Cerrar Sesión */}
            <PressableFluid
              onPress={() => {
                Alert.alert(
                  'Cerrar sesión',
                  `¿Estás seguro de que deseas salir de @${user.username}?`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Cerrar Sesión',
                      style: 'destructive',
                      onPress: () => {
                        void logout();
                      },
                    },
                  ]
                );
              }}
              haptic="medium"
              style={styles.accountListRow}
            >
              <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(255, 69, 101, 0.12)' }]}>
                <Ionicons name="log-out" size={18} color={colors.error} />
              </View>
              <View style={styles.rowTexts}>
                <Text style={[styles.rowTitle, { color: colors.error }]}>Cerrar Sesión</Text>
                <Text style={styles.rowSubtitle}>Desconectar de este dispositivo</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.error} />
            </PressableFluid>
          </View>
        </DoubleBezelCard>
      ) : (
        <DoubleBezelCard
          style={[
            styles.card,
            styles.identityCardOuter,
            currentSong && {
              borderColor: songPalette.primary + '55',
            },
          ]}
          innerStyle={[
            styles.identityCardInner,
            currentSong && {
              backgroundColor: 'rgba(12, 12, 22, 0.72)',
            },
          ]}
          elevated
          innerPadding={0}
        >
          {currentSong && (
            <LinearGradient
              colors={[
                songPalette.primary + '28',
                songPalette.secondary + '14',
                'transparent',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardCoverGlow}
              pointerEvents="none"
            />
          )}
          <View style={styles.guestHero}>
            <View style={styles.guestIconCircle}>
              <Ionicons name="musical-notes" size={26} color={colors.secondary} />
            </View>
            <View style={styles.guestTexts}>
              <Text style={styles.guestTitle}>Conecta tu Cuenta JodiFy</Text>
              <Text style={styles.guestSubtitle}>
                Sincroniza tus favoritas, guarda presets DSP en la nube, personaliza tu avatar y participa en Jams en vivo.
              </Text>
            </View>
            <PressableFluid
              onPress={openAuth}
              haptic="medium"
              style={styles.guestLoginBtn}
            >
              <LinearGradient
                colors={gradients.play}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.guestLoginBtnFill}
              >
                <Ionicons name="sparkles" size={16} color={colors.white} />
                <Text style={styles.guestLoginBtnText}>Iniciar Sesión o Registrarse</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.white} />
              </LinearGradient>
            </PressableFluid>
          </View>
        </DoubleBezelCard>
      )}

      {/* SECTION 2: AUDIO & ECUALIZADOR DSP */}
      <Text style={styles.sectionTitle}>Audio & Ecualizador DSP</Text>
      <DoubleBezelCard style={styles.card} elevated>
        {/* Master DSP Switch Header */}
        <View style={styles.dspHeaderRow}>
          <View style={styles.dspHeaderLeft}>
            <View style={[styles.cardIcon, { backgroundColor: eqEnabled ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)' }]}>
              <Ionicons name="options" size={22} color={eqEnabled ? colors.secondary : colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowTitleBadge}>
                <Text style={styles.cardRowTitle}>Procesador de Audio DSP</Text>
                <View style={[styles.statusPill, eqEnabled ? styles.statusPillActive : styles.statusPillInactive]}>
                  <Text style={styles.statusPillText}>{eqEnabled ? 'ACTIVO' : 'BYPASS'}</Text>
                </View>
              </View>
              <Text style={styles.dspStatusDesc}>
                {eqEnabled ? 'Ecualización analógica 10 bandas y refuerzos activos' : 'Audio directo sin procesamiento'}
              </Text>
            </View>
          </View>
          <Switch
            value={eqEnabled}
            onValueChange={(val) => {
              void Haptics.selectionAsync();
              setEqEnabled(val);
            }}
            trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: colors.primary }}
            thumbColor={eqEnabled ? colors.secondary : '#888'}
          />
        </View>

        {/* Quick Presets Scroll */}
        <View style={styles.presetsSection}>
          <Text style={styles.presetsSubheading}>PRESETS DE AUDIO RÁPIDOS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsPillRow}>
            {QUICK_PRESETS.map((p) => {
              const isActive = eqPreset === p.id;
              return (
                <PressableFluid
                  key={p.id}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEqPreset(p.id);
                  }}
                  haptic="selection"
                  style={[styles.presetQuickPill, isActive && styles.presetQuickPillActive]}
                >
                  <Text style={[styles.presetQuickText, isActive && styles.presetQuickTextActive]}>
                    {p.label}
                  </Text>
                </PressableFluid>
              );
            })}
          </ScrollView>
        </View>

        {/* Quick DSP Sliders: Bass Boost & Surround 3D */}
        <View style={styles.quickSlidersWrap}>
          <View style={styles.quickSliderBlock}>
            <View style={styles.quickSliderHeader}>
              <View style={styles.quickSliderLabelWrap}>
                <Ionicons name="flame" size={15} color="#FF007A" />
                <Text style={styles.quickSliderTitle}>BASS BOOST</Text>
              </View>
              <Text style={[styles.quickSliderVal, { color: '#FF007A' }]}>{bassBoost}%</Text>
            </View>
            <Slider
              value={bassBoost}
              onValueChange={setBassBoost}
              min={0}
              max={100}
              step={1}
              disabled={!eqEnabled}
              trackHeight={4}
              thumbSize={16}
              activeTrackStyle={{ backgroundColor: '#FF007A' }}
            />
          </View>

          <View style={styles.quickSliderBlock}>
            <View style={styles.quickSliderHeader}>
              <View style={styles.quickSliderLabelWrap}>
                <Ionicons name="headset" size={15} color={colors.secondary} />
                <Text style={styles.quickSliderTitle}>SURROUND 3D</Text>
              </View>
              <Text style={[styles.quickSliderVal, { color: colors.secondary }]}>{virtualizer}%</Text>
            </View>
            <Slider
              value={virtualizer}
              onValueChange={setVirtualizer}
              min={0}
              max={100}
              step={1}
              disabled={!eqEnabled}
              trackHeight={4}
              thumbSize={16}
              activeTrackStyle={{ backgroundColor: colors.secondary }}
            />
          </View>
        </View>

        {/* Button to open full studio equalizer */}
        <PressableFluid
          onPress={openEqualizer}
          haptic="medium"
          style={styles.openEqFullBtn}
        >
          <View style={styles.openEqFullLeft}>
            <Ionicons name="options-outline" size={18} color={colors.white} />
            <Text style={styles.openEqFullText}>Abrir Consola Completa de 10 Bandas</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.6)" />
        </PressableFluid>
      </DoubleBezelCard>

      {/* SECTION 3: TEMPORIZADOR DE SUEÑO */}
      <Text style={styles.sectionTitle}>Temporizador de Sueño</Text>
      <DoubleBezelCard style={styles.card} elevated>
        <View style={styles.sleepHeaderRow}>
          <View style={styles.sleepIconWrap}>
            <Ionicons name={sleepActive ? "moon" : "moon-outline"} size={22} color={sleepActive ? colors.warning : colors.textMuted} />
          </View>
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>
              {sleepActive ? 'Temporizador en curso' : 'Pausar música automáticamente'}
            </Text>
            <Text style={styles.cardRowSubtitle}>
              {sleepActive
                ? `La reproducción se suspenderá al completarse el tiempo programado (${sleepTimer.durationMinutes} min).`
                : 'Selecciona una duración para pausar la reproducción de forma gradual antes de dormir.'}
            </Text>
          </View>
        </View>

        {sleepActive ? (
          <View style={styles.sleepActiveAction}>
            <PressableFluid onPress={cancelSleepTimer} haptic="medium" style={styles.cancelSleepBtn}>
              <Ionicons name="close-circle-outline" size={18} color={colors.error} />
              <Text style={styles.cancelSleepBtnText}>Cancelar temporizador</Text>
            </PressableFluid>
          </View>
        ) : (
          <View style={styles.sleepChipsGrid}>
            {[5, 10, 15, 30, 45, 60].map((m) => (
              <PressableFluid key={m} onPress={() => startSleepTimer(m)} haptic="selection" style={styles.sleepChip}>
                <Text style={styles.sleepChipText}>{m} min</Text>
              </PressableFluid>
            ))}
          </View>
        )}
      </DoubleBezelCard>

      {/* SECTION 4: ALMACENAMIENTO & DESCARGAS */}
      <Text style={styles.sectionTitle}>Almacenamiento Local</Text>
      <DoubleBezelCard style={styles.card} elevated>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="cloud-download-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>
              {downloadedIds.length} canción{downloadedIds.length === 1 ? '' : 'es'} disponible{downloadedIds.length === 1 ? '' : 's'} offline
            </Text>
            <Text style={styles.cardRowSubtitle}>
              Almacenadas en la memoria protegida del dispositivo para escuchar sin conexión a red y con carga instantánea a 0 ms.
            </Text>
          </View>
        </View>

        {downloadedIds.length > 0 && (
          <PressableFluid
            onPress={handleClearDownloads}
            haptic="medium"
            style={styles.rowBtnDanger}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.rowBtnTextDanger}>Liberar espacio de canciones descargadas</Text>
          </PressableFluid>
        )}
      </DoubleBezelCard>

      {/* SECTION 5: SISTEMA & ACTUALIZACIONES */}
      <Text style={styles.sectionTitle}>Sistema & Actualizaciones</Text>
      <DoubleBezelCard style={styles.card} elevated>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="sparkles-outline" size={22} color={colors.secondary} />
          </View>
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>JodiFy Mobile</Text>
            <Text style={styles.cardRowSubtitle}>{updateLabel(updateStatus, updateInfo)}</Text>
          </View>
        </View>

        <View style={styles.infoRows}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versión de la App</Text>
            <Text style={styles.infoValue}>v{currentAppVersion()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Servidor JodiFy API</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {API_HOST.replace(/^https?:\/\//, '')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Canal de Despliegue</Text>
            <Text style={styles.infoValue}>Producción / Release</Text>
          </View>
        </View>

        <View style={styles.updateActions}>
          <PressableFluid
            onPress={() => void runCheck(true)}
            disabled={updateStatus === 'checking' || updateStatus === 'installing'}
            haptic="light"
            style={styles.checkUpdateBtn}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.white} />
            <Text style={styles.checkUpdateBtnText}>
              {updateStatus === 'checking' ? 'Verificando…' : 'Buscar actualizaciones'}
            </Text>
          </PressableFluid>

          {updateStatus === 'available' && (
            <PressableFluid onPress={openModal} haptic="medium" style={styles.installUpdateBtn}>
              <Ionicons name="arrow-down-circle" size={16} color={colors.white} />
              <Text style={styles.installUpdateBtnText}>Instalar nueva versión</Text>
            </PressableFluid>
          )}
        </View>
      </DoubleBezelCard>

      <EmptyState
        icon="heart-outline"
        title="JodiFy Music Experience"
        subtitle="Música libre de anuncios, con renderizado en tiempo real y ecualización de estudio."
      />
    </ScrollView>

    <View style={styles.modalContainer}>
      {/* Modales a nivel raíz de pantalla para evitar fugas táctiles de ScrollView */}
      <UserProfileModal
      user={user}
      isCurrentUser
      visible={profileOpen && !!user}
      onClose={() => setProfileOpen(false)}
      onOpenAccountDetails={() => setAccountDetailsOpen(true)}
      onLogout={() => {
        setProfileOpen(false);
        void logout();
      }}
    />

    <EditProfileModal
      visible={accountDetailsOpen && !!user}
      onClose={() => setAccountDetailsOpen(false)}
    />
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#05050A',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 16,
    paddingBottom: 220,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  header: {
    marginBottom: 20,
    marginTop: 6,
  },
  screenTitle: {
    color: colors.white,
    fontFamily: typography.displaySmall.fontFamily,
    fontSize: typography.displaySmall.fontSize,
    letterSpacing: typography.displaySmall.letterSpacing,
  },
  screenSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    marginTop: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  adaptiveThemeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
  },
  adaptiveThemeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  adaptiveThemeText: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sectionTitle: {
    color: colors.secondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    marginBottom: 14,
    padding: 16,
    backgroundColor: 'rgba(16, 16, 26, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  identityCardOuter: {
    borderRadius: radius.cardOuter,
    overflow: 'hidden',
  },
  identityCardInner: {
    overflow: 'hidden',
  },
  cardCoverGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  identityListeningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  listeningBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 10,
  },
  listeningCoverWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0a0a14',
    position: 'relative',
  },
  listeningCover: {
    width: '100%',
    height: '100%',
  },
  listeningEqualizerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningTexts: {
    flex: 1,
  },
  listeningTag: {
    color: colors.textMuted,
    fontFamily: typography.monoSmall.fontFamily,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  listeningSongTitle: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 12,
    fontWeight: '600',
  },
  listeningActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  listeningActionText: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10,
    fontWeight: '700',
  },
  /* --- Unified Cuenta & Identidad Card --- */
  identityHero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  identityAvatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  identityAvatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  identityAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityAvatarLetter: {
    color: colors.white,
    fontFamily: typography.displayMedium.fontFamily,
    fontSize: 26,
    fontWeight: '700',
  },
  identityRoleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0C0C14',
  },
  identityInfo: {
    flex: 1,
    minWidth: 0,
  },
  identityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  identityDisplayName: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  roleChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  roleChipText: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  identityUsernameHandle: {
    color: colors.textSecondary,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 12.5,
    marginTop: 2,
  },
  identityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  identityMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  identityMetaText: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  editProfileBtnText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 12,
    fontWeight: '600',
  },
  metricsShelf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricIconWrap: {
    marginBottom: 2,
  },
  metricNumber: {
    color: colors.white,
    fontFamily: typography.monoMedium.fontFamily,
    fontSize: 15,
    fontWeight: '700',
  },
  metricLabel: {
    color: colors.textMuted,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroPetWrap: {
    padding: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  xpMicroBarWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 5,
  },
  xpMicroLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpMicroTitle: {
    color: colors.textSecondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  xpMicroValue: {
    color: '#FFD700',
    fontFamily: typography.monoSmall.fontFamily,
    fontSize: 10,
    fontWeight: '700',
  },
  xpMicroTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  xpMicroFill: {
    height: '100%',
    borderRadius: 3,
  },
  accountActionList: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  accountListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.md,
  },
  rowIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTexts: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
    marginTop: 1,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginLeft: 56,
  },
  /* --- Guest Hero --- */
  guestHero: {
    padding: 22,
    alignItems: 'center',
    gap: 12,
  },
  guestIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTexts: {
    alignItems: 'center',
    gap: 6,
  },
  guestTitle: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  guestSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  guestLoginBtn: {
    width: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: 4,
  },
  guestLoginBtnFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 8,
  },
  guestLoginBtnText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dspHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  dspHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  dspStatusDesc: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  },
  presetsSection: {
    marginTop: 14,
  },
  presetsSubheading: {
    color: colors.textSecondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: 8,
  },
  presetsPillRow: {
    gap: 8,
    paddingVertical: 2,
  },
  presetQuickPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetQuickPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryStrong,
  },
  presetQuickText: {
    color: colors.textSecondary,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 12,
    fontWeight: '500',
  },
  presetQuickTextActive: {
    color: colors.secondary,
    fontWeight: '700',
  },
  quickSlidersWrap: {
    marginTop: 14,
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  quickSliderBlock: {
    gap: 4,
  },
  quickSliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickSliderLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickSliderTitle: {
    color: colors.textSecondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 10.5,
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  quickSliderVal: {
    fontFamily: typography.monoSmall.fontFamily,
    fontSize: 11.5,
    fontWeight: '700',
  },
  openEqFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  openEqFullLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openEqFullText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardRowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardRowTitle: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 15,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusPillActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.16)',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  statusPillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  cardRowSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  sleepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  sleepIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 179, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  sleepChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sleepChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  sleepChipText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 12,
    fontWeight: '600',
  },
  sleepActiveAction: {
    marginTop: 4,
  },
  cancelSleepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 61, 92, 0.1)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 61, 92, 0.3)',
  },
  cancelSleepBtnText: {
    color: colors.error,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 13,
    fontWeight: '600',
  },
  rowBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 61, 92, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 61, 92, 0.25)',
  },
  rowBtnTextDanger: {
    color: colors.error,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 13,
    fontWeight: '600',
  },
  infoRows: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
  },
  infoValue: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 12,
    fontWeight: '600',
  },
  updateActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  checkUpdateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  checkUpdateBtnText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 12.5,
    fontWeight: '600',
  },
  installUpdateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  installUpdateBtnText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: 12.5,
    fontWeight: '700',
  },
});