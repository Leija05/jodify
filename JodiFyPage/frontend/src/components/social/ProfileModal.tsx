import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Play,
  Download,
  Export,
  SignOut,
  DiscordLogo,
  LinkSimple,
  LinkBreak,
  ClockCounterClockwise,
  PaintBrush,
  Check,
  Sparkle,
  UserCircle,
  FloppyDisk,
  UploadSimple,
  Trash,
  Link,
  Fire,
  Image as ImageIcon,
  IdentificationCard,
  Gear,
  MusicNotes,
} from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { useSession } from '../../context/SessionContext';
import { useUiStore } from '../../store/ui.store';
import { useLibraryStore } from '../../store/library.store';
import { useToastStore } from '../../store/toast.store';
import { fetchListeningStats, fetchTopSongs, usersService } from '../../services/users.service';
import { fetchLanyardProfile } from '../../services/social.service';
import { downloadJson, getSongCoverCandidates, calculateMelomanoLevel } from '../../lib/utils';
import { statusView } from '../../lib/status';
import { usePlayerStore } from '../../store/player.store';
import { playSong } from '../../services/player.service';
import { SongCover } from '../ui/SongCover';
import type { DiscordProfile, UserAccess } from '../../lib/types';

export const PROFILE_THEMES = [
  { id: 'aurora', label: 'Aurora Boreal', color: 'linear-gradient(135deg, #00f0ff, #7f00ff)' },
  { id: 'cyberpunk', label: 'Cyberpunk 2077', color: 'linear-gradient(135deg, #ffee00, #ff0077)' },
  { id: 'synthwave', label: 'Retro Synthwave', color: 'linear-gradient(135deg, #ff2a85, #00f0ff)' },
  { id: 'crimson', label: 'Blood Moon', color: 'linear-gradient(135deg, #ff0044, #88001b)' },
  { id: 'gold', label: 'Royal Gold', color: 'linear-gradient(135deg, #ffd700, #ff8800)' },
  { id: 'matrix', label: 'Matrix Emerald', color: 'linear-gradient(135deg, #00ff66, #00441b)' },
  { id: 'midnight', label: 'Obsidian Star', color: 'linear-gradient(135deg, #333344, #050505)' },
  { id: 'sunset', label: 'Sunset Chill', color: 'linear-gradient(135deg, #ff7700, #ff0077)' },
] as const;

export const AVATAR_FRAMES = [
  { id: 'none', label: 'Sin marco', color: 'transparent' },
  { id: 'neon_cyan', label: 'Anillo Neón Cian', color: '#00f0ff' },
  { id: 'fire_aura', label: 'Aura de Fuego', color: '#ff5500' },
  { id: 'cyber_glitch', label: 'Cyber Glitch', color: '#ffee00' },
  { id: 'golden_crest', label: 'Corona de Oro', color: '#ffd700' },
  { id: 'rainbow_prism', label: 'Prisma Tornasol', color: 'linear-gradient(90deg, red, yellow, cyan, violet)' },
  { id: 'cosmic_void', label: 'Vórtice Cósmico', color: '#c084fc' },
  { id: 'matrix_emerald', label: 'Esmeralda Matrix', color: '#00ff66' },
  { id: 'rgb_soundwave', label: 'Onda RGB', color: '#ff0077' },
] as const;

export const PROFILE_BADGES = [
  'Audiófilo Hi-Fi 🎧',
  'DJ de la Comunidad 🎛️',
  'Noctámbulo Musical 🌙',
  'Coleccionista Legendario 💎',
  'Pionero JodiFy ⚡',
  'Vibes Infinitas 🌊',
  'Maestro del Vinilo 📻',
  'Cyber Beats 🤖',
] as const;

export const VIBE_PRESETS = [
  '⚡ A tope de ritmo',
  '🌙 Modo Chill & Relax',
  '💻 En la zona de código',
  '🎧 Hi-Fi Frequencies',
  '🔥 Modo Bestia / Gym',
  '🌧️ Lluvia & Nostalgia',
  '🌌 Viaje Cósmico',
  '☕ Café & Acústico',
] as const;

