import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  Heart,
  Queue,
  FolderPlus,
  Sparkle,
  MusicNotes,
  Clock,
  Flame,
  MagnifyingGlass,
  Plus,
  ShareNetwork,
  SquaresFour,
  ListBullets,
  Users,
  ClockCounterClockwise,
  GearSix,
  TerminalWindow,
  DotsThreeVertical,
  Trash,
  User,
  Disc,
} from '@phosphor-icons/react';
import { usePlayerStore } from '../../store/player.store';
import { useLibraryStore } from '../../store/library.store';
import { useQueueStore } from '../../store/queue.store';
import { usePlaylistsStore } from '../../store/playlists.store';
import { useUiStore } from '../../store/ui.store';
import { useContextMenuStore } from '../../store/contextmenu.store';
import { useToastStore } from '../../store/toast.store';
import { useSongCoverGradient } from '../../lib/colorExtractor';
import { playSong } from '../../services/player.service';
import { toggleLikeCurrent } from '../../services/player-shortcuts';
import { likesService } from '../../services/social.service';
import { useIsAdmin, useIsDev, useSession } from '../../context/SessionContext';
import { formatTime, resolveMediaUrl, resolveAvatarSrc } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { SongRow } from '../player/SongRow';
import type { Song } from '../../lib/types';

