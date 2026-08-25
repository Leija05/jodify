import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts as useManropeFonts,
} from '@expo-google-fonts/manrope';
import {
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_900Black,
  useFonts as useOutfitFonts,
} from '@expo-google-fonts/outfit';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MiniPlayer } from './src/components/player/MiniPlayer';
import { FullscreenPlayer } from './src/components/player/FullscreenPlayer';
import { LyricsScreen } from './src/components/player/LyricsScreen';
import { EqualizerSheet } from './src/components/player/EqualizerSheet';
import { UpdateModal } from './src/components/update/UpdateModal';
import { useBootstrap } from './src/hooks/useBootstrap';
import { useHeartbeat } from './src/hooks/useHeartbeat';
import { usePlayerEngine } from './src/hooks/usePlayerEngine';
import { useSleepTimer } from './src/hooks/useSleepTimer';
import { TabBar } from './src/navigation/TabBar';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { CommunityScreen } from './src/screens/CommunityScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SecretAccessScreen } from './src/screens/SecretAccessScreen';
import { configureAudioMode } from './src/store/audio';
import { useUiStore } from './src/store/ui.store';
import { useUpdateStore } from './src/store/update.store';
import { colors } from './src/theme';

export default function App() {
  const [outfitLoaded] = useOutfitFonts({
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_900Black,
  });
  const [manropeLoaded] = useManropeFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  usePlayerEngine();
  useSleepTimer();
  useBootstrap();
  useHeartbeat();

  const tab = useUiStore((s) => s.tab);
  const authOpen = useUiStore((s) => s.authOpen);
  const closeAuth = useUiStore((s) => s.closeAuth);
  const update = useUpdateStore();

  useEffect(() => {
    void configureAudioMode();
  }, []);

  useEffect(() => {
    if (update.checked) return;
    useUpdateStore.setState({ checked: true });
    void update.runCheck();
  }, [update]);

  if (!outfitLoaded || !manropeLoaded) {
    return <View style={styles.boot} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        {tab === 'home' && <HomeScreen />}
        {tab === 'library' && <LibraryScreen />}
        {tab === 'community' && <CommunityScreen />}
        {tab === 'settings' && <SettingsScreen />}
        <MiniPlayer />
        <TabBar />
        <FullscreenPlayer />
        <LyricsScreen />
        <EqualizerSheet />
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  boot: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
