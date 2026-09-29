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
  ShareNetwork,
  Desktop,
  DeviceMobile,
  Globe,
  GameController,
} from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { useUiStore } from '../../store/ui.store';
import { useToastStore } from '../../store/toast.store';
import { fetchCommunityUsers, fetchListeningStats, fetchTopSongs } from '../../services/users.service';
import { fetchLanyardProfile } from '../../services/social.service';
import { useLibraryStore } from '../../store/library.store';
import { usePlayerStore } from '../../store/player.store';
import { useSession } from '../../context/SessionContext';
import { playSong } from '../../services/player.service';
import { timeAgo, resolveAvatarSrc, calculateMelomanoLevel } from '../../lib/utils';
import { statusView, jfIsOnline, presenceLabel } from '../../lib/status';
import { useSongCoverGradient } from '../../lib/colorExtractor';
import { AnthemCard } from './AnthemCard';
import type { CommunityUser } from '../../lib/types';

export function UserDetailModal() {
  const ui = useUiStore();
  const toast = useToastStore();
  const { session } = useSession();
  const librarySongs = useLibraryStore((s) => s.songs);

  const [user, setUser] = useState<CommunityUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ liked: number; played: number; downloaded: number } | null>(null);
  const [topSongs, setTopSongs] = useState<Array<{ song_name: string; count: number }>>([]);
  const [now, setNow] = useState(() => Date.now());
  const [particles, setParticles] = useState<Array<{ id: number; emoji: string; x: number }>>([]);

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

  const sendReaction = (emoji: string, label: string) => {
    const id = Date.now() + Math.random();
    setParticles((p) => [...p, { id, emoji, x: Math.random() * 70 + 15 }]);
    setTimeout(() => {
      setParticles((p) => p.filter((x) => x.id !== id));
    }, 1200);
    toast.show(
      `¡Has enviado ${emoji} ${label} a ${user?.display_name || user?.username}!`,
      'success',
      2200,
    );
  };

  const copyProfileLink = () => {
    if (!user) return;
    navigator.clipboard.writeText(`jodify://user/${user.username}`);
    toast.show('¡Enlace de perfil copiado al portapapeles!', 'info', 2000);
  };

  const anthemCoverGradient = useSongCoverGradient(anthemSong);

  const profileShellStyle = useMemo(() => {
    if (!user) return undefined;
    if (user.profile_bg_mode === 'anthem_cover' && anthemSong) {
      return {
        background: anthemCoverGradient.cardStyle.background,
        borderColor: anthemCoverGradient.cardStyle.borderColor,
        boxShadow: `0 16px 44px -8px ${anthemCoverGradient.glowColor}`,
        '--jf-grad-start': anthemCoverGradient.primary,
        '--jf-grad-end': anthemCoverGradient.secondary,
      } as React.CSSProperties;
    }
    if (user.profile_bg_mode === 'gradient' && user.custom_gradient_start && user.custom_gradient_end) {
      return {
        background: `linear-gradient(135deg, ${user.custom_gradient_start} 0%, ${user.custom_gradient_end} 100%)`,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        boxShadow: `0 16px 44px -8px ${user.custom_gradient_start}66`,
        '--jf-grad-start': user.custom_gradient_start,
        '--jf-grad-end': user.custom_gradient_end,
      } as React.CSSProperties;
    }
    return undefined;
  }, [user, anthemSong, anthemCoverGradient]);

  const shellClass = useMemo(() => {
    if (!user) return '';
    if (user.profile_bg_mode === 'gradient') return 'jf-profile-shell--gradient';
    if (user.profile_bg_mode === 'anthem_cover') return 'jf-profile-shell--anthem';
    return user.theme ? `theme--${user.theme}` : 'theme--aurora';
  }, [user]);

  const frameClass = user?.avatar_frame && user.avatar_frame !== 'none' ? `jf-avatar-frame--${user.avatar_frame}` : '';
  const avatarSrc = resolveAvatarSrc(user);

  return (
    <Modal name="userDetail" title="Inspeccionar Perfil" width={880} className="jf-modal--profile">
      {loading || !user ? (
        <div className="jf-profile-loading">
          <Spinner size={24} />
        </div>
      ) : (
        <div className={`jf-profile-shell ${shellClass}`} style={profileShellStyle}>
          {/* Partículas de Reacción Flotantes */}
          {particles.map((pt) => (
            <span
              key={pt.id}
              className="jf-kudos-particle"
              style={{ left: `${pt.x}%`, top: '40%' }}
            >
              {pt.emoji}
            </span>
          ))}

          <div className="jf-profile-banner" aria-hidden="true">
            {user.profile_effect && user.profile_effect !== 'none' && (
              <div className={`jf-profile-effect-layer jf-profile-effect--${user.profile_effect}`} />
            )}
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
                    <button
                      type="button"
                      className="jf-anthem-icon-btn"
                      style={{ width: '28px', height: '28px', marginLeft: '6px' }}
                      onClick={copyProfileLink}
                      title="Compartir perfil"
                    >
                      <ShareNetwork size={14} />
                    </button>
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
                      Rango Nivel {melomano.level} • {melomano.listenedHours > 0 ? `${melomano.listenedHours}h de escucha` : `${melomano.listenedMinutes}m de escucha`}
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

            {/* PROMINENTE TIEMPO TOTAL ESCUCHADO HERO CARD */}
            <div className="jf-listening-hero-card" style={{ margin: '14px 0 6px 0' }}>
              <div className="jf-listening-hero-top">
                <div className="jf-listening-hero-badge-group">
                  <div className="jf-listening-gold-icon">
                    <ClockCounterClockwise size={26} weight="fill" />
                  </div>
                  <div className="jf-listening-hero-headings">
                    <span className="jf-listening-hero-label">
                      <Sparkle size={12} weight="fill" /> Horas Totales Escuchadas
                    </span>
                    <span className="jf-listening-hero-hours">
                      {melomano.listenedHours > 0 ? (
                        <>
                          {melomano.listenedHours} <span style={{ fontSize: '15px', fontWeight: 600 }}>Horas</span> {melomano.listenedMinutes % 60} <span style={{ fontSize: '15px', fontWeight: 600 }}>Min</span>
                        </>
                      ) : (
                        <>
                          {melomano.listenedMinutes} <span style={{ fontSize: '15px', fontWeight: 600 }}>Minutos</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="jf-melomano-title" style={{ justifyContent: 'flex-end', fontSize: '13px' }}>
                    {melomano.badgeEmoji} Rango Nivel {melomano.level}
                  </span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', display: 'block', marginTop: '2px' }}>
                    {melomano.title} • {stats?.played ?? 0} reproducciones
                  </span>
                </div>
              </div>

              <div className="jf-listening-hero-progress-section">
                <div className="jf-listening-hero-bar">
                  <div
                    className="jf-listening-hero-fill"
                    style={{ width: `${melomano.progressPercent}%` }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                  <span>{melomano.currentXp} XP Acumulados</span>
                  <span>{melomano.nextLevelXp - melomano.currentXp} XP para Nivel {melomano.level + 1}</span>
                </div>
              </div>
            </div>

            {/* Barra Interactiva de Reacciones Sociales / Kudos */}
            <div className="jf-kudos-bar">
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
                Reaccionar a este perfil:
              </span>
              <button type="button" className="jf-kudos-btn" onClick={() => sendReaction('🔥', 'Respeto Sonoro')}>
                🔥 Fuego
              </button>
              <button type="button" className="jf-kudos-btn" onClick={() => sendReaction('💎', 'Buen Gusto')}>
                💎 Joya Musical
              </button>
              <button type="button" className="jf-kudos-btn" onClick={() => sendReaction('🎧', 'Respeto Hi-Fi')}>
                🎧 Audiófilo
              </button>
              <button type="button" className="jf-kudos-btn" onClick={() => sendReaction('❤️', 'Favorito')}>
                ❤️ Amor
              </button>
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
                        <p className="jf-showcase-song-artist">Reproduciendo actualmente en JodiFy</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          className="jf-tune-in-btn"
                          onClick={() => void playTheirSong()}
                          title="Sintonizar y escuchar esta misma canción"
                        >
                          <Sparkle size={13} weight="fill" />
                          <span>Sintonizar</span>
                        </button>
                        <button
                          type="button"
                          className="jf-showcase-play-btn"
                          onClick={() => void playTheirSong()}
                          title="Reproducir canción"
                        >
                          <Play size={16} weight="fill" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Himno Personal con Gradiente Dinámico de Portada */}
                {anthemSong && (
                  <AnthemCard
                    song={anthemSong}
                    isPlaying={myIsPlaying && myCurrentSong?.name === anthemSong.name}
                    onPlay={() => void playAnthem()}
                    isOwnProfile={false}
                    titlePrefix={`Himno de ${user.display_name || user.username}`}
                  />
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
                {/* Métricas con tiempo de escucha */}
                <div className="jf-profile-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <div className="jf-stat-card">
                    <span className="jf-stat-chip jf-stat-chip--pink"><Heart size={14} weight="fill" /></span>
                    <strong>{stats?.liked ?? 0}</strong>
                    <span>Likes</span>
                  </div>
                  <div className="jf-stat-card">
                    <span className="jf-stat-chip jf-stat-chip--violet"><MusicNotes size={14} weight="fill" /></span>
                    <strong>{stats?.played ?? 0}</strong>
                    <span>Canciones</span>
                  </div>
                  <div className="jf-stat-card">
                    <span className="jf-stat-chip jf-stat-chip--cyan"><ClockCounterClockwise size={14} weight="bold" /></span>
                    <strong>{melomano.listenedHours > 0 ? `${melomano.listenedHours}h` : `${melomano.listenedMinutes}m`}</strong>
                    <span>Escucha</span>
                  </div>
                  <div className="jf-stat-card">
                    <span className="jf-stat-chip jf-stat-chip--cyan"><Download size={14} weight="fill" /></span>
                    <strong>{stats?.downloaded ?? 0}</strong>
                    <span>Descargas</span>
                  </div>
                </div>

                {/* Discord Rich Presence Card */}
                {user.discord && (
                  <div className="jf-discord-rich-card" style={{ marginTop: 0 }}>
                    <div className="jf-discord-rich-header">
                      <div className="jf-discord-rich-user">
                        <DiscordLogo size={20} weight="fill" style={{ color: '#5865f2' }} />
                        <div>
                          <p className="jf-discord-name" style={{ fontSize: '13px', margin: 0, fontWeight: 700 }}>{user.discord.display_name}</p>
                          <p className="jf-discord-tag" style={{ margin: 0, fontSize: '11px' }}>@{user.discord.user_name} · {presenceLabel(user.discord.presence ?? 'online')}</p>
                        </div>
                      </div>
                      {user.show_discord_activity !== false && user.discord.devices && (
                        <div className="jf-discord-rich-devices">
                          {user.discord.devices.desktop && <span className="jf-device-badge" title="Activo en Discord PC"><Desktop size={13} /></span>}
                          {user.discord.devices.mobile && <span className="jf-device-badge" title="Activo en Discord Móvil"><DeviceMobile size={13} /></span>}
                          {user.discord.devices.web && <span className="jf-device-badge" title="Activo en Discord Web"><Globe size={13} /></span>}
                        </div>
                      )}
                    </div>

                    {user.show_discord_activity !== false && user.discord.custom_status?.text && (
                      <div className="jf-discord-custom-status-row">
                        {user.discord.custom_status.emoji?.name && <span>{user.discord.custom_status.emoji.name}</span>}
                        <span style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          "{user.discord.custom_status.text}"
                        </span>
                      </div>
                    )}

                    {user.show_discord_activity !== false && user.discord.activity && (
                      <div className="jf-discord-activity-section">
                        <GameController size={18} weight="fill" style={{ color: '#a5b4fc', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span className="jf-discord-act-badge">Actividad / Juego</span>
                          <p style={{ margin: '1px 0 0', fontSize: '12px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.discord.activity.name}
                          </p>
                          {user.discord.activity.details && (
                            <p style={{ margin: 0, fontSize: '10.5px', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {user.discord.activity.details}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {user.show_discord_activity !== false && user.discord.spotify && (
                      <div className="jf-discord-activity-section is-spotify" style={{ marginTop: '6px' }}>
                        <MusicNotes size={18} weight="fill" style={{ color: '#1ed760', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span className="jf-discord-act-badge is-spotify">Escuchando en Spotify</span>
                          <p style={{ margin: '1px 0 0', fontSize: '12px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.discord.spotify.song}
                          </p>
                          <p style={{ margin: 0, fontSize: '10.5px', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.discord.spotify.artist}
                          </p>
                        </div>
                      </div>
                    )}
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