export const AVATAR_PRESETS = [
  { id: 'neon_dj', name: 'Cyber DJ', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=240&auto=format&fit=crop&q=80' },
  { id: 'lofi_girl', name: 'Lo-Fi Chill', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80' },
  { id: 'synth_astronaut', name: 'Synth Astronaut', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80' },
  { id: 'vinyl_collector', name: 'Vinyl Collector', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80' },
  { id: 'daft_helm', name: 'Daft Helmet', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80' },
  { id: 'cyber_headphones', name: 'Hi-Fi Gold', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=240&auto=format&fit=crop&q=80' },
  { id: 'cosmic_night', name: 'Cosmic Violet', url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=240&auto=format&fit=crop&q=80' },
  { id: 'matrix_neon', name: 'Matrix Green', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=240&auto=format&fit=crop&q=80' },
];

export function ProfileModal() {
  const { session, logout, updateSessionProfile } = useSession();
  const ui = useUiStore();
  const toast = useToastStore();
  const librarySongs = useLibraryStore((s) => s.songs);

  const [activeTab, setActiveTab] = useState<'showcase' | 'avatar' | 'style' | 'identity' | 'account'>('showcase');
  const [profile, setProfile] = useState<UserAccess | null>(null);
  const [discord, setDiscord] = useState<DiscordProfile | null>(null);
  const [stats, setStats] = useState<{ liked: number; played: number; downloaded: number } | null>(null);
  const [topSongs, setTopSongs] = useState<Array<{ song_name: string; count: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Personalization Edit State
  const [avatarSource, setAvatarSource] = useState<'custom' | 'discord' | 'initials'>('custom');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('aurora');
  const [selectedFrame, setSelectedFrame] = useState('none');
  const [displayName, setDisplayName] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('Audiófilo Hi-Fi 🎧');
  const [vibeText, setVibeText] = useState('⚡ A tope de ritmo');
  const [anthemSongId, setAnthemSongId] = useState<string | number | ''>('');
  const [bioText, setBioText] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [profileData, statsData, topSongsData] = await Promise.all([
        usersService.fetchProfile(session.username).catch(() => null),
        fetchListeningStats(session.username).catch(() => null),
        fetchTopSongs(session.username, 3).catch(() => []),
      ]);
      setProfile(profileData);
      setStats(statsData);
      setTopSongs(topSongsData);

      if (profileData) {
        setAvatarSource(profileData.avatar_source || 'custom');
        setAvatarUrl(profileData.avatar_url || '');
        setInputUrl(profileData.avatar_url || '');
        setSelectedTheme(profileData.theme || 'aurora');
        setSelectedFrame(profileData.avatar_frame || 'none');
        setDisplayName(profileData.display_name || '');
        setSelectedBadge(profileData.custom_badge || 'Audiófilo Hi-Fi 🎧');
        setVibeText(profileData.vibe || '⚡ A tope de ritmo');
        setAnthemSongId(profileData.anthem_song_id ?? '');
        setBioText(profileData.bio || '');
      }

      if (profileData?.discord_id) {
        setDiscord(await fetchLanyardProfile(profileData.discord_id));
      } else {
        setDiscord(null);
      }
    } finally {
      setLoading(false);
    }
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
  const melomano = useMemo(() => calculateMelomanoLevel(stats), [stats]);

  // Compute what avatar to display currently in live preview
  const previewAvatarSrc = useMemo(() => {
    if (avatarSource === 'discord') {
      return discord?.avatar_url || avatarUrl || null;
    }
    if (avatarSource === 'initials') {
      return null;
    }
    return avatarUrl || discord?.avatar_url || null;
  }, [avatarSource, avatarUrl, discord]);

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
    downloadJson(`jodify-profile-${session.username}.json`, {
      username: session.username,
      display_name: displayName,
      role: session.role,
      bio: bioText,
      theme: selectedTheme,
      frame: selectedFrame,
      vibe: vibeText,
      avatar_source: avatarSource,
      avatar_url: avatarUrl,
      level: melomano.level,
      rank: melomano.title,
      xp: melomano.currentXp,
      likedSongs: useLibraryStore.getState().likedIds.length,
      likes: stats.liked,
      played: stats.played,
      downloads: stats.downloaded,
      discord: discord?.discord_id ?? null,
      exportedAt: new Date().toISOString(),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.8 * 1024 * 1024) {
      toast.show('La imagen seleccionada supera los 2.8 MB. Elige una más liviana.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarUrl(dataUrl);
      setInputUrl('');
      setAvatarSource('custom');
      toast.show('¡Foto cargada! Haz clic en "Guardar Cambios" para confirmar.', 'info', 2500);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      toast.show('Ingresa una URL válida de imagen', 'warning');
      return;
    }
    setAvatarUrl(trimmed);
    setAvatarSource('custom');
    toast.show('URL de avatar asignada. Recuerda guardar cambios.', 'info', 2500);
  };

  const handleSelectPreset = (url: string) => {
    setAvatarUrl(url);
    setAvatarSource('custom');
    toast.show('Avatar seleccionado. Recuerda guardar cambios.', 'info', 2000);
  };

  const handleClearCustomAvatar = () => {
    setAvatarUrl('');
    setInputUrl('');
    setAvatarSource(discord ? 'discord' : 'initials');
    toast.show('Foto personalizada eliminada', 'info', 2000);
  };

  const handleSaveCustomization = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const anthemSong = librarySongs.find((s) => String(s.id) === String(anthemSongId));
      const payload = {
        display_name: displayName.trim() ? displayName.trim() : null,
        avatar_url: avatarUrl.trim() ? avatarUrl.trim() : null,
        avatar_source: avatarSource,
        theme: selectedTheme,
        avatar_frame: selectedFrame,
        custom_badge: selectedBadge ? selectedBadge.trim() : null,
        vibe: vibeText.trim() ? vibeText.trim() : null,
        bio: bioText.trim(),
        anthem_song_id: anthemSongId ? anthemSongId : null,
        anthem_song_name: anthemSong?.name ? anthemSong.name : null,
      };

      const updated = await usersService.updateProfile(session.username, payload);

      setProfile(updated);
      setDisplayName(updated.display_name || '');
      setAvatarUrl(updated.avatar_url || '');
      setAvatarSource(updated.avatar_source || 'custom');
      setSelectedTheme(updated.theme || 'aurora');
      setSelectedFrame(updated.avatar_frame || 'none');
      setSelectedBadge(updated.custom_badge || 'Audiófilo Hi-Fi 🎧');
      setVibeText(updated.vibe || '⚡ A tope de ritmo');
      setAnthemSongId(updated.anthem_song_id ?? '');
      setBioText(updated.bio || '');

      updateSessionProfile({
        display_name: updated.display_name,
        avatar_url: updated.avatar_url,
        avatar_source: updated.avatar_source,
        avatar_frame: updated.avatar_frame,
      });

      toast.show('¡Perfil actualizado y guardado correctamente!', 'success', 2500);
      setActiveTab('showcase');
    } catch {
      toast.show('No se pudo guardar la personalización', 'error');
    } finally {
      setSaving(false);
    }
  };

  const anthemSong = useMemo(() => {
    const id = profile?.anthem_song_id ?? anthemSongId;
    return librarySongs.find((s) => String(s.id) === String(id)) ?? null;
  }, [profile?.anthem_song_id, anthemSongId, librarySongs]);

  const playAnthem = async () => {
    if (!anthemSong) return;
    await playSong(anthemSong);
    usePlayerStore.getState().setIsPlaying(true);
    toast.show(`Reproduciendo tu himno: "${anthemSong.name}"`, 'info', 2000);
  };

  const playTopSong = async (songName: string) => {
    const song = librarySongs.find((s) => s.name.toLowerCase() === songName.toLowerCase());
    if (song) {
      await playSong(song);
      usePlayerStore.getState().setIsPlaying(true);
    }
  };

  const cover = useMemo(
    () => (currentSong ? getSongCoverCandidates(currentSong as unknown as Record<string, unknown>)[0] ?? '/assets/default-cover.png' : null),
    [currentSong],
  );

  return (
    <Modal name="profile" title="Estudio de Perfil" width={880} className="jf-modal--profile">
      {loading || !profile ? (
        <div className="jf-profile-loading">
          <Spinner size={24} />
        </div>
      ) : (
        <div className={`jf-profile-shell theme--${selectedTheme}`}>
          <div className="jf-profile-banner" aria-hidden="true">
            <span className="jf-profile-orb jf-profile-orb--a" />
            <span className="jf-profile-orb jf-profile-orb--b" />
          </div>

          <div className="jf-profile">
            {/* Sub-navegación estilo Steam Studio (Sin scroll horizontal) */}
            <div className="jf-profile-mode-nav">
              <button
                type="button"
                className={`jf-profile-mode-btn ${activeTab === 'showcase' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('showcase')}
              >
                <UserCircle size={16} /> Mi Perfil
              </button>
              <button
                type="button"
                className={`jf-profile-mode-btn ${activeTab === 'avatar' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('avatar')}
              >
                <ImageIcon size={16} /> Foto y Avatar
              </button>
              <button
                type="button"
                className={`jf-profile-mode-btn ${activeTab === 'style' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('style')}
              >
                <PaintBrush size={16} /> Temas y Marcos
              </button>
              <button
                type="button"
                className={`jf-profile-mode-btn ${activeTab === 'identity' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('identity')}
              >
                <IdentificationCard size={16} /> Identidad y Vibe
              </button>
              <button
                type="button"
                className={`jf-profile-mode-btn ${activeTab === 'account' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('account')}
              >
                <Gear size={16} /> Conexiones y Cuenta
              </button>
            </div>

            {/* LIVE PREVIEW BANNER (Visible en pestañas de personalización) */}
            {activeTab !== 'showcase' && activeTab !== 'account' && (
              <div className="jf-studio-live-preview">
                <div className="jf-profile-banner" aria-hidden="true">
                  <span className="jf-profile-orb jf-profile-orb--a" />
                  <span className="jf-profile-orb jf-profile-orb--b" />
                </div>
                <div className="jf-studio-preview-avatar">
                  <div className={`jf-avatar-frame-wrap ${selectedFrame !== 'none' ? `jf-avatar-frame--${selectedFrame}` : ''}`}>
                    <Avatar
                      username={displayName || profile.username}
                      src={previewAvatarSrc}
                      size={68}
                      presence={discord?.presence ?? (status.jfOnline ? 'online' : 'offline')}
                    />
                  </div>
                </div>
                <div className="jf-studio-preview-details">
                  <div className="jf-studio-preview-name-row">
                    <span className="jf-studio-preview-display">{displayName || profile.username}</span>
                    {displayName && displayName !== profile.username && (
                      <span className="jf-studio-preview-username">@{profile.username}</span>
                    )}
                    <span className={`jf-role-badge jf-role-badge--${profile.role}`}>{profile.role}</span>
                    {selectedBadge && <span className="jf-profile-custom-badge">{selectedBadge}</span>}
                    {vibeText && (
                      <span className="jf-profile-vibe-badge">
                        <Sparkle size={10} weight="fill" /> {vibeText}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                    {bioText ? `"${bioText}"` : 'Sin biografía configurada'}
                  </span>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* TAB 1: MI PERFIL SHOWCASE */}
              {activeTab === 'showcase' && (
                <motion.div
                  key="showcase"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Hero Header Espacioso */}
                  <div className="jf-profile-hero">
                    <div className="jf-profile-hero-left">
                      <div className="jf-profile-hero-avatar">
                        <div className={`jf-avatar-frame-wrap ${selectedFrame !== 'none' ? `jf-avatar-frame--${selectedFrame}` : ''}`}>
                          <Avatar
                            username={displayName || profile.username}
                            src={previewAvatarSrc}
                            size={84}
                            presence={discord?.presence ?? (status.jfOnline ? 'online' : 'offline')}
                          />
                        </div>
                      </div>
                      <div className="jf-profile-hero-info">
                        <div className="jf-profile-hero-name-row">
                          <h3 className="jf-profile-hero-name">{displayName || profile.username}</h3>
                          {displayName && displayName !== profile.username && (
                            <span className="jf-profile-hero-handle">@{profile.username}</span>
                          )}
                        </div>
                        <div className="jf-profile-hero-badges">
                          <span className={`jf-role-badge jf-role-badge--${profile.role}`}>{profile.role}</span>
                          {selectedBadge && (
                            <span className="jf-profile-custom-badge">{selectedBadge}</span>
                          )}
                          {vibeText && (
                            <span className="jf-profile-vibe-badge">
                              <Sparkle size={11} weight="fill" /> {vibeText}
                            </span>
                          )}
                        </div>
                        <div className="jf-status-pills" style={{ marginTop: '2px' }}>
                          <span className={`jf-status-pill jf-status-pill--${status.jfTone}`}>
                            <span className="jf-status-dot" />
                            {status.jfLabel}
                          </span>
                          <span className={`jf-status-pill jf-status-pill--discord jf-status-pill--${discord ? (status.discordTone ?? 'offline') : 'offline'}`}>
                            <DiscordLogo size={12} weight="fill" />
                            {discord ? `Discord: ${status.discordLabel}` : 'Discord sin vincular'}
                          </span>
                        </div>
                        {bioText && (
                          <div className="jf-profile-bio-box" style={{ margin: '4px 0 0 0' }}>
                            "{bioText}"
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
                      {currentSong && isPlaying && (
                        <div className="jf-showcase-card">
                          <div className="jf-showcase-card-header">
                            <span className="jf-pulse-dot" />
                            <span>Escuchando ahora en vivo</span>
                          </div>
                          <div className="jf-showcase-nowplay-body">
                            <div className="jf-showcase-cover-wrap">
                              {cover && <img src={cover} alt="" className="jf-showcase-cover" />}
                              <div className="jf-showcase-eq-overlay">
                                <i /><i /><i /><i />
                              </div>
                            </div>
                            <div className="jf-showcase-nowplay-meta">
                              <h4 className="jf-showcase-song-title">{currentSong.name}</h4>
                              <p className="jf-showcase-song-artist">{currentSong.added_by ? `Por ${currentSong.added_by}` : 'JodiFy'}</p>
                            </div>
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
                              title="Reproducir mi himno"
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
                            <span>Mis canciones más escuchadas</span>
                          </div>
                          <div className="jf-profile-top-songs-list">
                            {topSongs.map((ts, idx) => (
                              <button
                                key={ts.song_name}
                                type="button"
                                className="jf-profile-top-song-item"
                                onClick={() => void playTopSong(ts.song_name)}
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
                      <div className="jf-discord-panel" style={{ marginTop: 0 }}>
                        <span className="jf-discord-chip"><DiscordLogo size={20} weight="fill" /></span>
                        <div className="jf-discord-info">
                          {discord ? (
                            <>
                              <p className="jf-discord-name">{discord.display_name}</p>
                              <p className="jf-discord-tag">@{discord.user_name} · Conectado</p>
                            </>
                          ) : (
                            <>
                              <p className="jf-discord-name">Discord</p>
                              <p className="jf-discord-tag">Sin vincular</p>
                            </>
                          )}
                        </div>
                        <div className="jf-discord-actions">
                          {discord ? (
                            <Button variant="outline" size="sm" onClick={handleLink}>
                              <LinkSimple size={13} /> Cambiar
                            </Button>
                          ) : (
                            <Button variant="primary" size="sm" onClick={handleLink}>
                              <DiscordLogo size={13} weight="fill" /> Vincular
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Acciones Rápidas */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <Button variant="primary" size="md" onClick={() => setActiveTab('style')} style={{ width: '100%' }}>
                          <PaintBrush size={16} /> Personalizar Estilo
                        </Button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <Button variant="glass" size="sm" onClick={() => setActiveTab('avatar')}>
                            <ImageIcon size={14} /> Cambiar Foto
                          </Button>
                          <Button variant="glass" size="sm" onClick={() => ui.open('history', { username: profile.username })}>
                            <ClockCounterClockwise size={14} /> Ver Historial
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: FOTO Y AVATAR */}
              {activeTab === 'avatar' && (
                <motion.div
                  key="avatar"
                  className="jf-profile-editor"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="jf-avatar-studio-section">
                    <label className="jf-profile-editor-label">
                      <span>Origen de la Foto de Perfil</span>
                      <span style={{ fontSize: '11px', color: 'var(--accent)', textTransform: 'none' }}>
                        Elige qué imagen representará tu perfil en toda la comunidad
                      </span>
                    </label>
                    <div className="jf-avatar-source-grid">
                      <button
                        type="button"
                        className={`jf-avatar-source-card ${avatarSource === 'custom' ? 'is-active' : ''}`}
                        onClick={() => setAvatarSource('custom')}
                      >
                        <span className="jf-avatar-source-icon">📁</span>
                        <span className="jf-avatar-source-title">Foto Personal</span>
                        <span className="jf-avatar-source-desc">Sube tu archivo o pega enlace</span>
                        {avatarSource === 'custom' && <Check size={14} weight="bold" />}
                      </button>

                      <button
                        type="button"
                        className={`jf-avatar-source-card ${avatarSource === 'discord' ? 'is-active' : ''}`}
                        onClick={() => {
                          setAvatarSource('discord');
                          if (!discord) {
                            toast.show('Aún no tienes Discord vinculado', 'warning');
                          }
                        }}
                      >
                        <DiscordLogo size={24} weight="fill" style={{ color: '#5865F2' }} />
                        <span className="jf-avatar-source-title">Foto de Discord</span>
                        <span className="jf-avatar-source-desc">Sincronizada con tu cuenta</span>
                        {avatarSource === 'discord' && <Check size={14} weight="bold" />}
                      </button>

                      <button
                        type="button"
                        className={`jf-avatar-source-card ${avatarSource === 'initials' ? 'is-active' : ''}`}
                        onClick={() => setAvatarSource('initials')}
                      >
                        <span className="jf-avatar-source-icon">🔤</span>
                        <span className="jf-avatar-source-title">Iniciales JodiFy</span>
                        <span className="jf-avatar-source-desc">Gradiente tipográfico</span>
                        {avatarSource === 'initials' && <Check size={14} weight="bold" />}
                      </button>
                    </div>

                    {avatarSource === 'discord' && !discord && (
                      <div style={{ padding: '10px 14px', background: 'rgba(88, 101, 242, 0.15)', borderRadius: '8px', border: '1px solid rgba(88, 101, 242, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#c7d2fe' }}>
                          Para usar tu foto de Discord, primero debes vincular tu cuenta de Discord.
                        </span>
                        <Button variant="primary" size="sm" onClick={handleLink}>
                          <DiscordLogo size={14} weight="fill" /> Vincular Ahora
                        </Button>
                      </div>
                    )}
                  </div>

                  {avatarSource === 'custom' && (
                    <>
                      {/* Subir archivo desde PC */}
                      <div className="jf-avatar-studio-section">
                        <label className="jf-profile-editor-label">Opción 1: Subir imagen desde tu equipo (PC)</label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          style={{ display: 'none' }}
                          onChange={handleFileChange}
                        />
                        <div className="jf-avatar-upload-box">
                          <div className="jf-avatar-upload-label" onClick={() => fileInputRef.current?.click()}>
                            <UploadSimple size={20} weight="bold" style={{ color: '#00f0ff' }} />
                            <span>Seleccionar imagen (PNG, JPG, WEBP, GIF hasta 2.8 MB)</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
                              Examinar archivo
                            </Button>
                            {avatarUrl && (
                              <Button variant="danger" size="sm" onClick={handleClearCustomAvatar} title="Quitar foto">
                                <Trash size={14} />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Enlace directo */}
                      <div className="jf-avatar-studio-section">
                        <label className="jf-profile-editor-label">Opción 2: Pegar enlace directo (URL web)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="url"
                            className="jf-input"
                            placeholder="https://ejemplo.com/mi-avatar.png"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleApplyUrl();
                            }}
                          />
                          <Button variant="outline" size="sm" onClick={handleApplyUrl}>
                            <Link size={14} /> Aplicar
                          </Button>
                        </div>
                      </div>

                      {/* Galería de Presets */}
                      <div className="jf-avatar-studio-section">
                        <label className="jf-profile-editor-label">Opción 3: O elige un avatar de la colección JodiFy</label>
                        <div className="jf-avatar-presets-grid">
                          {AVATAR_PRESETS.map((pst) => (
                            <button
                              key={pst.id}
                              type="button"
                              className={`jf-preset-avatar-btn ${avatarUrl === pst.url ? 'is-active' : ''}`}
                              onClick={() => handleSelectPreset(pst.url)}
                              title={pst.name}
                            >
                              <img src={pst.url} alt={pst.name} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Sticky Save Bar */}
                  <div className="jf-studio-sticky-bar">
                    <div className="jf-studio-sticky-info">
                      <Sparkle size={16} weight="fill" style={{ color: '#00f0ff' }} />
                      <span>Cambios listos para guardar en tu perfil</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button variant="glass" size="md" onClick={() => setActiveTab('showcase')}>
                        Volver a Mi Perfil
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        disabled={saving}
                        onClick={() => void handleSaveCustomization()}
                      >
                        {saving ? <Spinner size={16} /> : <FloppyDisk size={16} weight="bold" />}
                        <span>Guardar Cambios</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: ESTILO Y MARCOS */}
              {activeTab === 'style' && (
                <motion.div
                  key="style"
                  className="jf-profile-editor"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Selector de Temas */}
                  <div className="jf-profile-editor-field">
                    <label className="jf-profile-editor-label">Tema y Fondo de Perfil Steam</label>
                    <div className="jf-profile-theme-grid">
                      {PROFILE_THEMES.map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          className={`jf-profile-theme-card ${selectedTheme === th.id ? 'is-active' : ''}`}
                          onClick={() => setSelectedTheme(th.id)}
                        >
                          <span className="jf-theme-swatch" style={{ background: th.color }} />
                          <span>{th.label}</span>
                          {selectedTheme === th.id && <Check size={12} weight="bold" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selector de Marcos de Avatar Animados */}
                  <div className="jf-profile-editor-field">
                    <label className="jf-profile-editor-label">Marco de Avatar Animado (Efecto Steam)</label>
                    <div className="jf-profile-frame-grid">
                      {AVATAR_FRAMES.map((fr) => (
                        <button
                          key={fr.id}
                          type="button"
                          className={`jf-profile-frame-card ${selectedFrame === fr.id ? 'is-active' : ''}`}
                          onClick={() => setSelectedFrame(fr.id)}
                        >
                          <span
                            className="jf-frame-mini-dot"
                            style={{
                              background: fr.color,
                              border: fr.id === 'none' ? '1px dashed #666' : 'none',
                            }}
                          />
                          <span>{fr.label}</span>
                          {selectedFrame === fr.id && <Check size={12} weight="bold" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selector de Insignia */}
                  <div className="jf-profile-editor-field">
                    <label className="jf-profile-editor-label">Insignia Destacada</label>
                    <select
                      className="jf-select"
                      value={selectedBadge}
                      onChange={(e) => setSelectedBadge(e.target.value)}
                    >
                      {PROFILE_BADGES.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sticky Save Bar */}
                  <div className="jf-studio-sticky-bar">
                    <div className="jf-studio-sticky-info">
                      <Sparkle size={16} weight="fill" style={{ color: '#00f0ff' }} />
                      <span>Tema y marco seleccionados listos para guardar</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button variant="glass" size="md" onClick={() => setActiveTab('showcase')}>
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        disabled={saving}
                        onClick={() => void handleSaveCustomization()}
                      >
                        {saving ? <Spinner size={16} /> : <FloppyDisk size={16} weight="bold" />}
                        <span>Guardar Cambios</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: IDENTIDAD Y VIBE */}
              {activeTab === 'identity' && (
                <motion.div
                  key="identity"
                  className="jf-profile-editor"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Nombre Visible */}
                  <div className="jf-profile-editor-field">
                    <label className="jf-profile-editor-label">Apodo / Nombre Visible</label>
                    <input
                      type="text"
                      className="jf-input"
                      placeholder={`Ej: ${session?.username || 'Mi Nombre'}`}
                      maxLength={28}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Tu nombre de usuario para iniciar sesión seguirá siendo @{session?.username}.
                    </span>
                  </div>

                  {/* Vibe Musical */}
                  <div className="jf-profile-editor-field">
                    <label className="jf-profile-editor-label">
                      <span>Vibe Musical del Momento</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'none' }}>
                        Aparecerá junto a tu nombre en la comunidad
                      </span>
                    </label>
                    <div className="jf-vibe-grid">
                      {VIBE_PRESETS.map((vb) => (
                        <button
                          key={vb}
                          type="button"
                          className={`jf-vibe-chip ${vibeText === vb ? 'is-active' : ''}`}
                          onClick={() => setVibeText(vb)}
                        >
                          <span>{vb}</span>
                          {vibeText === vb && <Check size={11} weight="bold" />}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      className="jf-input"
                      style={{ marginTop: '6px' }}
                      placeholder="O escribe tu propio estado o vibe..."
                      maxLength={40}
                      value={vibeText}
                      onChange={(e) => setVibeText(e.target.value)}
                    />
                  </div>

                  {/* Himno Personal */}
                  <div className="jf-profile-editor-field">
                    <label className="jf-profile-editor-label">Himno Personal (Tu rolón insignia)</label>
                    <select
                      className="jf-select"
                      value={anthemSongId}
                      onChange={(e) => setAnthemSongId(e.target.value)}
                    >
                      <option value="">(Sin canción insignia)</option>
                      {librarySongs.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.added_by ? `— ${s.added_by}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Biografía / Cita */}
                  <div className="jf-profile-editor-field">
                    <label className="jf-profile-editor-label">Biografía o Lema Personal</label>
                    <textarea
                      className="jf-profile-bio-textarea"
                      placeholder="Escribe tu lema, tus géneros favoritos o una frase que te represente..."
                      maxLength={160}
                      value={bioText}
                      onChange={(e) => setBioText(e.target.value)}
                    />
                    <span className="jf-profile-char-count">{bioText.length}/160 caracteres</span>
                  </div>

                  {/* Sticky Save Bar */}
                  <div className="jf-studio-sticky-bar">
                    <div className="jf-studio-sticky-info">
                      <Sparkle size={16} weight="fill" style={{ color: '#00f0ff' }} />
                      <span>Identidad lista para guardar</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button variant="glass" size="md" onClick={() => setActiveTab('showcase')}>
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        disabled={saving}
                        onClick={() => void handleSaveCustomization()}
                      >
                        {saving ? <Spinner size={16} /> : <FloppyDisk size={16} weight="bold" />}
                        <span>Guardar Cambios</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 5: CUENTA Y DATOS */}
              {activeTab === 'account' && (
                <motion.div
                  key="account"
                  className="jf-profile-editor"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="jf-discord-panel">
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
                          <p className="jf-discord-tag">Conéctalo para sincronizar tu avatar y presencia en vivo</p>
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
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff' }}>Exportar mis Estadísticas</p>
                        <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Descarga tus métricas de reproducción y perfil en formato JSON</p>
                      </div>
                      <Button variant="glass" size="sm" onClick={handleExport}>
                        <Export size={14} /> Exportar
                      </Button>
                    </div>

                    <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff' }}>Cerrar Sesión</p>
                        <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Desconecta tu sesión actual en este dispositivo</p>
                      </div>
                      <Button variant="danger" size="sm" onClick={handleLogout}>
                        <SignOut size={14} /> Salir
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </Modal>
  );
}
