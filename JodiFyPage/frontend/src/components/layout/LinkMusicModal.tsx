import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Link as LinkIcon,
  Play,
  Pause,
  Download,
  PaperPlaneTilt,
  CheckCircle,
  SpinnerGap,
  X,
  MusicNotes,
  Queue,
  Trash,
  Clock,
  YoutubeLogo,
  SpotifyLogo,
  Globe,
  Sparkle,
  ThumbsUp,
  Heart,
  CloudArrowDown,
  ClipboardText,
  Lightning,
} from '@phosphor-icons/react';
import { useUiStore } from '../../store/ui.store';
import { usePlayerStore } from '../../store/player.store';
import { useQueueStore } from '../../store/queue.store';
import { useToastStore } from '../../store/toast.store';
import { useIsAdmin, useIsDev, useSession } from '../../context/SessionContext';
import {
  linksService,
  ResolvedMedia,
  ResolvedTrack,
  SongSuggestion,
} from '../../services/links.service';
import { formatTime } from '../../lib/utils';
import type { Song } from '../../lib/types';
import { useLibraryStore } from '../../store/library.store';
import { downloadSong } from '../../services/offline.service';
import { likesService } from '../../services/social.service';
import { songsService } from '../../services/songs.service';
import { cacheExternalLikedSong, removeExternalLikedSong } from '../../services/player-shortcuts';
import { playSong } from '../../services/player.service';

function toVirtualSong(track: {
  title: string;
  artist?: string;
  album?: string;
  stream_url?: string;
  url?: string;
  thumbnail?: string;
  duration?: number;
  id?: string;
  youtube_id?: string;
  source?: string;
  original_url?: string;
  webpage_url?: string;
}): Song {
  const hashVal = Math.abs(
    Array.from(track.title + (track.artist || '')).reduce(
      (acc, char) => (acc << 5) - acc + char.charCodeAt(0),
      0
    )
  );
  const cleanId = track.id ? String(track.id) : `link-${hashVal}`;

  const allUrls = decodeURIComponent(
    `${track.url || ''} ${track.stream_url || ''} ${track.id || ''} ${track.original_url || ''} ${track.webpage_url || ''}`
  );
  const ytMatch = allUrls.match(/(?:watch\?v=|youtu\.be\/|embed\/|shorts\/|yt-|v=)([a-zA-Z0-9_-]{11})/);
  const ytId = track.youtube_id || (ytMatch ? ytMatch[1] : undefined);

  return {
    id: cleanId,
    name: track.title,
    artist: track.artist || 'Enlace Externo',
    album: track.album || 'Streaming Web',
    url: track.stream_url || track.url || '',
    youtube_id: ytId,
    source: track.source || (ytId ? 'youtube' : 'web'),
    cover_url: track.thumbnail || undefined,
    duration: track.duration,
    likes: 0,
    added_by: 'Enlace Web',
  };
}

