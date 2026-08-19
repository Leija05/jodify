import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { LyricsPanel } from '../components/layout/LyricsPanel';
import { PlaylistPanel } from '../components/layout/PlaylistPanel';
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
import { useLoadLibrary } from '../hooks/useLoadLibrary';
import { useTaskbarControls } from '../hooks/useTaskbarControls';

export function HomePage() {
  const { session } = useSession();
  const navigate = useNavigate();

  useLoadLibrary(session);
  useTaskbarControls();

  useEffect(() => {
    if (!session) navigate('/login', { replace: true });
  }, [session, navigate]);

  if (!session) return null;

  return (
    <div className="jf-app" data-testid="main-app">
      <LyricsPanel />
      <PlaylistPanel />
      <PlayerBar />

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
