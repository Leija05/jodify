import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Play, DiscordLogo, Heart, MusicNotes, Download, ClockCounterClockwise } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { useUiStore } from '../../store/ui.store';
import { fetchCommunityUsers, fetchListeningStats } from '../../services/users.service';
import { fetchLanyardProfile } from '../../services/social.service';
import { useLibraryStore } from '../../store/library.store';
import { usePlayerStore } from '../../store/player.store';
import { playSong } from '../../services/player.service';
import { timeAgo } from '../../lib/utils';
import { statusView } from '../../lib/status';
import type { CommunityUser } from '../../lib/types';

const ease = [0.16, 1, 0.3, 1] as const;

export function UserDetailModal() {
  const ui = useUiStore();
  const [user, setUser] = useState<CommunityUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ liked: number; played: number; downloaded: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const username = ui.modalPayload?.username as string | undefined;

  useEffect(() => {
    if (ui.modal !== 'userDetail' || !username) return;
    setLoading(true);
    void (async () => {
      try {
        const rows = await fetchCommunityUsers();
        const row = rows.find((r) => r.username === username) ?? null;
        const statsData = await fetchListeningStats(username).catch(() => null);
        if (row?.discord_id) {
          const discord = await fetchLanyardProfile(row.discord_id);
          setUser({ ...row, discord });
        } else {
          setUser(row ? { ...row, discord: null } : null);
        }
        setStats(statsData);
      } catch {
        /* mantener estado previo */
      } finally {
        setLoading(false);
      }
    })();
  }, [ui.modal, username]);

  useEffect(() => {
    if (ui.modal !== 'userDetail') return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [ui.modal]);

  const status = useMemo(() => statusView(user, user?.discord), [user, now]);

  const playTheirSong = async () => {
    if (!user?.current_song_name) return;
    const library = useLibraryStore.getState();
    const song = library.songs.find((s) => s.name.toLowerCase() === user.current_song_name!.toLowerCase());
    if (!song) return;
    await playSong(song);
    usePlayerStore.getState().setIsPlaying(true);
  };

  return (
    <Modal name="userDetail" title="Perfil" width={540} className="jf-modal--profile">
      {loading || !user ? (
        <div className="jf-profile-loading">
          <Spinner size={24} />
        </div>
      ) : (
        <div className="jf-profile-shell">
          <div className="jf-profile-banner" aria-hidden="true">
            <span className="jf-profile-orb jf-profile-orb--a" />
            <span className="jf-profile-orb jf-profile-orb--b" />
          </div>

          <div className="jf-profile">
            <div className="jf-profile-split">
              <motion.div
                className="jf-profile-id"
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.45, ease }}
              >
                <div className="jf-avatar-ring">
                  <Avatar
                    username={user.username}
                    src={user.discord?.avatar_url}
                    size={80}
                    presence={user.discord?.presence ?? (status.jfOnline ? 'online' : 'offline')}
                  />
                </div>
                <h3 className="jf-profile-username">{user.username}</h3>
                <span className={`jf-role-badge jf-role-badge--${user.role}`}>{user.role}</span>
                {!user.is_online && user.last_seen && <p className="jf-user-lastseen">Visto {timeAgo(user.last_seen)}</p>}
              </motion.div>

              <div className="jf-profile-meta">
                <motion.div
                  className="jf-status-pills"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease, delay: 0.05 }}
                >
                  <span className={`jf-status-pill jf-status-pill--${status.jfTone}`}>
                    <span className="jf-status-dot" />
                    {status.jfLabel}
                  </span>
                  <span className={`jf-status-pill jf-status-pill--discord jf-status-pill--${user.discord ? (status.discordTone ?? 'offline') : 'offline'}`}>
                    <DiscordLogo size={12} weight="fill" />
                    {user.discord ? `Discord: ${status.discordLabel}` : 'Sin Discord'}
                  </span>
                </motion.div>

                {user.discord && (
                  <motion.div
                    className="jf-user-discord-card"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease, delay: 0.1 }}
                  >
                    <Avatar username={user.discord.display_name ?? user.username} src={user.discord.avatar_url} presence={user.discord.presence} size={40} />
                    <div className="jf-user-discord-info">
                      <p className="jf-discord-name">{user.discord.display_name}</p>
                      <p className="jf-discord-tag">@{user.discord.user_name}</p>
                    </div>
                  </motion.div>
                )}

                {user.current_song_name && status.jfOnline && (
                  <motion.button
                    className="jf-nowplay jf-nowplay--button jf-nowplay--compact"
                    onClick={() => void playTheirSong()}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease, delay: 0.15 }}
                  >
                    <span className="jf-nowplay-eq" aria-hidden="true">
                      <i /><i /><i /><i />
                    </span>
                    <span className="jf-nowplay-meta">
                      <span className="jf-nowplay-label">
                        <span className="jf-pulse-dot" /> Escuchando
                      </span>
                      <span className="jf-nowplay-title">{user.current_song_name}</span>
                      <span className="jf-nowplay-artist">Toca para reproducir</span>
                    </span>
                    <span className="jf-nowplay-cta">
                      <Play size={13} weight="fill" />
                    </span>
                  </motion.button>
                )}
              </div>
            </div>

            <motion.div
              className="jf-profile-stats"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.2 }}
            >
              <div className="jf-stat-card">
                <span className="jf-stat-chip jf-stat-chip--pink"><Heart size={15} weight="fill" /></span>
                <strong>{stats?.liked ?? 0}</strong>
                <span>Likes</span>
              </div>
              <div className="jf-stat-card">
                <span className="jf-stat-chip jf-stat-chip--violet"><MusicNotes size={15} weight="fill" /></span>
                <strong>{stats?.played ?? 0}</strong>
                <span>Escuchas</span>
              </div>
              <div className="jf-stat-card">
                <span className="jf-stat-chip jf-stat-chip--cyan"><Download size={15} weight="fill" /></span>
                <strong>{stats?.downloaded ?? 0}</strong>
                <span>Descargas</span>
              </div>
            </motion.div>

            <motion.div
              className="jf-profile-actions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.25 }}
            >
              <Button variant="glass" size="sm" onClick={() => ui.open('history', { username: user.username })}>
                <ClockCounterClockwise size={15} /> Ver historial
              </Button>
            </motion.div>
          </div>
        </div>
      )}
    </Modal>
  );
}
