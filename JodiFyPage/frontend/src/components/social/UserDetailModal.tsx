import { useEffect, useMemo, useState } from 'react';
import {
  Play,
  DiscordLogo,
  Heart,
  MusicNotes,
  Download,
  ClockCounterClockwise,
  Sparkle,
  Fire,
} from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { useUiStore } from '../../store/ui.store';
import { fetchCommunityUsers, fetchListeningStats, fetchTopSongs } from '../../services/users.service';
import { fetchLanyardProfile } from '../../services/social.service';
import { useLibraryStore } from '../../store/library.store';
import { usePlayerStore } from '../../store/player.store';
import { useSession } from '../../context/SessionContext';
import { playSong } from '../../services/player.service';
import { timeAgo, resolveAvatarSrc, calculateMelomanoLevel } from '../../lib/utils';
import { statusView, jfIsOnline } from '../../lib/status';
import { SongCover } from '../ui/SongCover';
import type { CommunityUser } from '../../lib/types';

export function UserDetailModal() {
  const ui = useUiStore();
  const { session } = useSession();
  const librarySongs = useLibraryStore((s) => s.songs);

  const [user, setUser] = useState<CommunityUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ liked: number; played: number; downloaded: number } | null>(null);
  const [topSongs, setTopSongs] = useState<Array<{ song_name: string; count: number }>>([]);
  const [now, setNow] = useState(() => Date.now());

  const myCurrentSong = usePlayerStore((s) => s.currentSong);
  const myIsPlaying = usePlayerStore((s) => s.isPlaying);

  const username = ui.modalPayload?.username as string | undefined;

  useEffect(() => {
    if (ui.modal !== 'userDetail' || !username) return;
    setLoading(true);
    void (async () => {
      try {
        const [rows, statsData, userTopSongs] = await Promise.all([
          fetchCommunityUsers(),
          fetchListeningStats(username).catch(() => null),
          fetchTopSongs(username, 3).catch(() => []),
        ]);
        const row = rows.find((r) => r.username.toLowerCase() === username.toLowerCase()) ?? null;
        if (row?.discord_id) {
          const discord = await fetchLanyardProfile(row.discord_id);
          setUser({ ...row, discord });
        } else {
          setUser(row ? { ...row, discord: null } : null);
        }
        setStats(statsData);
        setTopSongs(userTopSongs);
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

  const isMe = user?.username.toLowerCase() === session?.username?.toLowerCase();
  const isOnline = isMe ? true : (user ? jfIsOnline(user) : false);

  const status = useMemo(() => statusView(user, user?.discord), [user, now]);
  const melomano = useMemo(() => calculateMelomanoLevel(stats), [stats]);

  // Si es el usuario actual, reflejar la canción que suena en vivo localmente
  const liveSongName = isMe && myIsPlaying && myCurrentSong ? myCurrentSong.name : user?.current_song_name;

  const anthemSong = useMemo(() => {
    if (!user?.anthem_song_id && !user?.anthem_song_name) return null;
    return librarySongs.find(
      (s) =>
        (user.anthem_song_id && String(s.id) === String(user.anthem_song_id)) ||
        (user.anthem_song_name && s.name.toLowerCase() === user.anthem_song_name.toLowerCase()),
    ) ?? null;
  }, [user, librarySongs]);

  const playTheirSong = async (songName?: string) => {
    const targetName = songName || liveSongName;
    if (!targetName) return;
    const song = librarySongs.find((s) => s.name.toLowerCase() === targetName.toLowerCase());
    if (!song) return;
    await playSong(song);
    usePlayerStore.getState().setIsPlaying(true);
  };

  const playAnthem = async () => {
    if (!anthemSong) return;
    await playSong(anthemSong);
    usePlayerStore.getState().setIsPlaying(true);
  };

  const themeClass = user?.theme ? `theme--${user.theme}` : 'theme--aurora';
  const frameClass = user?.avatar_frame && user.avatar_frame !== 'none' ? `jf-avatar-frame--${user.avatar_frame}` : '';
  const avatarSrc = resolveAvatarSrc(user);

  return (
    <Modal name="userDetail" title="Inspeccionar Perfil Steam" width={880} className="jf-modal--profile">
      {loading || !user ? (
        <div className="jf-profile-loading">
          <Spinner size={24} />
        </div>
      ) : (
        <div className={`jf-profile-shell ${themeClass}`}>
          <div className="jf-profile-banner" aria-hidden="true">
            <span className="jf-profile-orb jf-profile-orb--a" />
            <span className="jf-profile-orb jf-profile-orb--b" />
          </div>

          <div className="jf-profile">
            {/* Hero Header Espacioso */}
            <div className="jf-profile-hero">
              <div className="jf-profile-hero-left">
                <div className="jf-profile-hero-avatar">
                  <div className={`jf-avatar-frame-wrap ${frameClass}`}>
                    <Avatar
                      username={user.display_name || user.username}
                      src={avatarSrc}
                      size={84}
                      presence={user.discord?.presence ?? (isOnline ? 'online' : 'offline')}
                    />
                  </div>
                </div>
                <div className="jf-profile-hero-info">
                  <div className="jf-profile-hero-name-row">
                    <h3 className="jf-profile-hero-name">{user.display_name || user.username}</h3>
                    {user.display_name && user.display_name !== user.username && (
                      <span className="jf-profile-hero-handle">@{user.username}</span>
                    )}
                  </div>
                  <div className="jf-profile-hero-badges">
                    <span className={`jf-role-badge jf-role-badge--${user.role}`}>{user.role}</span>
                    {user.custom_badge && (
                      <span className="jf-profile-custom-badge">{user.custom_badge}</span>
                    )}
                    {user.vibe && (
                      <span className="jf-profile-vibe-badge">
                        <Sparkle size={11} weight="fill" /> {user.vibe}
                      </span>
                    )}
                  </div>
                  <div className="jf-status-pills" style={{ marginTop: '2px' }}>
                    <span className={`jf-status-pill jf-status-pill--${isOnline ? 'online' : 'offline'}`}>
                      <span className="jf-status-dot" />
                      {isOnline ? 'En línea en JodiFy' : user.last_seen ? `Visto ${timeAgo(user.last_seen)}` : 'Desconectado'}
                    </span>
                    <span className={`jf-status-pill jf-status-pill--discord jf-status-pill--${user.discord ? (status.discordTone ?? 'offline') : 'offline'}`}>
                      <DiscordLogo size={12} weight="fill" />
                      {user.discord ? `Discord: ${status.discordLabel}` : 'Sin Discord'}
                    </span>
                  </div>
                  {user.bio && (
                    <div className="jf-profile-bio-box" style={{ margin: '4px 0 0 0' }}>
                      "{user.bio}"
                    </div>
                  )}
                </div>
              </div>

              <div className="jf-profile-hero-right">
                <div className="jf-melomano-left" style={{ justifyContent: 'flex-end', width: '100%' }}>
                  <div className="jf-melomano-info" style={{ textAlign: 'right' }}>
                    <span className="jf-melomano-title" style={{ justifyContent: 'flex-end' }}>
                      {melomano.badgeEmoji} {melomano.title}
                    </span>
                    <span className="jf-melomano-sub">
                      Rango Nivel {melomano.level}
                    </span>
                  </div>
                  <span
                    className="jf-melomano-badge"
                    style={{ color: melomano.badgeColor, borderColor: melomano.badgeColor }}
                    title={`Nivel ${melomano.level}`}
                  >
                    {melomano.level}
                  </span>
                </div>
                <div className="jf-melomano-progress-wrap" style={{ width: '100%', maxWidth: '100%' }}>
                  <div className="jf-melomano-progress-bar">
                    <div
                      className="jf-melomano-progress-fill"
                      style={{ width: `${melomano.progressPercent}%` }}
                    />
                  </div>
                  <span className="jf-melomano-progress-text">
                    {melomano.currentXp} / {melomano.nextLevelXp} XP ({melomano.progressPercent}%)
                  </span>
                </div>
              </div>
            </div>

            {/* 2-Column Bento Grid */}
            <div className="jf-profile-bento">
              {/* Columna Principal Izquierda */}
              <div className="jf-profile-bento-main">
                {/* Escuchando en vivo */}
                {liveSongName && isOnline && (
                  <div className="jf-showcase-card">
                    <div className="jf-showcase-card-header">
                      <span className="jf-pulse-dot" />
                      <span>Escuchando ahora en vivo</span>
                    </div>
                    <div className="jf-showcase-nowplay-body">
                      <div className="jf-showcase-cover-wrap">
                        <div className="jf-showcase-eq-overlay" style={{ position: 'relative', width: '52px', height: '52px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)' }}>
                          <i /><i /><i /><i />
                        </div>
                      </div>
                      <div className="jf-showcase-nowplay-meta">
                        <h4 className="jf-showcase-song-title">{liveSongName}</h4>
                        <p className="jf-showcase-song-artist">Reproduciendo actualmente</p>
                      </div>
                      <button
                        type="button"
                        className="jf-showcase-play-btn"
                        onClick={() => void playTheirSong()}
                        title="Escuchar junto a este usuario"
                      >
                        <Play size={16} weight="fill" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Himno Personal */}
                {anthemSong && (
                  <div className="jf-showcase-card">
                    <div className="jf-showcase-card-header">
                      <Sparkle size={13} weight="fill" style={{ color: '#ffd700' }} />
                      <span>Himno Personal Insignia</span>
                    </div>
                    <div className="jf-showcase-anthem-body">
                      <SongCover song={anthemSong} alt="" className="jf-showcase-anthem-cover" />
                      <div className="jf-showcase-anthem-meta">
                        <h4 className="jf-showcase-song-title">{anthemSong.name}</h4>
                        <p className="jf-showcase-song-artist">{anthemSong.added_by ? `Por ${anthemSong.added_by}` : 'JodiFy'}</p>
                      </div>
                      <button
                        type="button"
                        className="jf-showcase-play-btn"
                        onClick={() => void playAnthem()}
                        title={`Reproducir el himno de ${user.username}`}
                      >
                        <Play size={16} weight="fill" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Top Canciones más escuchadas */}
                {topSongs.length > 0 && (
                  <div className="jf-showcase-card">
                    <div className="jf-showcase-card-header">
                      <Fire size={13} weight="fill" style={{ color: '#ff5500' }} />
                      <span>Canciones más escuchadas por {user.display_name || user.username}</span>
                    </div>
                    <div className="jf-profile-top-songs-list">
                      {topSongs.map((ts, idx) => (
                        <button
                          key={ts.song_name}
                          type="button"
                          className="jf-profile-top-song-item"
                          onClick={() => void playTheirSong(ts.song_name)}
                          title={`Reproducir ${ts.song_name}`}
                        >
                          <span className="jf-profile-top-song-rank">#{idx + 1}</span>
                          <span className="jf-profile-top-song-name">{ts.song_name}</span>
                          <span className="jf-profile-top-song-count">{ts.count} escuchas</span>
                          <Play size={13} weight="fill" style={{ color: 'var(--accent)' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Columna Lateral Derecha */}
              <div className="jf-profile-bento-side">
                {/* Métricas */}
                <div className="jf-profile-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <div className="jf-stat-card">
                    <span className="jf-stat-chip jf-stat-chip--pink"><Heart size={14} weight="fill" /></span>
                    <strong>{stats?.liked ?? 0}</strong>
                    <span>Likes</span>
                  </div>
                  <div className="jf-stat-card">
                    <span className="jf-stat-chip jf-stat-chip--violet"><MusicNotes size={14} weight="fill" /></span>
                    <strong>{stats?.played ?? 0}</strong>
                    <span>Escuchas</span>
                  </div>
                  <div className="jf-stat-card">
                    <span className="jf-stat-chip jf-stat-chip--cyan"><Download size={14} weight="fill" /></span>
                    <strong>{stats?.downloaded ?? 0}</strong>
                    <span>Descargas</span>
                  </div>
                </div>

                {/* Discord Card */}
                {user.discord && (
                  <div className="jf-discord-panel" style={{ marginTop: 0 }}>
                    <span className="jf-discord-chip"><DiscordLogo size={20} weight="fill" /></span>
                    <div className="jf-discord-info">
                      <p className="jf-discord-name">{user.discord.display_name}</p>
                      <p className="jf-discord-tag">@{user.discord.user_name} · Discord</p>
                    </div>
                  </div>
                )}

                {/* Historial button */}
                <Button variant="glass" size="md" onClick={() => ui.open('history', { username: user.username })} style={{ width: '100%' }}>
                  <ClockCounterClockwise size={16} /> Ver Historial Completo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
