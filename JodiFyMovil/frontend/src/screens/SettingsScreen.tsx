import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { API_HOST } from '../lib/constants';
import { useSecretCombo } from '../hooks/useSecretCombo';
import { EmptyState } from '../components/ui/EmptyState';
import { GlassCard } from '../components/ui/GlassCard';
import { PressableScale } from '../components/ui/PressableScale';
import { currentAppVersion } from '../services/update.service';
import { clearAllDownloads } from '../services/downloads.service';
import { useLibraryStore } from '../store/library.store';
import { useSettingsStore } from '../store/settings.store';
import { updateLabel, useUpdateStore } from '../store/update.store';
import { useUiStore } from '../store/ui.store';
import { colors, fonts, radius } from '../theme';

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
  const openSecret = useUiStore((s) => s.openSecret);
  const unlockSecret = useSecretCombo(openSecret);

  const sleepActive = sleepTimer.endAt !== null && !sleepTimer.triggered;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable onPress={unlockSecret} hitSlop={12}>
        <Text style={styles.screenTitle}>Ajustes</Text>
      </Pressable>

      <GlassCard>
        <Pressable style={styles.cardRow} onPress={user ? undefined : openAuth}>
          <View style={styles.avatar}>
            <Ionicons name={user ? 'person' : 'person-outline'} size={20} color={colors.white} />
          </View>
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>{user ? user.username : 'Invitado'}</Text>
            <Text style={styles.cardRowSubtitle}>
              {user ? `Rol: ${user.role.toUpperCase()}` : 'Inicia sesión para guardar tus favoritas'}
            </Text>
          </View>
          {!user && <Ionicons name="chevron-forward" size={18} color={colors.textDim} />}
        </Pressable>
        {user && (
          <PressableScale onPress={() => void logout()} haptic style={styles.rowBtnDanger}>
            <Ionicons name="log-out-outline" size={16} color={colors.error} />
            <Text style={styles.rowBtnTextDanger}>Cerrar sesión</Text>
          </PressableScale>
        )}
      </GlassCard>

      <Text style={styles.sectionTitle}>Sonido</Text>
      <GlassCard>
        <PressableScale onPress={openEqualizer} haptic style={styles.cardRow} scaleTo={0.98}>
          <Ionicons name="options-outline" size={20} color={colors.secondary} />
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>Ecualizador</Text>
            <Text style={styles.cardRowSubtitle}>Ajusta graves, medios y agudos con presets móviles</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </PressableScale>
        <PressableScale onPress={openSecret} haptic style={styles.secretBtn} scaleTo={0.98}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
          <Text style={styles.secretText}>Acceso admin/dev</Text>
        </PressableScale>
      </GlassCard>

      <Text style={styles.sectionTitle}>Temporizador de sueño</Text>
      <GlassCard>
        <View style={styles.sleepRow}>
          {sleepActive ? (
            <>
              <Ionicons name="moon" size={18} color={colors.warning} />
              <Text style={styles.sleepActiveText}>La música se pausará pronto</Text>
              <PressableScale onPress={cancelSleepTimer} haptic style={styles.chipBtn}>
                <Text style={styles.chipBtnText}>Cancelar</Text>
              </PressableScale>
            </>
          ) : (
            <>
              <Ionicons name="moon-outline" size={18} color={colors.textMuted} />
              <Text style={styles.sleepHint}>Pausar después de…</Text>
            </>
          )}
        </View>
        {!sleepActive && (
          <View style={styles.sleepOptions}>
            {[5, 10, 15, 30, 60].map((m) => (
              <PressableScale key={m} onPress={() => startSleepTimer(m)} haptic style={styles.chipBtn}>
                <Text style={styles.chipBtnText}>{m} min</Text>
              </PressableScale>
            ))}
          </View>
        )}
      </GlassCard>

      <Text style={styles.sectionTitle}>Descargas</Text>
      <GlassCard>
        <View style={styles.cardRow}>
          <Ionicons name="cloud-download-outline" size={20} color={colors.secondary} />
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>
              {downloadedIds.length} canción{downloadedIds.length === 1 ? '' : 'es'} descargada{downloadedIds.length === 1 ? '' : 's'}
            </Text>
            <Text style={styles.cardRowSubtitle}>Disponibles sin conexión</Text>
          </View>
        </View>
        {downloadedIds.length > 0 && (
          <PressableScale
            onPress={() => {
              void clearAllDownloads().then(() => useLibraryStore.getState().clearDownloads());
            }}
            haptic
            style={styles.rowBtnDanger}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={styles.rowBtnTextDanger}>Borrar todas las descargas</Text>
          </PressableScale>
        )}
      </GlassCard>

      <Text style={styles.sectionTitle}>Actualizaciones</Text>
      <GlassCard>
        <View style={styles.cardRow}>
          <Ionicons name="refresh-circle-outline" size={20} color={colors.secondary} />
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>JodiFy Mobile</Text>
            <Text style={styles.cardRowSubtitle}>{updateLabel(update.status, update.info)}</Text>
          </View>
        </View>
        <View style={styles.sleepOptions}>
          <PressableScale
            onPress={() => void update.runCheck(true)}
            disabled={update.status === 'checking' || update.status === 'installing'}
            haptic
            style={styles.chipBtn}
          >
            <Text style={styles.chipBtnText}>
              {update.status === 'checking' ? 'Buscando…' : 'Buscar actualizaciones'}
            </Text>
          </PressableScale>
          {update.status === 'available' && (
            <PressableScale onPress={update.openModal} haptic style={[styles.chipBtn, styles.chipBtnPrimary]}>
              <Text style={[styles.chipBtnText, styles.chipBtnTextPrimary]}>Instalar actualización</Text>
            </PressableScale>
          )}
        </View>
      </GlassCard>

      <Text style={styles.sectionTitle}>Información</Text>
      <GlassCard>
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
      </GlassCard>

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
    paddingBottom: 200,
  },
  screenTitle: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(127,0,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(127,0,255,0.5)',
  },
  cardRowText: {
    flex: 1,
  },
  cardRowTitle: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
  },
  cardRowSubtitle: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  secretBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secretText: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
  },
  rowBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,51,102,0.12)',
  },
  rowBtnTextDanger: {
    color: colors.error,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  sleepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sleepHint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  sleepActiveText: {
    flex: 1,
    color: colors.warning,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  sleepOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipBtnText: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
  },
  chipBtnPrimary: {
    backgroundColor: 'rgba(127,0,255,0.25)',
    borderColor: 'rgba(127,0,255,0.6)',
  },
  chipBtnTextPrimary: {
    color: colors.white,
  },
  infoRows: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  infoValue: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    flexShrink: 1,
    marginLeft: 12,
    textAlign: 'right',
  },
});