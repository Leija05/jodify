import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { UsersThree, ArrowsClockwise, Play, CaretRight } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { useUiStore } from '../../store/ui.store';
import { useSession } from '../../context/SessionContext';
import { fetchCommunityUsers, fetchTopSongs } from '../../services/users.service';
import { fetchLanyardProfile, fetchLikesForUsers, fetchDownloadsForUsers } from '../../services/social.service';
import { playSong } from '../../services/player.service';
import { usePlayerStore } from '../../store/player.store';
import { useLibraryStore } from '../../store/library.store';
import { timeAgo } from '../../lib/utils';
import { jfIsOnline } from '../../lib/status';
import type { CommunityUser } from '../../lib/types';
import { COMMUNITY_REFRESH_MS } from '../../lib/constants';

export function CommunityModal() {
  const ui = useUiStore();
  const { session } = useSession();
  const [tab, setTab] = useState<'online' | 'all'>('online');
  const [users, setUsers] = useState<CommunityUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [topSongs, setTopSongs] = useState<Array<{ song_name: string; count: number }>>([]);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const rows = await fetchCommunityUsers();
      const usernames = rows.map((u) => u.username);
      const [likes, downloads, discordProfiles, songs] = await Promise.all([
        fetchLikesForUsers(usernames),
        fetchDownloadsForUsers(usernames),
        Promise.all(
          rows.slice(0, 12)
            .filter((u) => u.discord_id)
            .map(async (u) => ({ name: u.username, profile: await fetchLanyardProfile(u.discord_id!) })),
        ),
        fetchTopSongs(session.username).catch(() => []),
      ]);
      const discordMap = new Map(discordProfiles.filter((d) => d.profile).map((d) => [d.name, d.profile]));
      setUsers(rows.map((row) => ({ ...row, discord: discordMap.get(row.username) ?? null, stat_likes: likes[row.username] ?? 0, stat_downloads: downloads[row.username] ?? 0 })));
      setTopSongs(songs);
    } catch {
      /* mantener el estado anterior */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ui.modal !== 'community') return;
    void load();
    if (autoRefresh) {
      const timer = setInterval(() => void load(), COMMUNITY_REFRESH_MS);
      return () => clearInterval(timer);
    }
  }, [ui.modal, autoRefresh, session]);

  const visible = useMemo(
    () => (tab === 'online' ? users.filter((u) => jfIsOnline(u)) : users),
    [tab, users],
  );

  const playCommunitySong = async (songName: string) => {
    const library = useLibraryStore.getState();
    const song = library.songs.find((s) => s.name.toLowerCase() === songName.toLowerCase());
    if (!song) return;
    await playSong(song);
    usePlayerStore.getState().setIsPlaying(true);
  };

  return (
    <Modal name="community" title="Comunidad">
      <div className="jf-community-toolbar">
        <div className="jf-community-tabs" role="tablist">
          {(['online', 'all'] as const).map((t) => (
            <button
              key={t}
              className={`jf-community-tab ${tab === t ? 'is-active' : ''}`}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
            >
              {t === 'online' ? 'En línea' : 'Todos'}
            </button>
          ))}
        </div>
        <div className="jf-community-toolbar-right">
          <label className="jf-autorefresh">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto
          </label>
          <button className="jf-control" aria-label="Actualizar" onClick={() => void load()}>
            <ArrowsClockwise size={15} className={loading ? 'jf-spin' : ''} />
          </button>
        </div>
      </div>

      {topSongs.length > 0 && (
        <div className="jf-community-insights">
          <p className="jf-community-insights-title">Tus más escuchadas hoy</p>
          <div className="jf-community-insights-list">
            {topSongs.slice(0, 3).map((song, i) => (
              <button key={song.song_name} className="jf-community-song" onClick={() => void playCommunitySong(song.song_name)}>
                <span className="jf-community-song-rank">{i + 1}</span>
                <span className="jf-community-song-name">{song.song_name}</span>
                <Play size={13} weight="fill" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="jf-community-list">
        {loading && visible.length === 0 ? (
          <div className="jf-community-loading">
            <Spinner size={22} />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={UsersThree} title="Nadie por aquí" description="Comparte tu código de Jam para invitar amigos." />
        ) : (
          visible.map((user, i) => (
            <motion.button
              key={user.username}
              className="jf-community-user"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
              onClick={() => ui.open('userDetail', { username: user.username })}
            >
              <Avatar
                username={user.username}
                src={user.discord?.avatar_url}
                presence={user.discord?.presence ?? (user.is_online ? 'online' : 'offline')}
                size={44}
              />
              <div className="jf-community-user-info">
                <p className="jf-community-user-name">
                  {user.username}
                  {user.role !== 'user' && <span className={`jf-role-badge jf-role-badge--${user.role}`}>{user.role}</span>}
                </p>
                {user.current_song_name && jfIsOnline(user) ? (
                  <p className="jf-community-user-status is-listening">
                    <span className="jf-pulse-dot" /> Escuchando: {user.current_song_name}
                  </p>
                ) : (
                  <p className="jf-community-user-status">
                    {jfIsOnline(user) ? 'En línea' : user.last_seen ? `Visto ${timeAgo(user.last_seen)}` : 'Desconectado'}
                  </p>
                )}
              </div>
              <div className="jf-community-user-stats">
                <span>♥ {user.stat_likes ?? 0}</span>
                <span>⤓ {user.stat_downloads ?? 0}</span>
              </div>
              <CaretRight size={13} weight="bold" className="jf-community-user-arrow" />
            </motion.button>
          ))
        )}
      </div>
    </Modal>
  );
}
