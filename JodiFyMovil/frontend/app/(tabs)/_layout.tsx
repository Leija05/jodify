import { Tabs } from 'expo-router';
import React from 'react';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { FullscreenPlayer } from '@/components/player/FullscreenPlayer';
import { LyricsScreen } from '@/components/player/LyricsScreen';
import { EqualizerSheet } from '@/components/player/EqualizerSheet';
import { SongActionsSheet } from '@/components/player/SongActionsSheet';
import AuthScreen from '../auth';
import { SecretAccessScreen } from '@/screens/SecretAccessScreen';
import { UpdateModal } from '@/components/update/UpdateModal';
import { TabBar } from '@/navigation/TabBar';
import { useBootstrap } from '@/hooks/useBootstrap';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { usePlayerEngine } from '@/hooks/usePlayerEngine';
import { useSleepTimer } from '@/hooks/useSleepTimer';
import { useUiStore } from '@/stores/ui.store';
import { useUpdateStore } from '@/stores/update.store';
import { colors } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';

export default function TabsLayout() {
  useBootstrap();
  usePlayerEngine();
  useSleepTimer();
  useHeartbeat();

  const authOpen = useUiStore((s) => s.authOpen);
  const closeAuth = useUiStore((s) => s.closeAuth);
  const update = useUpdateStore();

  React.useEffect(() => {
    if (update.checked) return;
    useUpdateStore.setState({ checked: true });
    void update.runCheck();
  }, [update]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" translucent backgroundColor={colors.background} />
      <Tabs screenOptions={{ tabBarStyle: { display: 'none' } }}>
        <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
        <Tabs.Screen name="library" options={{ title: 'Biblioteca' }} />
        <Tabs.Screen name="community" options={{ title: 'Comunidad' }} />
        <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
      </Tabs>
      <MiniPlayer />
      <TabBar />
      <FullscreenPlayer />
      <LyricsScreen />
      <EqualizerSheet />
      <SongActionsSheet />
      <SecretAccessScreen />
      <AuthScreen visible={authOpen} onClose={closeAuth} />
      <UpdateModal
        visible={update.modalOpen}
        current={update.info?.current ?? ''}
        latest={update.info?.latest ?? ''}
        notes={update.info?.notes ?? ''}
        status={update.modalStatus}
        onInstall={() => void update.doInstall()}
        onLater={update.handleLater}
        onClose={update.handleLater}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});