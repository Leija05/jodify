import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { UpdateModal, type UpdateModalStatus } from './src/components/UpdateModal';
import {
  checkForUpdate,
  currentAppVersion,
  getSkippedVersion,
  installUpdate,
  skipVersion,
  type UpdateCheckResult,
} from './src/services/update.service';

const BRAND = {
  name: 'JodiFy',
  tagline: 'Free Music For Friends',
};

const TRACKS = [
  { id: '1', name: 'Bienvenido a JodiFy', artist: 'JodiFy' },
  { id: '2', name: 'Tu primera canción', artist: 'JodiFy' },
];

type UpdateStatus = 'checking' | 'available' | 'installing' | 'up-to-date' | 'error' | 'idle';

export default function App() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [modalStatus, setModalStatus] = useState<UpdateModalStatus>('available');
  const [modalOpen, setModalOpen] = useState(false);
  const checkedRef = useRef(false);

  const runCheck = useCallback(async (silent = false) => {
    setUpdateStatus('checking');
    try {
      const result = await checkForUpdate();
      if (!result) {
        setUpdateStatus(silent ? 'idle' : 'error');
        return;
      }
      setUpdateInfo(result);
      if (!result.available) {
        setUpdateStatus('up-to-date');
        return;
      }
      const skipped = await getSkippedVersion();
      if (result.latest === skipped) {
        setUpdateStatus('available');
        return;
      }
      setUpdateStatus('available');
      if (!silent) {
        setModalStatus('available');
        setModalOpen(true);
      }
    } catch {
      setUpdateStatus('error');
    }
  }, []);

  const doInstall = useCallback(async () => {
    if (!updateInfo) return;
    if (!updateInfo.apkUrl) {
      setModalStatus('blocked');
      return;
    }
    setUpdateStatus('installing');
    setModalStatus('installing');
    const ok = await installUpdate(updateInfo.apkUrl);
    if (!ok) {
      setModalStatus(Platform.OS === 'ios' ? 'blocked' : 'error');
      setUpdateStatus('available');
    }
  }, [updateInfo]);

  const handleLater = useCallback(() => {
    setModalOpen(false);
    if (updateInfo) void skipVersion(updateInfo.latest);
  }, [updateInfo]);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    void runCheck();
  }, [runCheck]);

  const updateLabel = (() => {
    switch (updateStatus) {
      case 'checking':
        return 'Buscando actualizaciones…';
      case 'available':
        return updateInfo ? `Nueva versión v${updateInfo.latest} disponible` : 'Actualización disponible';
      case 'installing':
        return 'Descargando e instalando…';
      case 'up-to-date':
        return `Estás al día (v${currentAppVersion()})`;
      case 'error':
        return 'No se pudo buscar actualizaciones';
      default:
        return `Versión v${currentAppVersion()}`;
    }
  })();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.logo}>{BRAND.name}</Text>
          <Text style={styles.tagline}>{BRAND.tagline}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{`v${currentAppVersion()}`}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.coverArt}>
            <Text style={styles.coverText}>JF</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>{TRACKS[0].name}</Text>
            <Text style={styles.heroArtist}>{TRACKS[0].artist}</Text>
            <Text style={styles.heroHint}>Conecta la app de escritorio o la web para controlar la música en tu teléfono.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Cola</Text>
        {TRACKS.map((t) => (
          <View key={t.id} style={styles.row}>
            <Text style={styles.rowName}>{t.name}</Text>
            <Text style={styles.rowArtist}>{t.artist}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Configuración</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Actualizaciones</Text>
            <Text style={styles.settingsStatus}>{updateLabel}</Text>
          </View>
          <View style={styles.settingsButtons}>
            <Pressable style={styles.settingsButton} onPress={() => void runCheck(true)} disabled={updateStatus === 'checking' || updateStatus === 'installing'}>
              <Text style={styles.settingsButtonText}>Buscar actualizaciones</Text>
            </Pressable>
            {updateStatus === 'available' && updateInfo && (
              <Pressable
                style={[styles.settingsButton, styles.settingsButtonPrimary]}
                onPress={() => {
                  setModalStatus('available');
                  setModalOpen(true);
                }}
              >
                <Text style={styles.settingsButtonTextPrimary}>Instalar actualización</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      <UpdateModal
        visible={modalOpen}
        current={currentAppVersion()}
        latest={updateInfo?.latest ?? ''}
        notes={updateInfo?.notes ?? ''}
        status={modalStatus}
        onInstall={() => void doInstall()}
        onLater={handleLater}
        onClose={handleLater}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#9b5cff',
  },
  tagline: {
    fontSize: 14,
    color: '#b0a8c0',
    marginTop: 2,
  },
  statusBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#232323',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    color: '#9b5cff',
    fontSize: 12,
    fontWeight: '700',
  },
  heroCard: {
    margin: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
  },
  coverArt: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#9b5cff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  heroInfo: {
    flex: 1,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  heroArtist: {
    color: '#b0a8c0',
    fontSize: 13,
    marginTop: 2,
  },
  heroHint: {
    color: '#8a8494',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
  },
  rowName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rowArtist: {
    color: '#8a8494',
    fontSize: 12,
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 14,
    gap: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  settingsLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsStatus: {
    color: '#9b5cff',
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  settingsButtons: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  settingsButton: {
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  settingsButtonPrimary: {
    backgroundColor: '#9b5cff',
    borderColor: '#9b5cff',
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  settingsButtonTextPrimary: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});