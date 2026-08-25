import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { API_HOST } from '../lib/constants';
import { EmptyState } from '../components/ui/EmptyState';
import { DoubleBezelCard } from '../components/ui/DoubleBezelCard';
import { PressableFluid } from '../components/ui/PressableFluid';
import { currentAppVersion } from '../services/update.service';
import { clearAllDownloads } from '../services/downloads.service';
import { useLibraryStore } from '../store/library.store';
import { useSettingsStore } from '../store/settings.store';
import { updateLabel, useUpdateStore } from '../store/update.store';
import { useUiStore } from '../store/ui.store';
import { colors, typography, radius } from '../theme';

export function SettingsScreen() {
  const user = useSettingsStore((s) => s.user);
  const logout = useSettingsStore((s) => s.logout);
  const sleepTimer = useSettingsStore((s) => s.sleepTimer);
  const startSleepTimer = useSettingsStore((s) => s.startSleepTimer);
  const cancelSleepTimer = useSettingsStore((s) => s.cancelSleepTimer);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const update = useUpdateStore();
  const openAuth = useUiStore((s) => s.openAuth);
  const openEqualizer = useUiStore((s) => s.openEqualizer);

  const sleepActive = sleepTimer.endAt !== null && !sleepTimer.triggered;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>Ajustes</Text>

      <DoubleBezelCard style={styles.card} elevated>
        <PressableFluid onPress={user ? undefined : openAuth} haptic="light" disabled={!!user} style={styles.cardRow}>
          <View style={styles.avatar}>
            <Ionicons name={user ? 'person' : 'person-outline'} size={22} color={colors.white} />
          </View>
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>{user ? user.username : 'Invitado'}</Text>
            <Text style={styles.cardRowSubtitle}>
              {user ? `Rol: ${user.role.toUpperCase()}` : 'Inicia sesión para guardar tus favoritas'}
            </Text>
          </View>
          {!user && <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
        </PressableFluid>
        {user && (
          <PressableFluid onPress={() => void logout()} haptic="medium" style={styles.rowBtnDanger}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={styles.rowBtnTextDanger}>Cerrar sesión</Text>
          </PressableFluid>
        )}
      </DoubleBezelCard>

      <Text style={styles.sectionTitle}>Sonido</Text>
      <DoubleBezelCard style={styles.card} elevated>
        <PressableFluid onPress={openEqualizer} haptic="light" style={styles.cardRow} scaleTo={0.98}>
          <View style={styles.cardIcon}>
            <Ionicons name="options-outline" size={22} color={colors.secondary} />
          </View>
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>Ecualizador</Text>
            <Text style={styles.cardRowSubtitle}>Ajusta graves, medios y agudos con presets móviles</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </PressableFluid>
      </DoubleBezelCard>

      <Text style={styles.sectionTitle}>Temporizador de sueño</Text>
      <DoubleBezelCard style={styles.card} elevated>
        <View style={styles.sleepRow}>
          {sleepActive ? (
            <>
              <View style={styles.sleepIcon}>
                <Ionicons name="moon" size={20} color={colors.warning} />
              </View>
              <Text style={styles.sleepActiveText}>La música se pausará pronto</Text>
              <PressableFluid onPress={cancelSleepTimer} haptic="light" style={styles.chipBtn}>
                <Text style={styles.chipBtnText}>Cancelar</Text>
              </PressableFluid>
            </>
          ) : (
            <>
              <View style={styles.sleepIcon}>
                <Ionicons name="moon-outline" size={20} color={colors.textMuted} />
              </View>
              <Text style={styles.sleepHint}>Pausar después de…</Text>
            </>
          )}
        </View>
        {!sleepActive && (
          <View style={styles.sleepOptions}>
            {[5, 10, 15, 30, 60].map((m) => (
              <PressableFluid key={m} onPress={() => startSleepTimer(m)} haptic="selection" style={styles.chipBtn}>
                <Text style={styles.chipBtnText}>{m} min</Text>
              </PressableFluid>
            ))}
          </View>
        )}
      </DoubleBezelCard>

      <Text style={styles.sectionTitle}>Descargas</Text>
      <DoubleBezelCard style={styles.card} elevated>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="cloud-download-outline" size={22} color={colors.secondary} />
          </View>
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>
              {downloadedIds.length} canción{downloadedIds.length === 1 ? '' : 'es'} descargada{downloadedIds.length === 1 ? '' : 's'}
            </Text>
            <Text style={styles.cardRowSubtitle}>Disponibles sin conexión</Text>
          </View>
        </View>
        {downloadedIds.length > 0 && (
          <PressableFluid
            onPress={() => {
              void clearAllDownloads().then(() => useLibraryStore.getState().clearDownloads());
            }}
            haptic="medium"
            style={styles.rowBtnDanger}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.rowBtnTextDanger}>Borrar todas las descargas</Text>
          </PressableFluid>
        )}
      </DoubleBezelCard>

      <Text style={styles.sectionTitle}>Actualizaciones</Text>
      <DoubleBezelCard style={styles.card} elevated>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="refresh-circle-outline" size={22} color={colors.secondary} />
          </View>
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>JodiFy Mobile</Text>
            <Text style={styles.cardRowSubtitle}>{updateLabel(update.status, update.info)}</Text>
          </View>
        </View>
        <View style={styles.sleepOptions}>
          <PressableFluid
            onPress={() => void update.runCheck(true)}
            disabled={update.status === 'checking' || update.status === 'installing'}
            haptic="light"
            style={styles.chipBtn}
          >
            <Text style={styles.chipBtnText}>
              {update.status === 'checking' ? 'Buscando…' : 'Buscar actualizaciones'}
            </Text>
          </PressableFluid>
          {update.status === 'available' && (
            <PressableFluid onPress={update.openModal} haptic="medium" style={[styles.chipBtn, styles.chipBtnPrimary]}>
              <Text style={[styles.chipBtnText, styles.chipBtnTextPrimary]}>Instalar actualización</Text>
            </PressableFluid>
          )}
        </View>
      </DoubleBezelCard>

      <Text style={styles.sectionTitle}>Información</Text>
      <DoubleBezelCard style={styles.card} elevated>
        <View style={styles.infoRows}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versión</Text>
            <Text style={styles.infoValue}>v{currentAppVersion()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Servidor</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {API_HOST.replace(/^https?:\/\//, '')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Actualizaciones</Text>
            <Text style={styles.infoValue}>GitHub Releases</Text>
          </View>
        </View>
      </DoubleBezelCard>

      <EmptyState icon="sparkles-outline" title="Hecho con ♥ para los amigos" subtitle="JodiFy — música libre, sin anuncios, para siempre." />
    </ScrollView>
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
  screenTitle: {
    color: colors.text,
    fontFamily: typography.displaySmall.fontFamily,
    fontSize: typography.displaySmall.fontSize,
    letterSpacing: typography.displaySmall.letterSpacing,
    lineHeight: typography.displaySmall.lineHeight,
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryStrong,
  },
  cardRowText: {
    flex: 1,
  },
  cardRowTitle: {
    color: colors.text,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
  },
  cardRowSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
    marginTop: 2,
  },
  rowBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.errorSoft,
  },
  rowBtnTextDanger: {
    color: colors.error,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
  },
  sleepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sleepIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepHint: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
  },
  sleepActiveText: {
    flex: 1,
    color: colors.warning,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
  },
  sleepOptions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  chipBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipBtnText: {
    color: colors.text,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
  },
  chipBtnPrimary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryStrong,
  },
  chipBtnTextPrimary: {
    color: colors.white,
  },
  infoRows: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    letterSpacing: typography.bodySmall.letterSpacing,
  },
  infoValue: {
    color: colors.text,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    flexShrink: 1,
    marginLeft: 12,
    textAlign: 'right',
  },
});