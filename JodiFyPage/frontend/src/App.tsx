import { useEffect } from 'react';
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { useAudioEngine, useVolumeBinding, useSettingsBinding, useEqBinding } from './hooks/useAudioEngine';
import { useKeyboardShortcuts, useShortcutHint } from './hooks/useKeyboardShortcuts';
import { useMediaSession } from './hooks/useMediaSession';
import { useJamBoot } from './hooks/useJamBoot';
import { DynamicBackground } from './components/layout/DynamicBackground';
import { usePlayerStore } from './store/player.store';

const isElectron = typeof window !== 'undefined' && navigator.userAgent.includes('Electron');

function Root() {
  const { session } = useSession();
  const audioRef = useAudioEngine();
  const currentSong = usePlayerStore((s) => s.currentSong);

  useVolumeBinding();
  useSettingsBinding();
  useEqBinding();
  useKeyboardShortcuts();
  useShortcutHint();
  useMediaSession();
  useJamBoot();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
  }, []);

  useEffect(() => {
    document.title = currentSong ? `${currentSong.name} — JodiFy` : 'JodiFy — Free Music For Friends';
  }, [currentSong]);

  return (
    <>
      <audio ref={audioRef} id="jodify-audio" preload="metadata" hidden />
      <DynamicBackground />
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const Router = isElectron ? MemoryRouter : BrowserRouter;
  return (
    <ThemeProvider>
      <SessionProvider>
        <Router initialEntries={['/']}>
          <Root />
        </Router>
      </SessionProvider>
    </ThemeProvider>
  );
}
