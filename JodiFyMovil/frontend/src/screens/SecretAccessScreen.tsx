import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useImperativeHandle, useState } from 'react';
import { PressableFluid } from '../components/ui/PressableFluid';
import { StyleSheet, Text, View, ScrollView, Switch } from 'react-native';
import { useSettingsStore } from '@stores/settings.store';
import { usePlayerStore } from '@stores/player.store';
import { useLibraryStore } from '@stores/library.store';
import { colors, typography, radius, elevation } from '@theme';

export const SecretAccessScreen = React.forwardRef<{ trigger: () => void }, any>(
  ({ ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const [tab, setTab] = useState<'debug' | 'performance' | 'features' | 'logs'>('debug');
    const [logs, setLogs] = useState<string[]>([]);

    const user = useSettingsStore((s) => s.user);
    const playerState = usePlayerStore.getState();
    const { songs, likedIds, downloadedIds, ...libraryState } = useLibraryStore.getState();

    const addLog = (msg: string) => {
      setLogs(prev => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    useEffect(() => {
      if (typeof window === 'undefined') return;
      const handleKey = (e: any) => {
        if (!visible) return;
        if (e.key === 'Escape') {
          setVisible(false);
        }
      };
      window.addEventListener?.('keydown', handleKey);
      return () => window.removeEventListener?.('keydown', handleKey);
    }, [visible]);

    const trigger = () => {
      setVisible(true);
      addLog('Panel de desarrollador abierto');
    };

    useImperativeHandle(ref, () => ({ trigger }), []);

    const copyToClipboard = (text: string) => {
      // Would use Clipboard API
      addLog(`Copiado: ${text.slice(0, 50)}...`);
    };

    if (!visible) return null;

    return (
      <View style={styles.container} pointerEvents="box-none" {...props}>
        <View style={styles.backdrop} onStartShouldSetResponder={() => true} onResponderRelease={() => setVisible(false)} />
        <View style={styles.sheet} pointerEvents="auto">
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>JodiFy Dev Tools</Text>
            <PressableFluid onPress={() => setVisible(false)} haptic="light" style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </PressableFluid>
          </View>

          <ScrollView contentContainerStyle={styles.tabs} showsHorizontalScrollIndicator={false}>
            {(['debug', 'performance', 'features', 'logs'] as const).map((t) => (
              <PressableFluid
                key={t}
                onPress={() => setTab(t)}
                haptic="selection"
                style={[
                  styles.tab,
                  tab === t && styles.tabActive,
                ]}
                hitSlop={8}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.toUpperCase()}</Text>
              </PressableFluid>
            ))}
          </ScrollView>

          <View style={styles.content}>
            {tab === 'debug' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Estado Global</Text>
                <View style={styles.debugGrid}>
                  <DebugCard title="Usuario" value={user ? `${user.username} (${user.role})` : 'Invitado'} />
                  <DebugCard title="Canciones" value={songs.length} />
                  <DebugCard title="Favoritas" value={likedIds.length} />
                  <DebugCard title="Descargadas" value={downloadedIds.length} />
                  <DebugCard title="Cola" value={playerState.queue.length} />
                  <DebugCard title="Reproduciendo" value={playerState.isPlaying ? 'Sí' : 'No'} />
                  <DebugCard title="Posición" value={`${Math.floor(playerState.position)}s / ${Math.floor(playerState.duration)}s`} />
                  <DebugCard title="Volumen" value={`${Math.round((useSettingsStore.getState().volume ?? 1) * 100)}%`} />
                  <DebugCard title="Shuffle" value={playerState.shuffle ? 'Activado' : 'Desactivado'} />
                  <DebugCard title="Repeat" value={playerState.repeat} />
                  <DebugCard title="Error" value={playerState.error ?? 'Ninguno'} />
                </View>

                <View style={styles.actions}>
                  <PressableFluid onPress={() => copyToClipboard(JSON.stringify(playerState, null, 2))} haptic="light" style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>Copiar Player State</Text>
                  </PressableFluid>
                  <PressableFluid onPress={() => copyToClipboard(JSON.stringify(libraryState, null, 2))} haptic="light" style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>Copiar Library State</Text>
                  </PressableFluid>
                  <PressableFluid onPress={() => copyToClipboard(JSON.stringify(user, null, 2))} haptic="light" style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>Copiar User</Text>
                  </PressableFluid>
                </View>
              </View>
            )}

            {tab === 'performance' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rendimiento</Text>
                <View style={styles.debugGrid}>
                  <DebugCard title="JS Heap" value={`${Math.round(((performance as any)?.memory?.usedJSHeapSize ?? 0) / 1024 / 1024)} MB`} />
                  <DebugCard title="Total Heap" value={`${Math.round(((performance as any)?.memory?.totalJSHeapSize ?? 0) / 1024 / 1024)} MB`} />
                  <DebugCard title="Heap Limit" value={`${Math.round(((performance as any)?.memory?.jsHeapSizeLimit ?? 0) / 1024 / 1024)} MB`} />
                </View>
                <PressableFluid onPress={() => { if ((global as any).gc) (global as any).gc(); addLog('GC forzado'); }} haptic="light" style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>Forzar GC</Text>
                </PressableFluid>
              </View>
            )}

            {tab === 'features' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Feature Flags</Text>
                <View style={styles.featureList}>
                  <FeatureToggle label="Haptics" value={useSettingsStore.getState().hapticsEnabled} onChange={useSettingsStore.getState().setHapticsEnabled} />
                  <FeatureToggle label="Reduced Motion" value={false} onChange={() => {}} />
                  <FeatureToggle label="Aurora Background" value={true} onChange={() => {}} />
                  <FeatureToggle label="Vinyl Physics" value={true} onChange={() => {}} />
                  <FeatureToggle label="Karaoke Lyrics" value={true} onChange={() => {}} />
                  <FeatureToggle label="Cross-device Handoff" value={false} onChange={() => {}} />
                </View>
              </View>
            )}

            {tab === 'logs' && (
              <View style={styles.section}>
                <View style={styles.logsHeader}>
                  <Text style={styles.sectionTitle}>Logs Recientes</Text>
                  <PressableFluid onPress={() => setLogs([])} haptic="light" style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>Limpiar</Text>
                  </PressableFluid>
                </View>
                <ScrollView style={styles.logsList} contentContainerStyle={styles.logsContent}>
                  {logs.map((log, i) => (
                    <Text key={i} style={styles.logEntry}>{log}</Text>
                  ))}
                  {logs.length === 0 && (
                    <Text style={styles.emptyLogs}>Sin logs aún</Text>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }
);

function DebugCard({ title, value }: { title: string; value: string | number }) {
  return (
    <View style={styles.debugCard}>
      <Text style={styles.debugCardTitle}>{title}</Text>
      <Text style={styles.debugCardValue}>{String(value)}</Text>
    </View>
  );
}

function FeatureToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.sheetOuter,
    borderTopRightRadius: radius.sheetOuter,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    ...elevation.level4,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.white,
    fontFamily: typography.headlineMedium.fontFamily,
    fontSize: typography.headlineMedium.fontSize,
    letterSpacing: typography.headlineMedium.letterSpacing,
  },
  closeBtn: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryStrong,
  },
  tabText: {
    color: colors.textMuted,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
  },
  tabTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  debugGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  debugCard: {
    flex: 1,
    minWidth: 140,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  debugCardTitle: {
    color: colors.textMuted,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
  },
  debugCardValue: {
    color: colors.white,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
  },
  actionBtnText: {
    color: colors.white,
    fontFamily: typography.labelMedium.fontFamily,
    fontSize: typography.labelMedium.fontSize,
    letterSpacing: typography.labelMedium.letterSpacing,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureLabel: {
    color: colors.text,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
  },
  logsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.errorSoft,
    borderWidth: 1,
    borderColor: colors.error,
  },
  clearBtnText: {
    color: colors.error,
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: typography.labelSmall.fontSize,
    letterSpacing: typography.labelSmall.letterSpacing,
  },
  logsList: {
    flex: 1,
  },
  logsContent: {
    paddingBottom: 20,
    gap: 4,
  },
  logEntry: {
    color: colors.textDim,
    fontFamily: typography.monoSmall.fontFamily,
    fontSize: typography.monoSmall.fontSize,
    letterSpacing: typography.monoSmall.letterSpacing,
    lineHeight: typography.monoSmall.lineHeight,
  },
  emptyLogs: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    letterSpacing: typography.bodyMedium.letterSpacing,
    textAlign: 'center',
    marginTop: 40,
  },
});