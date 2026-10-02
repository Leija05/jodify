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
import { JamModal } from '@/components/jam/JamModal';
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

  React.useEffect(() => {
    const { checked, runCheck } = useUpdateStore.getState();
    if (!checked) {
      useUpdateStore.setState({ checked: true });
      void runCheck();
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" translucent backgroundColor={colors.background} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index" options={{ headerShown: false, title: 'Inicio' }} />
        <Tabs.Screen name="library" options={{ headerShown: false, title: 'Biblioteca' }} />
        <Tabs.Screen name="community" options={{ headerShown: false, title: 'Comunidad' }} />
        <Tabs.Screen name="settings" options={{ headerShown: false, title: 'Ajustes' }} />
      </Tabs>
      <MiniPlayer />
      <TabBar />
      <FullscreenPlayer />
      <LyricsScreen />
      <EqualizerSheet />
      <SongActionsSheet />
      <JamModal />
      <SecretAccessScreen />
      <AuthScreen visible={authOpen} onClose={closeAuth} />
      <UpdateModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});