export function HomeShowcaseView() {
  const { session } = useSession();
  const isAdmin = useIsAdmin();
  const isDev = useIsDev();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const songs = useLibraryStore((s) => s.songs);
  const likedIds = useLibraryStore((s) => s.likedIds);
  const playlists = usePlaylistsStore((s) => s.playlists);
  const playPlaylist = usePlaylistsStore((s) => s.playPlaylist);
  const deletePlaylist = usePlaylistsStore((s) => s.deletePlaylist);
  const openContextMenu = useContextMenuStore((s) => s.show);
  const ui = useUiStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'liked' | 'recent'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modo de vista para canciones: 'grid' (cuadros grandes) o 'list' (lista compacta)
  const [songViewMode, setSongViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('jf_home_song_view') as 'grid' | 'list') || 'grid';
  });

  // Modo de vista para playlists: 'grid' (tarjetas) o 'list' (lista)
  const [playlistViewMode, setPlaylistViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('jf_home_playlist_view') as 'grid' | 'list') || 'grid';
  });

  // Agrupación de canciones: 'none' (plana / todas) | 'artist' (por artista) | 'album' (por álbum)
  const [groupBy, setGroupBy] = useState<'none' | 'artist' | 'album'>(() => {
    return (localStorage.getItem('jf_home_song_group') as 'none' | 'artist' | 'album') || 'none';
  });

  const toggleSongView = (mode: 'grid' | 'list') => {
    setSongViewMode(mode);
    localStorage.setItem('jf_home_song_view', mode);
  };

  const togglePlaylistView = (mode: 'grid' | 'list') => {
    setPlaylistViewMode(mode);
    localStorage.setItem('jf_home_playlist_view', mode);
  };

  const handleSetGroupBy = (mode: 'none' | 'artist' | 'album') => {
    setGroupBy(mode);
    localStorage.setItem('jf_home_song_group', mode);
  };

  // Gradiente ambiental reactivo a la carátula de la canción que se está reproduciendo
  const gradient = useSongCoverGradient(currentSong);

  // Canción hero destacada: canción actual o la primera con carátula
  const heroSong = useMemo(() => {
    if (currentSong) return currentSong;
    return songs.find((s) => s.cover_url) || songs[0] || null;
  }, [currentSong, songs]);

  const isHeroPlaying = Boolean(currentSong && heroSong && String(currentSong.id) === String(heroSong.id) && isPlaying);
  const isHeroLiked = heroSong ? likedIds.includes(heroSong.id) : false;

  // Filtrado de canciones
  const filteredSongs = useMemo(() => {
    let list = songs;
    if (activeFilter === 'liked') {
      list = list.filter((s) => likedIds.includes(s.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.artist && s.artist.toLowerCase().includes(q)) ||
          (s.album && s.album.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [songs, likedIds, activeFilter, searchQuery]);

  // Agrupación de canciones por artista o álbum
  const groupedSongs = useMemo(() => {
    if (groupBy === 'none') return null;

    const map = new Map<string, Song[]>();
    for (const song of filteredSongs) {
      let key = '';
      if (groupBy === 'artist') {
        key = (song.artist && song.artist.trim()) ? song.artist.trim() : 'Artista Desconocido';
      } else {
        key = (song.album && song.album.trim()) ? song.album.trim() : 'Sencillos & Sin Álbum';
      }
      const list = map.get(key);
      if (list) {
        list.push(song);
      } else {
        map.set(key, [song]);
      }
    }

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredSongs, groupBy]);

  const handlePlayHero = async () => {
    if (!heroSong) return;
    const player = usePlayerStore.getState();
    if (String(player.currentSong?.id) === String(heroSong.id)) {
      player.togglePlay();
      return;
    }
    await playSong(heroSong);
    player.setIsPlaying(true);
  };

  const handlePlayCard = async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    const player = usePlayerStore.getState();
    if (String(player.currentSong?.id) === String(song.id)) {
      player.togglePlay();
      return;
    }
    await playSong(song);
    player.setIsPlaying(true);
  };

  const handleHeroLike = async () => {
    if (!session || !heroSong) return;
    if (String(heroSong.id) === String(currentSong?.id)) {
      await toggleLikeCurrent();
      return;
    }
    const library = useLibraryStore.getState();
    const liked = library.likedIds.includes(heroSong.id);
    library.toggleLikeLocal(heroSong.id, !liked);
    library.bumpLikes(heroSong.id, !liked ? 1 : -1);
    try {
      if (!liked) await likesService.addLike(session.username, heroSong.id);
      else await likesService.removeLike(session.username, heroSong.id);
    } catch {
      useToastStore.getState().show('No se pudo sincronizar el me gusta', 'error');
    }
  };

  const handleContextMenuSong = (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(e.clientX, e.clientY, song);
  };

  const handlePlayGroup = async (groupSongs: Song[], groupName: string) => {
    if (!groupSongs || groupSongs.length === 0) return;
    const [first, ...rest] = groupSongs;
    await playSong(first);
    usePlayerStore.getState().setIsPlaying(true);
    const queue = useQueueStore.getState();
    queue.clear();
    for (const s of rest) {
      queue.add(s);
    }
    useToastStore.getState().show(`Reproduciendo canciones de «${groupName}»`, 'success', 2000);
  };

  // Saludo según la hora
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  // Función para renderizar tarjeta de canción en modo Cuadros Grandes
  const renderSongCard = (song: Song) => {
    const isThisPlaying = Boolean(currentSong && String(currentSong.id) === String(song.id) && isPlaying);
    const isLiked = likedIds.includes(song.id);

    return (
      <motion.div
        key={song.id}
        data-testid={`song-row-${song.id}`}
        className={`jf-song-card ${isThisPlaying ? 'is-playing' : ''}`}
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => handlePlayCard(song, e)}
        onContextMenu={(e) => handleContextMenuSong(e, song)}
        title={`Clic derecho para ver opciones de «${song.name}»`}
      >
        {/* Carátula en grande con overlay */}
        <div className="jf-song-card-cover-wrap">
          {song.cover_url ? (
            <img
              className="jf-song-card-cover"
              src={resolveMediaUrl(song.cover_url)}
              alt={song.name}
              loading="lazy"
            />
          ) : (
            <div className="jf-song-card-cover jf-song-card-cover--placeholder">
              <MusicNotes size={32} weight="duotone" />
            </div>
          )}

          {/* Botón flotante de play en hover */}
          <button
            type="button"
            className="jf-song-card-play-btn"
            onClick={(e) => handlePlayCard(song, e)}
            aria-label={isThisPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isThisPlaying ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
          </button>

          {/* Botón de opciones rápidas (3 puntos) que abre el menú contextual */}
          <button
            type="button"
            className="jf-song-card-menu-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenuSong(e, song);
            }}
            title="Opciones de la canción (clic derecho)"
          >
            <DotsThreeVertical size={16} weight="bold" />
          </button>

          {isThisPlaying && (
            <div className="jf-song-card-wave-indicator">
              <span className="bar-1" />
              <span className="bar-2" />
              <span className="bar-3" />
            </div>
          )}
        </div>

        {/* Metadata de la tarjeta */}
        <div className="jf-song-card-info">
          <h4 className="jf-song-card-title" title={song.name}>
            {song.name}
          </h4>
          <p className="jf-song-card-artist" title={song.artist || 'JodiFy'}>
            {song.artist || 'JodiFy'}
          </p>
          <div className="jf-song-card-footer">
            {song.duration ? (
              <span className="jf-song-card-dur">{formatTime(song.duration)}</span>
            ) : (
              <span className="jf-song-card-dur">Audio</span>
            )}
            {isLiked && <Heart size={13} weight="fill" className="jf-song-card-heart" />}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <section className="jf-home-showcase" data-testid="home-showcase">
      {/* Luz ambiental reactiva a la portada de la canción actual */}
      <div
        className="jf-home-ambient-glow"
        style={{
          background: `radial-gradient(circle at 15% 15%, ${gradient.primary} 0%, transparent 60%), radial-gradient(circle at 85% 35%, ${gradient.secondary} 0%, transparent 55%)`,
        }}
      />

      <div className="jf-home-showcase-scroll">
        {/* ================= BARRA SUPERIOR DE PERFIL DEL USUARIO ================= */}
        <div className="jf-home-user-header">
          <div
            className="jf-home-profile-badge"
            onClick={() => ui.open('profile')}
            role="button"
            tabIndex={0}
            title="Ver y personalizar mi perfil"
          >
            <div className="jf-home-avatar-wrap">
              <Avatar
                username={session?.username ?? 'U'}
                src={resolveAvatarSrc(session)}
                size={44}
                presence="online"
              />
              <span className="jf-home-avatar-ring" />
            </div>

            <div className="jf-home-user-text">
              <div className="jf-home-user-top">
                <span className="jf-home-user-greeting">{greeting},</span>
                <span className="jf-home-user-name">{session?.username ?? 'Usuario'}</span>
                {isAdmin && <span className="jf-role-badge jf-role-badge--admin">Admin</span>}
                {isDev && <span className="jf-role-badge jf-role-badge--dev">Dev</span>}
              </div>
              <span className="jf-home-user-action-hint">Haz clic para ver y personalizar tu perfil</span>
            </div>
          </div>

          {/* Atajos rápidos en cabecera */}
          <div className="jf-home-header-actions">
            <button
              type="button"
              className="jf-btn-header-action"
              onClick={() => ui.open('community')}
              title="Explorar la comunidad"
            >
              <Users size={16} weight="bold" />
              <span>Comunidad</span>
            </button>

            <button
              type="button"
              className="jf-btn-header-action"
              onClick={() => ui.open('history')}
              title="Historial de reproducción"
            >
              <ClockCounterClockwise size={16} weight="bold" />
              <span>Historial</span>
            </button>

            {isDev && (
              <button
                type="button"
                className="jf-btn-header-action jf-btn-header-action--dev"
                onClick={() => ui.open('devCenter')}
                title="Centro de desarrollo"
              >
                <TerminalWindow size={16} weight="bold" />
                <span>Dev</span>
              </button>
            )}

            <button
              type="button"
              className="jf-btn-header-action"
              onClick={() => ui.open('settings')}
              title="Configuración de la app"
            >
              <GearSix size={16} weight="bold" />
            </button>
          </div>
        </div>

        {/* ================= HERO: PORTADA EN GRANDE + DESCRIPCIÓN ================= */}
        {heroSong && (
          <motion.div
            className="jf-hero-featured"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              borderColor: gradient.glowColor || undefined,
              boxShadow: `0 24px 60px -15px ${gradient.glowColor || 'rgba(0,0,0,0.5)'}`,
            }}
            onContextMenu={(e) => handleContextMenuSong(e, heroSong)}
          >
            {/* Portada en grande con efecto vinilo y brillo */}
            <div className="jf-hero-artwork-col">
              <div className="jf-hero-artwork-wrap">
                {heroSong.cover_url ? (
                  <img
                    className="jf-hero-cover-img"
                    src={resolveMediaUrl(heroSong.cover_url)}
                    alt={heroSong.name}
                  />
                ) : (
                  <div className="jf-hero-cover-placeholder">
                    <MusicNotes size={64} weight="duotone" />
                  </div>
                )}
                {/* Overlay de reproducción rápida */}
                <button
                  type="button"
                  className="jf-hero-quickplay-btn"
                  onClick={handlePlayHero}
                  aria-label={isHeroPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isHeroPlaying ? <Pause size={32} weight="fill" /> : <Play size={32} weight="fill" />}
                </button>
              </div>
            </div>

            {/* Detalles y descripción enriquecida */}
            <div className="jf-hero-info-col">
              <div className="jf-hero-badges-row">
                <span className="jf-hero-badge jf-hero-badge--live">
                  <Sparkle size={13} weight="fill" />
                  {isHeroPlaying ? 'Reproduciendo Ahora' : 'Canción Destacada'}
                </span>
                <span className="jf-hero-badge jf-hero-badge--quality">320 KBPS AUDIO MASTER</span>
                {heroSong.duration && (
                  <span className="jf-hero-badge jf-hero-badge--time">
                    <Clock size={12} /> {formatTime(heroSong.duration)}
                  </span>
                )}
              </div>

              <h1 className="jf-hero-title" title={heroSong.name}>
                {heroSong.name}
              </h1>

              <div className="jf-hero-artist-row">
                <span className="jf-hero-artist">{heroSong.artist || 'Artista Desconocido'}</span>
                {heroSong.album && <span className="jf-hero-album">· Álbum: {heroSong.album}</span>}
              </div>

              {/* Descripción enriquecida de la canción */}
              <div className="jf-hero-description-box">
                <p className="jf-hero-description-text">
                  {heroSong.lyrics
                    ? `«${heroSong.lyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim().slice(0, 160)}…»`
                    : `Disfruta de ${heroSong.name} en JodiFy. Canción almacenada en alta fidelidad con ecualización dinámica, sincronización de letras y carátula ambiental.`}
                </p>
                <div className="jf-hero-stats-line">
                  <span>❤️ {heroSong.likes ?? 0} me gusta</span>
                  {heroSong.added_by && <span>Añadida por: <strong>{heroSong.added_by}</strong></span>}
                </div>
              </div>

              {/* Barra de acciones principales de la hero song */}
              <div className="jf-hero-actions-row">
                <button
                  type="button"
                  className="jf-btn jf-btn--primary jf-hero-play-action"
                  onClick={handlePlayHero}
                >
                  {isHeroPlaying ? (
                    <>
                      <Pause size={18} weight="fill" /> Pausar
                    </>
                  ) : (
                    <>
                      <Play size={18} weight="fill" /> Reproducir
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className={`jf-btn-icon ${isHeroLiked ? 'is-liked' : ''}`}
                  onClick={handleHeroLike}
                  title={isHeroLiked ? 'Quitar de favoritas' : 'Me gusta'}
                >
                  <Heart size={18} weight={isHeroLiked ? 'fill' : 'regular'} />
                </button>

                <button
                  type="button"
                  className="jf-btn-icon"
                  onClick={() => {
                    useQueueStore.getState().add(heroSong);
                    useToastStore.getState().show(`«${heroSong.name}» en la cola`, 'info');
                  }}
                  title="Agregar a la cola"
                >
                  <Queue size={18} />
                </button>

                <button
                  type="button"
                  className="jf-btn jf-btn--secondary jf-hero-create-pl-btn"
                  onClick={() => ui.open('createPlaylist', { song: heroSong })}
                  title="Crear una nueva playlist que comience con esta canción"
                >
                  <FolderPlus size={16} weight="bold" /> Crear Playlist
                </button>

                <button
                  type="button"
                  className="jf-btn-icon"
                  onClick={(e) => handleContextMenuSong(e, heroSong)}
                  title="Más opciones (clic derecho)"
                >
                  <ShareNetwork size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= SECCIÓN DE PLAYLISTS EN INICIO ================= */}
        <section className="jf-home-section jf-home-playlists-section">
          <div className="jf-home-section-head">
            <div className="jf-home-section-title-wrap">
              <FolderPlus size={20} weight="fill" className="is-accent-icon" />
              <h2 className="jf-home-section-title">Playlists & Colecciones</h2>
            </div>

            <div className="jf-home-section-right-tools">
              {/* Conmutador de vista de Playlists (Cuadros vs Lista) */}
              <div className="jf-view-mode-switcher">
                <button
                  type="button"
                  className={`jf-view-mode-btn ${playlistViewMode === 'grid' ? 'is-active' : ''}`}
                  onClick={() => togglePlaylistView('grid')}
                  title="Ver en cuadros grandes"
                >
                  <SquaresFour size={16} weight="bold" />
                </button>
                <button
                  type="button"
                  className={`jf-view-mode-btn ${playlistViewMode === 'list' ? 'is-active' : ''}`}
                  onClick={() => togglePlaylistView('list')}
                  title="Ver en lista"
                >
                  <ListBullets size={16} weight="bold" />
                </button>
              </div>

              <button
                type="button"
                className="jf-btn jf-btn--secondary jf-btn--sm"
                onClick={() => ui.open('createPlaylist')}
              >
                <Plus size={14} weight="bold" /> Nueva Playlist
              </button>
            </div>
          </div>

          {playlistViewMode === 'grid' ? (
            /* Modo Cuadros Grandes para Playlists */
            <div className="jf-playlists-cards-grid">
              <div
                className="jf-playlist-card jf-playlist-card--new"
                onClick={() => ui.open('createPlaylist')}
                role="button"
                tabIndex={0}
              >
                <div className="jf-playlist-card-new-icon">
                  <Plus size={28} weight="bold" />
                </div>
                <span className="jf-playlist-card-new-text">Crear Playlist</span>
              </div>

              {playlists.map((pl) => (
                <motion.div
                  key={pl.id}
                  className="jf-playlist-card"
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => playPlaylist(pl.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="jf-playlist-card-cover" style={{ background: pl.color }}>
                    <div className="jf-playlist-card-pattern" />
                    <MusicNotes size={32} weight="duotone" className="jf-playlist-card-icon" />
                    <button
                      type="button"
                      className="jf-playlist-card-play-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        void playPlaylist(pl.id);
                      }}
                      title={`Reproducir playlist ${pl.name}`}
                    >
                      <Play size={18} weight="fill" />
                    </button>
                  </div>

                  <div className="jf-playlist-card-info">
                    <h3 className="jf-playlist-card-name" title={pl.name}>
                      {pl.name}
                    </h3>
                    <span className="jf-playlist-card-count">
                      {pl.songIds.length} {pl.songIds.length === 1 ? 'canción' : 'canciones'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Modo Lista para Playlists */
            <div className="jf-playlists-list-view">
              <div
                className="jf-playlist-list-row jf-playlist-list-row--new"
                onClick={() => ui.open('createPlaylist')}
              >
                <div className="jf-playlist-list-dot jf-playlist-list-dot--new">
                  <Plus size={16} weight="bold" />
                </div>
                <div className="jf-playlist-list-info">
                  <span className="jf-playlist-list-name">Crear nueva playlist…</span>
                  <span className="jf-playlist-list-desc">Personaliza tu propia colección de canciones</span>
                </div>
              </div>

              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="jf-playlist-list-row"
                  onClick={() => playPlaylist(pl.id)}
                >
                  <div className="jf-playlist-list-dot" style={{ background: pl.color }}>
                    <MusicNotes size={16} weight="duotone" />
                  </div>
                  <div className="jf-playlist-list-info">
                    <span className="jf-playlist-list-name">{pl.name}</span>
                    <span className="jf-playlist-list-desc">
                      {pl.description || `${pl.songIds.length} canciones`}
                    </span>
                  </div>
                  <span className="jf-playlist-list-badge">
                    {pl.songIds.length} {pl.songIds.length === 1 ? 'tema' : 'temas'}
                  </span>
                  <button
                    type="button"
                    className="jf-btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      void playPlaylist(pl.id);
                    }}
                    title="Reproducir playlist"
                  >
                    <Play size={15} weight="fill" />
                  </button>
                  <button
                    type="button"
                    className="jf-btn-icon jf-btn-icon--danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePlaylist(pl.id);
                    }}
                    title="Eliminar playlist"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ================= SECCIÓN DE CANCIONES ================= */}
        <section className="jf-home-section jf-home-songs-section">
          <div className="jf-home-section-head">
            <div className="jf-home-section-title-wrap">
              <Flame size={20} weight="fill" className="is-primary-icon" />
              <h2 className="jf-home-section-title">Canciones en la Biblioteca</h2>
              <span className="jf-home-section-count">({filteredSongs.length})</span>
            </div>

            {/* Controles: Conmutador de vista, Filtros, Agrupación y Buscador */}
            <div className="jf-home-section-controls">
              {/* Conmutador de vista de Canciones (Cuadros Grandes vs Lista) */}
              <div className="jf-view-mode-switcher">
                <button
                  type="button"
                  className={`jf-view-mode-btn ${songViewMode === 'grid' ? 'is-active' : ''}`}
                  onClick={() => toggleSongView('grid')}
                  title="Ver en cuadros grandes"
                >
                  <SquaresFour size={16} weight="bold" />
                </button>
                <button
                  type="button"
                  className={`jf-view-mode-btn ${songViewMode === 'list' ? 'is-active' : ''}`}
                  onClick={() => toggleSongView('list')}
                  title="Ver en lista detallada"
                >
                  <ListBullets size={16} weight="bold" />
                </button>
              </div>

              {/* Selector de Agrupación (Todas / Artista / Álbum) */}
              <div className="jf-home-group-controls">
                <span className="jf-group-label">Agrupar:</span>
                <div className="jf-home-pills jf-home-pills--group">
                  <button
                    type="button"
                    className={`jf-pill ${groupBy === 'none' ? 'is-active' : ''}`}
                    onClick={() => handleSetGroupBy('none')}
                    title="Mostrar todas sin agrupar"
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    className={`jf-pill ${groupBy === 'artist' ? 'is-active' : ''}`}
                    onClick={() => handleSetGroupBy('artist')}
                    title="Agrupar canciones por artista"
                  >
                    <User size={13} weight="bold" /> Artista
                  </button>
                  <button
                    type="button"
                    className={`jf-pill ${groupBy === 'album' ? 'is-active' : ''}`}
                    onClick={() => handleSetGroupBy('album')}
                    title="Agrupar canciones por álbum"
                  >
                    <Disc size={13} weight="bold" /> Álbum
                  </button>
                </div>
              </div>

              {/* Filtro: Todas o Favoritas */}
              <div className="jf-home-pills">
                <button
                  type="button"
                  className={`jf-pill ${activeFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  Todas
                </button>
                <button
                  type="button"
                  className={`jf-pill ${activeFilter === 'liked' ? 'is-active' : ''}`}
                  onClick={() => setActiveFilter('liked')}
                >
                  Favoritas
                </button>
              </div>

              {/* Buscador reactivo */}
              <div className="jf-home-search-wrap">
                <MagnifyingGlass size={15} />
                <input
                  type="text"
                  className="jf-home-search-input"
                  placeholder="Buscar canciones…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ================= CONTENIDO DE CANCIONES (AGRUPADO O PLANO) ================= */}
          {groupBy !== 'none' && groupedSongs ? (
            /* ================= MODO AGRUPADO POR ARTISTA O ÁLBUM ================= */
            <div className="jf-songs-grouped-container">
              {groupedSongs.map(([groupName, groupItems]) => (
                <div key={groupName} className="jf-songs-group-block">
                  <div className="jf-songs-group-header">
                    <div className="jf-songs-group-header-left">
                      <div className="jf-songs-group-avatar">
                        {groupBy === 'artist' ? (
                          <User size={18} weight="bold" />
                        ) : (
                          <Disc size={18} weight="bold" />
                        )}
                      </div>
                      <div className="jf-songs-group-titles">
                        <h3 className="jf-songs-group-name">{groupName}</h3>
                        <span className="jf-songs-group-count">
                          {groupItems.length} {groupItems.length === 1 ? 'canción' : 'canciones'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="jf-btn jf-btn--secondary jf-btn--sm jf-group-play-action"
                      onClick={() => handlePlayGroup(groupItems, groupName)}
                      title={`Reproducir todas las canciones de ${groupName}`}
                    >
                      <Play size={13} weight="fill" />
                      <span>Reproducir todo</span>
                    </button>
                  </div>

                  {songViewMode === 'grid' ? (
                    <div className="jf-songs-big-grid">
                      {groupItems.map((song) => renderSongCard(song))}
                    </div>
                  ) : (
                    <div className="jf-songs-showcase-list">
                      <ul className="jf-songs-list-container">
                        {groupItems.map((song, idx) => (
                          <SongRow key={song.id} song={song} index={idx} />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* ================= MODO ESTÁNDAR / PLANO ================= */
            songViewMode === 'grid' ? (
              /* MODO CUADROS GRANDES */
              <div className="jf-songs-big-grid">
                <AnimatePresence>
                  {filteredSongs.slice(0, 60).map((song) => renderSongCard(song))}
                </AnimatePresence>
              </div>
            ) : (
              /* MODO LISTA / TABLA DETALLADA */
              <div className="jf-songs-showcase-list">
                <ul className="jf-songs-list-container">
                  {filteredSongs.map((song, idx) => (
                    <SongRow key={song.id} song={song} index={idx} />
                  ))}
                </ul>
              </div>
            )
          )}
        </section>
      </div>
    </section>
  );
}
