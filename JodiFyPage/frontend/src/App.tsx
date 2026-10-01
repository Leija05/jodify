import { useEffect } from 'react';
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext';
import { ThemeProvider } from './context/ThemeContext';
import { IntroPage } from './pages/IntroPage';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { useAudioEngine, useVolumeBinding, useSettingsBinding, useEqBinding } from './hooks/useAudioEngine';
import { useKeyboardShortcuts, useShortcutHint } from './hooks/useKeyboardShortcuts';
import { useMediaSession } from './hooks/useMediaSession';
import { useJamBoot } from './hooks/useJamBoot';
import { DynamicBackground } from './components/layout/DynamicBackground';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { SongContextMenu } from './components/ui/SongContextMenu';
import { Toaster } from './components/ui/Toaster';
import { BackendStatusBanner } from './components/layout/BackendStatusBanner';
import { AppErrorBoundary, GlobalErrorHandler } from './components/GlobalErrorHandler';
import { PetCompanionWidget } from './components/social/PetCompanionWidget';
import { DownloadsModal } from './components/offline/DownloadsModal';
import { DownloadsBadge } from './components/offline/DownloadsBadge';
import { PlaylistDetailModal } from './components/layout/PlaylistDetailModal';
import { usePlayerStore } from './store/player.store';
import { useBackendStore } from './store/backend.store';

const isElectron = typeof window !== 'undefined' && navigator.userAgent.includes('Electron');

function Root() {
  const { session, ready } = useSession();
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
    useBackendStore.getState().init();
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
  }, []);

  useEffect(() => {
    document.title = currentSong ? `${currentSong.name} — JodiFy` : 'JodiFy — Free Music For Friends';
  }, [currentSong]);

  return (
    <>
      <audio ref={audioRef} id="jodify-audio" preload="metadata" hidden />
      {!ready ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            width: '100vw',
            background: '#07070a',
            color: '#fff',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.12)',
              borderTopColor: '#6366f1',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      ) : (
        <>
          <DynamicBackground />
          <GlobalErrorHandler />
          <BackendStatusBanner />
          <ConfirmDialog />
          <SongContextMenu />
          <Toaster />
          <PetCompanionWidget />
          <DownloadsModal />
          <DownloadsBadge />
          <PlaylistDetailModal />
          <Routes>
            <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/" element={session ? <HomePage /> : isElectron ? <LoginPage /> : <IntroPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </>
      )}
    </>
  );
}

export default function App() {
  const Router = isElectron ? MemoryRouter : BrowserRouter;
  return (
    <ThemeProvider>
      <SessionProvider>
        <Router initialEntries={['/']}>
          <AppErrorBoundary>
            <Root />
          </AppErrorBoundary>
        </Router>
      </SessionProvider>
    </ThemeProvider>
  );
}
