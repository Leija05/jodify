import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { LyricsPanel } from '../components/layout/LyricsPanel';
import { PlaylistPanel } from '../components/layout/PlaylistPanel';
import { HomeShowcaseView } from '../components/home/HomeShowcaseView';
import { HomeSideWidget } from '../components/home/HomeSideWidget';
import { PlayerBar } from '../components/player/PlayerBar';
import { QueueDrawer } from '../components/player/QueueDrawer';
import { EqualizerModal } from '../components/equalizer/EqualizerModal';
import { JamPanel } from '../components/jam/JamPanel';
import { RecommendModal } from '../components/jam/RecommendModal';
import { HostRecommendations } from '../components/jam/HostRecommendations';
import { JamHistoryModal } from '../components/jam/JamHistoryModal';
import { SettingsModal } from '../components/settings/SettingsModal';
import { DesktopUpdaterModal } from '../components/settings/DesktopUpdaterModal';
import { ShortcutsModal } from '../components/settings/ShortcutsModal';
import { UploadModal } from '../components/admin/UploadModal';
import { UploadFloatingBadge } from '../components/admin/UploadFloatingBadge';
import { EditSongModal } from '../components/admin/EditSongModal';
import { DevView } from '../components/dev/DevView';
import { DeleteSongsModal } from '../components/admin/DeleteSongsModal';
import { CommunityModal } from '../components/social/CommunityModal';
import { ProfileModal } from '../components/social/ProfileModal';
import { UserDetailModal } from '../components/social/UserDetailModal';
import { DiscordModal } from '../components/social/DiscordModal';
import { ListeningHistoryModal } from '../components/social/ListeningHistoryModal';
import { FullscreenPlayer } from '../components/player/FullscreenPlayer';
import { OfflineModal } from '../components/offline/OfflineModal';
import { CreatePlaylistModal } from '../components/layout/CreatePlaylistModal';
import { LinkMusicModal } from '../components/layout/LinkMusicModal';
import { useLoadLibrary } from '../hooks/useLoadLibrary';
import { useTaskbarControls } from '../hooks/useTaskbarControls';
import { useHeartbeat } from '../hooks/useHeartbeat';
import { useUiStore } from '../store/ui.store';
import { usePlaylistsStore } from '../store/playlists.store';

export function HomePage() {
  const { session } = useSession();
  const navigate = useNavigate();
  const mainView = useUiStore((s) => s.mainView);
  const loadPlaylists = usePlaylistsStore((s) => s.loadPlaylists);

  useLoadLibrary(session);
  useTaskbarControls();
  useHeartbeat(Boolean(session));

  useEffect(() => {
    if (!session) navigate('/login', { replace: true });
    else loadPlaylists(session.username);
  }, [session, navigate, loadPlaylists]);

  if (!session) return null;

  return (
    <div className="jf-app" data-testid="main-app">
      {/* Estructura dinámica: INICIO (Showcase + SideWidget) vs LETRAS (Lyrics + Library Playlist) */}
      {mainView === 'home' ? (
        <>
          <HomeShowcaseView />
          <HomeSideWidget />
        </>
      ) : (
        <>
          <LyricsPanel />
          <PlaylistPanel />
        </>
      )}

      <PlayerBar />

      {/* Notificación flotante de subida en segundo plano */}
      <UploadFloatingBadge />

      {/* Modales y utilidades */}
      <CreatePlaylistModal />
      <LinkMusicModal />
      <QueueDrawer />
      <EqualizerModal />
      <JamPanel />
      <RecommendModal />
      <HostRecommendations />
      <JamHistoryModal />
      <SettingsModal />
      <DesktopUpdaterModal />
      <ShortcutsModal />
      <UploadModal />
      <EditSongModal />
      <DevView />
      <DeleteSongsModal />
      <CommunityModal />
      <ProfileModal />
      <UserDetailModal />
      <DiscordModal />
      <ListeningHistoryModal />
      <FullscreenPlayer />
      <OfflineModal />
    </div>
  );
}
