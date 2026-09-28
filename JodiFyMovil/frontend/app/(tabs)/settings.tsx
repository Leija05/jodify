import { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { API_HOST } from '@lib/constants';
import { EmptyState } from '@components/ui/EmptyState';
import { DoubleBezelCard } from '@components/ui/DoubleBezelCard';
import { PressableFluid } from '@components/ui/PressableFluid';
import { Slider } from '@components/ui/Slider';
import { currentAppVersion } from '@services/update.service';
import { clearAllDownloads } from '@services/downloads.service';
import { useLibraryStore } from '@stores/library.store';
import { useSettingsStore } from '@stores/settings.store';
import { useEqStore } from '@stores/eq.store';
import { updateLabel, useUpdateStore } from '@stores/update.store';
import { useUiStore } from '@stores/ui.store';
import { UserProfileModal } from '@components/profile/UserProfileModal';
import { AccountDetailsModal } from '@components/profile/AccountDetailsModal';
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
  const logout = useSettingsStore((s) => s.logout);
  const sleepTimer = useSettingsStore((s) => s.sleepTimer);
  const startSleepTimer = useSettingsStore((s) => s.startSleepTimer);
  const cancelSleepTimer = useSettingsStore((s) => s.cancelSleepTimer);

  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
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

  const userAvatarUri = useMemo(() => {
    if (!user) return null;
    if (user.avatar_source === 'discord' && user.discord_id) {
      return `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discord_id.slice(-2) || '0', 10) % 5}.png`;
    }
    return user.avatar_url || null;
  }, [user]);

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

  return (
    <View style={styles.screenWrapper}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Ajustes</Text>
        <Text style={styles.screenSubtitle}>Configuración del sistema, audio DSP y cuenta</Text>
      </View>

      {/* SECTION 1: CUENTA DE USUARIO */}
      <Text style={styles.sectionTitle}>Cuenta & Identidad</Text>
      {user ? (
        <DoubleBezelCard style={styles.card} elevated>
          {/* Main User Identity Row */}
          <PressableFluid
            onPress={() => setProfileOpen(true)}
            haptic="light"
            style={styles.userMainRow}
          >
            <View style={styles.avatarContainer}>
              {userAvatarUri ? (
                <Image source={{ uri: userAvatarUri }} style={styles.userAvatarImg} />
              ) : (
                <LinearGradient colors={gradients.play} style={styles.userAvatarPlaceholder}>
                  <Text style={styles.userAvatarLetter}>
                    {(user.display_name || user.username).slice(0, 1).toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
              <View style={[styles.avatarRoleDot, { backgroundColor: roleMeta.color }]} />
            </View>

            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {user.display_name || user.username}
                </Text>
                <View style={[styles.roleBadge, { backgroundColor: roleMeta.bg, borderColor: roleMeta.color }]}>
                  <Text style={[styles.roleBadgeText, { color: roleMeta.color }]}>{roleMeta.label}</Text>
                </View>
              </View>
              <Text style={styles.usernameHandle}>@{user.username}</Text>
              <Text style={styles.accountDescription}>
                Perfil activo en la red JodiFy · Creada el {formattedCreatedAt}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </PressableFluid>

          {/* Quick Account Actions */}
          <View style={styles.accountActionList}>
            <PressableFluid
              onPress={() => setAccountDetailsOpen(true)}
              haptic="medium"
              style={styles.accountActionTile}
            >
              <View style={[styles.accountActionIconWrap, { backgroundColor: 'rgba(0, 229, 255, 0.12)' }]}>
                <Ionicons name="color-palette" size={18} color={colors.secondary} />
              </View>
              <View style={styles.accountActionTextWrap}>
                <Text style={styles.accountActionTitle}>Personalizar Foto y Perfil</Text>
                <Text style={styles.accountActionSub}>Nombre en pantalla, avatar de Discord o personalizado</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </PressableFluid>

            <PressableFluid
              onPress={() => setProfileOpen(true)}
              haptic="light"
              style={styles.accountActionTile}
            >
              <View style={[styles.accountActionIconWrap, { backgroundColor: 'rgba(127, 0, 255, 0.15)' }]}>
                <Ionicons name="stats-chart" size={18} color={colors.primary} />
              </View>
              <View style={styles.accountActionTextWrap}>
                <Text style={styles.accountActionTitle}>Ver Estadísticas de Escucha</Text>
                <Text style={styles.accountActionSub}>Canciones favoritas, reproducciones y actividad</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </PressableFluid>
          </View>

          {/* Logout button */}
          <PressableFluid onPress={() => void logout()} haptic="medium" style={styles.rowBtnDanger}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={styles.rowBtnTextDanger}>Cerrar sesión de @{user.username}</Text>
          </PressableFluid>
        </DoubleBezelCard>
      ) : (
        <DoubleBezelCard style={styles.card} elevated>
          <View style={styles.guestContainer}>
            <View style={styles.guestIconWrap}>
              <Ionicons name="person-outline" size={30} color={colors.textSecondary} />
            </View>
            <View style={styles.guestInfo}>
              <Text style={styles.guestTitle}>Modo Invitado</Text>
              <Text style={styles.guestSubtitle}>
                Inicia sesión para sincronizar tus canciones favoritas, ecualizador en la nube, fotos personalizadas y participar en la comunidad.
              </Text>
            </View>
          </View>

          <PressableFluid
            onPress={openAuth}
            haptic="medium"
            style={styles.loginBtn}
          >
            <LinearGradient
              colors={gradients.play}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginBtnFill}
            >
              <Ionicons name="log-in-outline" size={18} color={colors.white} />
              <Text style={styles.loginBtnText}>Iniciar Sesión o Crear Cuenta</Text>
            </LinearGradient>
          </PressableFluid>
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

    <AccountDetailsModal
      visible={accountDetailsOpen && !!user}
      onClose={() => setAccountDetailsOpen(false)}
    />
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 220,
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
  },
  userMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  userAvatarImg: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  userAvatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarLetter: {
    color: colors.white,
    fontFamily: typography.displayMedium.fontFamily,
    fontSize: 26,
    fontWeight: '700',
  },
  avatarRoleDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.background,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  displayName: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 16,
    fontWeight: '700',
  },
  usernameHandle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 12,
    marginTop: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  accountDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  accountActionList: {
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  accountActionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  accountActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountActionTextWrap: {
    flex: 1,
  },
  accountActionTitle: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
  },
  accountActionSub: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11,
    marginTop: 1,
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
  guestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  guestIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestInfo: {
    flex: 1,
  },
  guestTitle: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: 16,
    fontWeight: '700',
  },
  guestSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 11.5,
    marginTop: 3,
    lineHeight: 16,
  },
  loginBtn: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  loginBtnFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loginBtnText: {
    color: colors.white,
    fontFamily: typography.labelLarge.fontFamily,
    fontSize: 13.5,
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