export function LinkMusicModal() {
  const ui = useUiStore();
  const { session } = useSession();
  const isAdmin = useIsAdmin();
  const isDev = useIsDev();

  const [activeTab, setActiveTab] = useState<'search' | 'suggestions'>('search');
  const [url, setUrl] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedMedia | null>(null);
  const [notes, setNotes] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestedOk, setSuggestedOk] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);

  // Sugerencias comunitarias
  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [sugStatusFilter, setSugStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [sugSearch, setSugSearch] = useState('');

  const likedIds = useLibraryStore((s) => s.likedIds);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentSong = usePlayerStore((s) => s.currentSong);

  const isTrackLiked = (songId: string | number) =>
    likedIds.some((id) => String(id) === String(songId));
  const isTrackDownloaded = (songId: string | number) =>
    downloadedIds.some((id) => String(id) === String(songId));

  const isTrackPlaying = (track: { id?: string | number; youtube_id?: string; title: string; artist?: string; url?: string; stream_url?: string }) => {
    if (!currentSong || !isPlaying) return false;
    const v = toVirtualSong(track as any);
    return (
      String(currentSong.id) === String(v.id) ||
      (Boolean(v.youtube_id) && currentSong.youtube_id === v.youtube_id) ||
      (Boolean(currentSong.url) && Boolean(v.url) && currentSong.url === v.url)
    );
  };

  useEffect(() => {
    if (!isAdmin && !isDev && activeTab === 'suggestions') {
      setActiveTab('search');
    }
  }, [isAdmin, isDev, activeTab]);

  useEffect(() => {
    if (ui.modal === 'linkMusic' && activeTab === 'suggestions') {
      void loadSuggestions();
    }
  }, [ui.modal, activeTab]);

  if (ui.modal !== 'linkMusic') return null;

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const data = await linksService.getSuggestions();
      setSuggestions(data);
    } catch {
      // ignore
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().startsWith('http')) {
          setUrl(text.trim());
          useToastStore.getState().show('Enlace pegado desde el portapapeles', 'info', 1600);
        }
      }
    } catch {
      // ignore clipboard error
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsResolving(true);
    setError(null);
    setResolved(null);
    setSuggestedOk(false);

    try {
      const res = await linksService.resolveLink(url.trim());
      setResolved(res);
      useToastStore.getState().show('¡Música encontrada con éxito!', 'success', 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo resolver el enlace');
    } finally {
      setIsResolving(false);
    }
  };

  const handlePlayResolvedTrack = async (track: ResolvedTrack) => {
    const virtualSong = toVirtualSong(track);
    if (
      currentSong &&
      (String(currentSong.id) === String(virtualSong.id) ||
        (Boolean(virtualSong.youtube_id) && currentSong.youtube_id === virtualSong.youtube_id) ||
        (Boolean(currentSong.url) && Boolean(virtualSong.url) && currentSong.url === virtualSong.url))
    ) {
      usePlayerStore.getState().togglePlay();
      return;
    }
    useLibraryStore.getState().upsertSong(virtualSong);
    await playSong(virtualSong);
    useToastStore.getState().show(`Reproduciendo «${track.title}»`, 'success', 2200);
  };

  const handleQueueTrack = (track: ResolvedTrack) => {
    const virtualSong = toVirtualSong(track);
    useLibraryStore.getState().upsertSong(virtualSong);
    useQueueStore.getState().add(virtualSong);
    useToastStore.getState().show(`«${track.title}» agregada a la cola`, 'info', 1800);
  };

  const handleToggleLike = async (track: ResolvedTrack) => {
    const virtualSong = toVirtualSong(track);
    const currentlyLiked = isTrackLiked(virtualSong.id);
    const nextLiked = !currentlyLiked;

    // Actualiza en la tienda de la biblioteca inmediatamente
    useLibraryStore.getState().upsertSong(virtualSong);
    useLibraryStore.getState().toggleLikeLocal(virtualSong.id, nextLiked);

    if (session?.username) {
      try {
        if (nextLiked) {
          const registered = await songsService.registerSong({
            name: virtualSong.name,
            artist: virtualSong.artist,
            album: virtualSong.album,
            url: virtualSong.url,
            youtube_id: virtualSong.youtube_id,
            cover_url: virtualSong.cover_url,
            duration: virtualSong.duration,
            added_by: session.username,
            liked_by: session.username,
          });
          useLibraryStore.getState().upsertSong(registered);
          useLibraryStore.getState().toggleLikeLocal(registered.id, true);
          cacheExternalLikedSong(registered);
        } else {
          await likesService.removeLike(session.username, virtualSong.id);
          removeExternalLikedSong(virtualSong.id);
        }
      } catch (err) {
        console.warn('[LinkMusicModal] Error guardando like externo en BD:', err);
      }
    }

    useToastStore.getState().show(
      nextLiked
        ? `«${track.title}» agregada a tus Me Gusta ❤️`
        : `«${track.title}» eliminada de tus Me Gusta`,
      nextLiked ? 'success' : 'info',
      2000
    );
  };

  const handleSaveOffline = async (track: ResolvedTrack) => {
    const virtualSong = toVirtualSong(track);
    setSavingOffline(true);
    try {
      useLibraryStore.getState().upsertSong(virtualSong);
      await downloadSong(virtualSong, session?.username || 'usuario');
      useToastStore.getState().show(
        `«${track.title}» guardada localmente para escuchar sin conexión`,
        'success',
        2500
      );
    } catch (err) {
      useToastStore.getState().show(
        'No se pudo guardar localmente: ' + (err instanceof Error ? err.message : ''),
        'error'
      );
    } finally {
      setSavingOffline(false);
    }
  };

  const handleDownloadFile = (track: ResolvedTrack) => {
    const targetUrl = track.webpage_url || track.original_url || track.stream_url || track.download_url || '';
    const downloadUrl = linksService.getDownloadUrl(targetUrl, `${track.title}.mp3`);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${track.title}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    useToastStore.getState().show(`Iniciando descarga de «${track.title}.mp3»…`, 'info', 2200);
  };

  const handlePlayAllPlaylist = async (playlist: ResolvedMedia & { type: 'playlist' }) => {
    if (!playlist.items.length) return;
    const songs = playlist.items.map((item) => toVirtualSong(item));
    songs.forEach((s) => useLibraryStore.getState().upsertSong(s));

    const queue = useQueueStore.getState();
    songs.slice(1).forEach((s) => queue.add(s));

    await playSong(songs[0]);
    useToastStore.getState().show(`Reproduciendo playlist (${songs.length} pistas)`, 'success', 2500);
  };

  const handleQueueAllPlaylist = (playlist: ResolvedMedia & { type: 'playlist' }) => {
    if (!playlist.items.length) return;
    const songs = playlist.items.map((item) => toVirtualSong(item));
    songs.forEach((s) => {
      useLibraryStore.getState().upsertSong(s);
      useQueueStore.getState().add(s);
    });
    useToastStore.getState().show(`Se agregaron ${songs.length} canciones a la cola`, 'info', 2200);
  };

  const handleSuggest = async (track: ResolvedTrack) => {
    setSuggesting(true);
    try {
      await linksService.suggestSong({
        url: track.original_url,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        thumbnail: track.thumbnail,
        stream_url: track.stream_url,
        notes: notes.trim() || undefined,
      });
      setSuggestedOk(true);
      useToastStore.getState().show('Sugerencia enviada a los administradores', 'success', 2500);
    } catch (err) {
      useToastStore.getState().show(
        err instanceof Error ? err.message : 'Error al enviar sugerencia',
        'error'
      );
    } finally {
      setSuggesting(false);
    }
  };

  const handleApprove = async (sugId: string) => {
    setApprovingId(sugId);
    try {
      const createdSong = await linksService.approveSuggestion(sugId);
      if (createdSong) {
        useLibraryStore.getState().upsertSong(createdSong);
      }
      setSuggestions((prev) =>
        prev.map((s) => (s.id === sugId ? { ...s, status: 'approved' } : s))
      );
      useToastStore.getState().show('Canción aprobada y guardada en la base de datos', 'success', 2800);
    } catch (err) {
      useToastStore.getState().show(
        err instanceof Error ? err.message : 'Error al aprobar sugerencia',
        'error'
      );
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeleteSuggestion = async (sugId: string) => {
    try {
      await linksService.deleteSuggestion(sugId);
      setSuggestions((prev) => prev.filter((s) => s.id !== sugId));
      useToastStore.getState().show('Sugerencia eliminada', 'info', 1600);
    } catch {
      useToastStore.getState().show('No se pudo eliminar la sugerencia', 'error');
    }
  };

  return (
    <div className="jf-modal-backdrop" onClick={() => ui.close('linkMusic')}>
      <motion.div
        className="jf-modal jf-link-music-modal"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(720px, 94vw)' }}
      >
        <div className="jf-modal-header">
          <div className="jf-modal-header-icon jf-modal-header-icon--link">
            <LinkIcon size={20} weight="bold" />
          </div>
          <div>
            <h2 className="jf-modal-title">Buscador y Explorador de Enlaces</h2>
            <p className="jf-modal-subtitle">
              Pega cualquier link para reproducir, guardar en tus me gusta, descargar localmente o agregar a tu colección
            </p>
          </div>
          <button
            type="button"
            className="jf-modal-close"
            onClick={() => ui.close('linkMusic')}
            aria-label="Cerrar"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Pestañas: Buscar por Link / Sugerencias comunitarias (Solo dev o admin) */}
        {(isAdmin || isDev) && (
          <div className="jf-link-tabs">
            <button
              type="button"
              className={`jf-link-tab ${activeTab === 'search' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <Globe size={16} weight="bold" /> Buscar por Enlace
            </button>
            <button
              type="button"
              className={`jf-link-tab ${activeTab === 'suggestions' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('suggestions')}
            >
              <ThumbsUp size={16} weight="bold" /> Panel de Sugerencias
              {suggestions.filter((s) => s.status === 'pending').length > 0 && (
                <span className="jf-link-tab-badge">
                  {suggestions.filter((s) => s.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
        )}

        {activeTab === 'search' ? (
          <div className="jf-link-content">
            {/* Formulario de búsqueda con botón de pegar */}
            <form onSubmit={handleResolve} className="jf-link-form">
              <div className="jf-link-input-wrapper">
                <input
                  type="url"
                  className="jf-input jf-link-input"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Pega un enlace de YouTube, Spotify, SoundCloud, MP3 o playlist…"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="jf-btn-ghost jf-link-paste-btn"
                  onClick={handlePasteClipboard}
                  title="Pegar desde el portapapeles"
                >
                  <ClipboardText size={17} weight="bold" /> Pegar
                </button>
                <button
                  type="submit"
                  className="jf-btn jf-btn--primary jf-link-submit-btn"
                  disabled={isResolving || !url.trim()}
                >
                  {isResolving ? (
                    <>
                      <SpinnerGap size={17} weight="bold" className="jf-spin" /> Buscando…
                    </>
                  ) : (
                    <>
                      <Sparkle size={17} weight="fill" /> Explorar
                    </>
                  )}
                </button>
              </div>

              {/* Badges de compatibilidad rápida */}
              <div className="jf-link-compatibility-badges">
                <span className="jf-link-compat-pill jf-compat-yt">
                  <YoutubeLogo size={13} weight="fill" /> YouTube
                </span>
                <span className="jf-link-compat-pill jf-compat-sp">
                  <SpotifyLogo size={13} weight="fill" /> Spotify
                </span>
                <span className="jf-link-compat-pill jf-compat-sc">
                  <Globe size={13} weight="bold" /> SoundCloud
                </span>
                <span className="jf-link-compat-pill jf-compat-direct">
                  <MusicNotes size={13} weight="bold" /> Audio MP3 / WAV
                </span>
              </div>
            </form>

            {/* Animación de escaneo activo */}
            <AnimatePresence>
              {isResolving && (
                <motion.div
                  className="jf-link-scanning-state"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                >
                  <div className="jf-link-scanning-radar">
                    <span className="jf-radar-pulse" />
                    <SpinnerGap size={36} weight="bold" className="jf-spin jf-radar-icon" />
                  </div>
                  <p className="jf-link-scanning-text">
                    Decodificando metadatos y extrayendo flujo de audio en alta definición…
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div
                className="jf-link-error-card"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p>{error}</p>
              </motion.div>
            )}

            {/* Resultado de pista única */}
            {resolved?.type === 'track' && !isResolving && (
              <motion.div
                className="jf-link-card"
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="jf-link-card-media">
                  {resolved.thumbnail ? (
                    <img className="jf-link-cover" src={resolved.thumbnail} alt="" />
                  ) : (
                    <div className="jf-link-cover jf-link-cover--placeholder">
                      <MusicNotes size={36} weight="duotone" />
                    </div>
                  )}

                  <span
                    className={`jf-link-source-badge ${
                      resolved.source.includes('youtube')
                        ? 'is-youtube'
                        : resolved.source.includes('spotify')
                        ? 'is-spotify'
                        : 'is-web'
                    }`}
                  >
                    {resolved.source.includes('youtube') ? (
                      <YoutubeLogo size={14} weight="fill" />
                    ) : resolved.source.includes('spotify') ? (
                      <SpotifyLogo size={14} weight="fill" />
                    ) : (
                      <Globe size={14} weight="fill" />
                    )}
                    {resolved.source.toUpperCase()}
                  </span>

                  <span className="jf-link-quality-badge">320 KBPS HD</span>
                </div>

                <div className="jf-link-card-details">
                  <div className="jf-link-meta-head">
                    <h3 className="jf-link-title">{resolved.title}</h3>
                    <p className="jf-link-artist">{resolved.artist}</p>
                    <div className="jf-link-meta-tags">
                      {resolved.album && (
                        <span className="jf-link-album-tag">Álbum: {resolved.album}</span>
                      )}
                      {resolved.duration && (
                        <span className="jf-link-duration">
                          <Clock size={13} /> {formatTime(resolved.duration)}
                        </span>
                      )}
                      {isTrackDownloaded(toVirtualSong(resolved).id) && (
                        <span className="jf-link-offline-badge">
                          <CheckCircle size={13} weight="fill" /> Guardada Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones principales: Play, Cola, Like, Guardar Offline, Descargar MP3 */}
                  <div className="jf-link-actions-grid">
                    <button
                      type="button"
                      className={`jf-btn ${isTrackPlaying(resolved) ? 'jf-btn--secondary is-playing' : 'jf-btn--primary'} jf-link-action-play`}
                      onClick={() => handlePlayResolvedTrack(resolved)}
                    >
                      {isTrackPlaying(resolved) ? (
                        <>
                          <Pause size={16} weight="fill" /> Pausar
                        </>
                      ) : (
                        <>
                          <Play size={16} weight="fill" />{' '}
                          {currentSong &&
                          (String(currentSong.id) === String(toVirtualSong(resolved).id) ||
                            (Boolean(resolved.youtube_id) && currentSong.youtube_id === resolved.youtube_id))
                            ? 'Reanudar'
                            : 'Reproducir ahora'}
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="jf-btn jf-btn--secondary"
                      onClick={() => handleQueueTrack(resolved)}
                      title="Agregar a la cola"
                    >
                      <Queue size={16} /> A la cola
                    </button>

                    {/* Botón de Like / Favoritos */}
                    <button
                      type="button"
                      className={`jf-btn jf-btn--secondary jf-link-like-btn ${
                        isTrackLiked(toVirtualSong(resolved).id) ? 'is-liked' : ''
                      }`}
                      onClick={() => handleToggleLike(resolved)}
                      title={
                        isTrackLiked(toVirtualSong(resolved).id)
                          ? 'En tus Me Gusta'
                          : 'Agregar a Me Gusta para escuchar siempre'
                      }
                    >
                      <Heart
                        size={17}
                        weight={
                          isTrackLiked(toVirtualSong(resolved).id) ? 'fill' : 'regular'
                        }
                      />
                      {isTrackLiked(toVirtualSong(resolved).id) ? 'Me Gusta' : 'Dar Like'}
                    </button>

                    {/* Botón de Guardar Offline (IndexedDB local) */}
                    <button
                      type="button"
                      className={`jf-btn jf-btn--secondary jf-link-offline-btn ${
                        isTrackDownloaded(toVirtualSong(resolved).id) ? 'is-downloaded' : ''
                      }`}
                      onClick={() => handleSaveOffline(resolved)}
                      disabled={savingOffline}
                      title="Guardar localmente para escuchar sin conexión en cualquier momento"
                    >
                      {savingOffline ? (
                        <SpinnerGap size={16} weight="bold" className="jf-spin" />
                      ) : (
                        <CloudArrowDown size={17} weight="bold" />
                      )}
                      {isTrackDownloaded(toVirtualSong(resolved).id)
                        ? 'En Offline'
                        : 'Guardar Offline'}
                    </button>

                    {/* Botón de Descargar MP3 directo al disco */}
                    <button
                      type="button"
                      className="jf-btn jf-btn--secondary"
                      onClick={() => handleDownloadFile(resolved)}
                      title="Descargar archivo .mp3 a tu dispositivo"
                    >
                      <Download size={16} /> Descargar .mp3
                    </button>
                  </div>

                  {/* Sección de Sugerencia / Añadir a la base de datos */}
                  <div className="jf-link-suggest-box">
                    <div className="jf-link-suggest-head">
                      <Sparkle size={15} weight="fill" />
                      <span>
                        {isAdmin || isDev
                          ? 'Panel de Control: Agregar a la nube de JodiFy'
                          : '¿Quieres que esta canción esté disponible para toda la comunidad?'}
                      </span>
                    </div>

                    {suggestedOk ? (
                      <div className="jf-link-suggest-success">
                        <CheckCircle size={18} weight="fill" />
                        <span>¡Sugerencia enviada! Un administrador la revisará para incorporarla.</span>
                      </div>
                    ) : (
                      <div className="jf-link-suggest-form">
                        <input
                          type="text"
                          className="jf-input jf-link-notes-input"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Nota opcional (género, comentarios, etc.)"
                        />
                        <button
                          type="button"
                          className="jf-btn jf-btn--secondary jf-link-suggest-btn"
                          disabled={suggesting}
                          onClick={() => handleSuggest(resolved)}
                        >
                          {suggesting ? (
                            <SpinnerGap size={14} className="jf-spin" />
                          ) : (
                            <PaperPlaneTilt size={14} weight="bold" />
                          )}
                          Sugerir a la Base de Datos
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Resultado de Playlist */}
            {resolved?.type === 'playlist' && !isResolving && (
              <motion.div
                className="jf-link-playlist-view"
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35 }}
              >
                <div className="jf-link-playlist-head">
                  {resolved.thumbnail && (
                    <img className="jf-link-playlist-cover" src={resolved.thumbnail} alt="" />
                  )}
                  <div className="jf-link-playlist-meta">
                    <div className="jf-link-playlist-badges-row">
                      <span className="jf-link-playlist-badge">Playlist Completa</span>
                      <span className="jf-link-playlist-count">{resolved.count} canciones</span>
                    </div>
                    <h3 className="jf-link-playlist-title">{resolved.title}</h3>
                    <p className="jf-link-playlist-sub">
                      Canal / Creador: {resolved.artist || 'Varios Artistas'}
                    </p>

                    <div className="jf-link-playlist-actions">
                      <button
                        type="button"
                        className="jf-btn jf-btn--primary"
                        onClick={() => handlePlayAllPlaylist(resolved)}
                      >
                        <Play size={16} weight="fill" /> Reproducir Todo
                      </button>
                      <button
                        type="button"
                        className="jf-btn jf-btn--secondary"
                        onClick={() => handleQueueAllPlaylist(resolved)}
                      >
                        <Queue size={16} /> Añadir Todo a la Cola
                      </button>
                    </div>
                  </div>
                </div>

                <div className="jf-link-playlist-items">
                  {resolved.items.slice(0, 50).map((item, idx) => {
                    const vSong = toVirtualSong(item);
                    const liked = isTrackLiked(vSong.id);
                    return (
                      <div key={item.id || idx} className="jf-link-playlist-item">
                        <span className="jf-link-item-num">{idx + 1}</span>
                        {item.thumbnail ? (
                          <img className="jf-link-item-thumb" src={item.thumbnail} alt="" />
                        ) : (
                          <div className="jf-link-item-thumb jf-link-item-thumb--placeholder">
                            <MusicNotes size={16} />
                          </div>
                        )}
                        <div className="jf-link-item-meta">
                          <span className="jf-link-item-title">{item.title}</span>
                          <span className="jf-link-item-artist">{item.artist}</span>
                        </div>
                        {item.duration && (
                          <span className="jf-link-item-dur">{formatTime(item.duration)}</span>
                        )}

                        <div className="jf-link-item-actions">
                          {/* Botón Play directo */}
                          <button
                            type="button"
                            className={`jf-btn-icon ${isTrackPlaying(item) ? 'is-active' : ''}`}
                            title={isTrackPlaying(item) ? 'Pausar' : 'Reproducir ahora'}
                            onClick={async () => {
                              if (isTrackPlaying(item)) {
                                usePlayerStore.getState().togglePlay();
                                return;
                              }
                              useLibraryStore.getState().upsertSong(vSong);
                              await playSong(vSong);
                              useToastStore.getState().show(`Reproduciendo «${item.title}»`, 'success', 2000);
                            }}
                          >
                            {isTrackPlaying(item) ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
                          </button>

                          {/* Botón Añadir a la cola */}
                          <button
                            type="button"
                            className="jf-btn-icon"
                            title="Añadir a la cola"
                            onClick={() => {
                              useLibraryStore.getState().upsertSong(vSong);
                              useQueueStore.getState().add(vSong);
                              useToastStore.getState().show(`«${item.title}» a la cola`, 'info', 1600);
                            }}
                          >
                            <Queue size={14} />
                          </button>

                          {/* Botón Like directo en playlist con registro en MongoDB */}
                          <button
                            type="button"
                            className={`jf-btn-icon ${liked ? 'is-liked' : ''}`}
                            title={liked ? 'En tus Me Gusta' : 'Dar Like y guardar'}
                            onClick={async () => {
                              const next = !liked;
                              useLibraryStore.getState().upsertSong(vSong);
                              useLibraryStore.getState().toggleLikeLocal(vSong.id, next);
                              if (session?.username) {
                                try {
                                  if (next) {
                                    const reg = await songsService.registerSong({
                                      name: vSong.name,
                                      artist: vSong.artist,
                                      album: vSong.album,
                                      url: vSong.url,
                                      youtube_id: vSong.youtube_id,
                                      cover_url: vSong.cover_url,
                                      duration: vSong.duration,
                                      added_by: session.username,
                                      liked_by: session.username,
                                    });
                                    useLibraryStore.getState().upsertSong(reg);
                                    useLibraryStore.getState().toggleLikeLocal(reg.id, true);
                                    cacheExternalLikedSong(reg);
                                  } else {
                                    await likesService.removeLike(session.username, vSong.id);
                                    removeExternalLikedSong(vSong.id);
                                  }
                                } catch {
                                  // local
                                }
                              }
                              useToastStore.getState().show(
                                next ? 'Añadida a tus Me Gusta ❤️' : 'Eliminada de tus Me Gusta',
                                next ? 'success' : 'info',
                                1800
                              );
                            }}
                          >
                            <Heart size={14} weight={liked ? 'fill' : 'regular'} color={liked ? '#ff3366' : 'currentColor'} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* Pestaña: Panel de Sugerencias (Solo dev o admin) */
          <div className="jf-suggestions-list-view">
            {/* Cabecera del panel de sugerencias */}
            <div className="jf-sug-panel-top">
              <div className="jf-sug-filter-pills">
                <button
                  type="button"
                  className={`jf-sug-pill ${sugStatusFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setSugStatusFilter('all')}
                >
                  Todas ({suggestions.length})
                </button>
                <button
                  type="button"
                  className={`jf-sug-pill ${sugStatusFilter === 'pending' ? 'is-active' : ''}`}
                  onClick={() => setSugStatusFilter('pending')}
                >
                  Pendientes ({suggestions.filter((s) => s.status === 'pending').length})
                </button>
                <button
                  type="button"
                  className={`jf-sug-pill ${sugStatusFilter === 'approved' ? 'is-active' : ''}`}
                  onClick={() => setSugStatusFilter('approved')}
                >
                  Aprobadas ({suggestions.filter((s) => s.status === 'approved').length})
                </button>
              </div>

              <button
                type="button"
                className="jf-btn-ghost jf-suggestions-refresh"
                onClick={loadSuggestions}
                disabled={loadingSuggestions}
                title="Recargar sugerencias"
              >
                Actualizar
              </button>
            </div>

            {/* Buscador de sugerencias */}
            <div className="jf-sug-search-wrap">
              <input
                type="text"
                className="jf-input jf-sug-search-input"
                placeholder="Filtrar por canción, artista o usuario…"
                value={sugSearch}
                onChange={(e) => setSugSearch(e.target.value)}
              />
            </div>

            {loadingSuggestions ? (
              <div className="jf-suggestions-loading">
                <SpinnerGap size={26} className="jf-spin" />
                <p>Cargando sugerencias de la base de datos…</p>
              </div>
            ) : (() => {
              const q = sugSearch.trim().toLowerCase();
              const filtered = suggestions.filter((s) => {
                if (sugStatusFilter !== 'all' && s.status !== sugStatusFilter) return false;
                if (!q) return true;
                return (
                  s.title.toLowerCase().includes(q) ||
                  (s.artist && s.artist.toLowerCase().includes(q)) ||
                  (s.suggested_by && s.suggested_by.toLowerCase().includes(q)) ||
                  (s.notes && s.notes.toLowerCase().includes(q))
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="jf-suggestions-empty">
                    <MusicNotes size={42} weight="duotone" />
                    <p>No hay sugerencias en esta vista</p>
                    <span>
                      {sugSearch
                        ? 'Prueba con otro término de búsqueda'
                        : 'Las canciones sugeridas por la comunidad aparecerán aquí para revisión.'}
                    </span>
                  </div>
                );
              }

              return (
                <div className="jf-suggestions-list">
                  {filtered.map((sug) => (
                    <div
                      key={sug.id}
                      className={`jf-suggestion-card ${sug.status === 'pending' ? 'is-pending' : 'is-approved'}`}
                    >
                      <div className="jf-sug-card-media">
                        {sug.thumbnail ? (
                          <img className="jf-suggestion-thumb" src={sug.thumbnail} alt="" />
                        ) : (
                          <div className="jf-suggestion-thumb jf-suggestion-thumb--empty">
                            <MusicNotes size={22} weight="duotone" />
                          </div>
                        )}
                        <button
                          type="button"
                          className="jf-sug-play-overlay-btn"
                          title="Probar y reproducir enlace"
                          onClick={() => {
                            const vSong = toVirtualSong({
                              id: sug.id,
                              title: sug.title,
                              artist: sug.artist,
                              album: sug.album,
                              thumbnail: sug.thumbnail,
                              stream_url: sug.stream_url || sug.url,
                              duration: sug.duration,
                            });
                            useLibraryStore.getState().upsertSong(vSong);
                            const p = usePlayerStore.getState();
                            p.setCurrentSong(vSong);
                            p.setIsPlaying(true);
                            p.setSourceUrl(vSong.url);
                            useToastStore.getState().show(`Reproduciendo «${sug.title}»`, 'success', 2000);
                          }}
                        >
                          <Play size={14} weight="fill" />
                        </button>
                      </div>

                      <div className="jf-suggestion-meta">
                        <div className="jf-suggestion-title-row">
                          <span className="jf-suggestion-title" title={sug.title}>{sug.title}</span>
                          <span className={`jf-suggestion-status is-${sug.status}`}>
                            {sug.status === 'approved' ? (
                              <>
                                <CheckCircle size={12} weight="fill" /> Aprobada
                              </>
                            ) : sug.status === 'rejected' ? (
                              'Rechazada'
                            ) : (
                              <>
                                <Sparkle size={12} weight="fill" /> Pendiente
                              </>
                            )}
                          </span>
                        </div>

                        <div className="jf-sug-artist-row">
                          <span className="jf-suggestion-artist">{sug.artist || 'Artista desconocido'}</span>
                          {sug.duration ? (
                            <span className="jf-sug-duration-pill">{formatTime(sug.duration)}</span>
                          ) : null}
                        </div>

                        <span className="jf-suggestion-by">
                          Sugerida por <strong>@{sug.suggested_by}</strong>
                          {sug.created_at ? ` · ${new Date(sug.created_at).toLocaleDateString()}` : ''}
                        </span>

                        {sug.notes && (
                          <div className="jf-sug-note-quote">
                            <span>«{sug.notes}»</span>
                          </div>
                        )}
                      </div>

                      <div className="jf-suggestion-actions">
                        {sug.status === 'pending' && (
                          <button
                            type="button"
                            className="jf-btn jf-btn--primary jf-btn-approve"
                            title="Descargar audio y agregarlo permanentemente a MongoDB"
                            disabled={approvingId === sug.id}
                            onClick={() => handleApprove(sug.id)}
                          >
                            {approvingId === sug.id ? (
                              <SpinnerGap size={14} className="jf-spin" />
                            ) : (
                              <Lightning size={14} weight="bold" />
                            )}
                            <span>Aprobar</span>
                          </button>
                        )}

                        {sug.status === 'approved' && (
                          <span className="jf-sug-approved-tag" title="Ya está en la base de datos">
                            <CheckCircle size={14} weight="fill" /> En BD
                          </span>
                        )}

                        <button
                          type="button"
                          className="jf-btn-icon jf-btn-danger"
                          title="Eliminar sugerencia"
                          onClick={() => handleDeleteSuggestion(sug.id)}
                        >
                          <Trash size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </motion.div>
    </div>
  );
}
