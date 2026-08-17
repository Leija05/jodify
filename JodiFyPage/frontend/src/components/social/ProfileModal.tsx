import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Play, Download, Export, SignOut, DiscordLogo, LinkSimple, LinkBreak, ClockCounterClockwise } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { useSession } from '../../context/SessionContext';
import { useUiStore } from '../../store/ui.store';
import { useLibraryStore } from '../../store/library.store';
import { useToastStore } from '../../store/toast.store';
import { fetchListeningStats, usersService } from '../../services/users.service';
import { fetchLanyardProfile } from '../../services/social.service';
import { downloadJson, getSongCoverCandidates } from '../../lib/utils';
import { statusView } from '../../lib/status';
import { usePlayerStore } from '../../store/player.store';
import type { DiscordProfile, UserAccess } from '../../lib/types';

const ease = [0.16, 1, 0.3, 1] as const;

export function ProfileModal() {
  const { session, logout } = useSession();
  const ui = useUiStore();
  const toast = useToastStore();
  const [profile, setProfile] = useState<UserAccess | null>(null);
  const [discord, setDiscord] = useState<DiscordProfile | null>(null);
  const [stats, setStats] = useState<{ liked: number; played: number; downloaded: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const currentSong = usePlayerStore((s) => s.currentSong);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    const [profileData, statsData] = await Promise.all([
      usersService.fetchProfile(session.username).catch(() => null),
      fetchListeningStats(session.username).catch(() => null),
    ]);
    setProfile(profileData);
    setStats(statsData);
    if (profileData?.discord_id) {
      setDiscord(await fetchLanyardProfile(profileData.discord_id));
    } else {
      setDiscord(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (ui.modal !== 'profile' || !session) return;
    void load();
  }, [ui.modal, session]);

  useEffect(() => {
    if (ui.modal !== 'profile') return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [ui.modal]);

  const status = useMemo(() => statusView(profile, discord), [profile, discord, now]);

  const handleLink = () => ui.open('discord');

  const handleUnlink = async () => {
    if (!session) return;
    await usersService.setDiscordId(session.username, null).catch(() => undefined);
    setDiscord(null);
    setProfile((p) => (p ? { ...p, discord_id: null } : p));
    toast.show('Discord desvinculado', 'info');
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleExport = () => {
    if (!session || !stats || !profile) return;
    downloadJson(`jodify-stats-${session.username}.json`, {
      username: session.username,
      role: session.role,
      likedSongs: useLibraryStore.getState().likedIds.length,
      likes: stats.liked,
      played: stats.played,
      downloads: stats.downloaded,
      discord: discord?.discord_id ?? null,
      exportedAt: new Date().toISOString(),
    });
  };

  const cover = useMemo(
    () => (currentSong ? getSongCoverCandidates(currentSong as unknown as Record<string, unknown>)[0] ?? '/assets/default-cover.png' : null),
    [currentSong],
  );

  return (
    <Modal name="profile" title="Tu perfil" width={540} className="jf-modal--profile">
      {loading || !profile ? (
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
                    username={profile.username}
                    src={discord?.avatar_url}
                    size={80}
                    presence={discord?.presence ?? (status.jfOnline ? 'online' : 'offline')}
                  />
                </div>
                <h3 className="jf-profile-username">{profile.username}</h3>
                <span className={`jf-role-badge jf-role-badge--${profile.role}`}>{profile.role}</span>
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
                  <span className={`jf-status-pill jf-status-pill--discord jf-status-pill--${discord ? (status.discordTone ?? 'offline') : 'offline'}`}>
                    <DiscordLogo size={12} weight="fill" />
                    {discord ? `Discord: ${status.discordLabel}` : 'Discord sin vincular'}
                  </span>
                </motion.div>

                {currentSong && (
                  <motion.div
                    className="jf-nowplay jf-nowplay--compact"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease, delay: 0.1 }}
                  >
                    <span className="jf-nowplay-eq" aria-hidden="true">
                      <i /><i /><i /><i />
                    </span>
                    {cover && <img className="jf-nowplay-cover" src={cover} alt="" />}
                    <div className="jf-nowplay-meta">
                      <p className="jf-nowplay-label">
                        <span className="jf-pulse-dot" /> Ahora
                      </p>
                      <p className="jf-nowplay-title">{currentSong.name}</p>
                      <p className="jf-nowplay-artist">{currentSong.added_by ? `Por ${currentSong.added_by}` : 'JodiFy'}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <motion.div
              className="jf-profile-stats"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.15 }}
            >
              <div className="jf-stat-card">
                <span className="jf-stat-chip jf-stat-chip--pink"><Heart size={15} weight="fill" /></span>
                <strong>{stats?.liked ?? 0}</strong>
                <span>Likes</span>
              </div>
              <div className="jf-stat-card">
                <span className="jf-stat-chip jf-stat-chip--violet"><Play size={15} weight="fill" /></span>
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
              className="jf-discord-panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.2 }}
            >
              <span className="jf-discord-chip"><DiscordLogo size={20} weight="fill" /></span>
              <div className="jf-discord-info">
                {discord ? (
                  <>
                    <p className="jf-discord-name">{discord.display_name}</p>
                    <p className="jf-discord-tag">@{discord.user_name} · Discord vinculado</p>
                  </>
                ) : (
                  <>
                    <p className="jf-discord-name">Discord no vinculado</p>
                    <p className="jf-discord-tag">Conéctalo para mostrar tu presencia en vivo</p>
                  </>
                )}
              </div>
              <div className="jf-discord-actions">
                {discord ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleLink}>
                      <LinkSimple size={14} /> Cambiar
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => void handleUnlink()}>
                      <LinkBreak size={14} /> Desvincular
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" size="sm" onClick={handleLink}>
                    <DiscordLogo size={14} weight="fill" /> Vincular
                  </Button>
                )}
              </div>
            </motion.div>

            <motion.div
              className="jf-profile-actions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.25 }}
            >
              <Button variant="glass" size="sm" onClick={handleExport}>
                <Export size={15} /> Exportar stats
              </Button>
              <Button variant="glass" size="sm" onClick={() => ui.open('history', { username: profile.username })}>
                <ClockCounterClockwise size={15} /> Historial
              </Button>
              <Button variant="danger" size="sm" onClick={handleLogout}>
                <SignOut size={15} /> Cerrar sesión
              </Button>
            </motion.div>
          </div>
        </div>
      )}
    </Modal>
  );
}
