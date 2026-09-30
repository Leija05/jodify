import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Link as LinkIcon,
  Play,
  Download,
  PaperPlaneTilt,
  CheckCircle,
  SpinnerGap,
  X,
  MusicNotes,
  Queue,
  Database,
  Trash,
  Clock,
  YoutubeLogo,
  Globe,
  Sparkle,
  ThumbsUp,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useUiStore } from '../../store/ui.store';
import { usePlayerStore } from '../../store/player.store';
import { useQueueStore } from '../../store/queue.store';
import { useToastStore } from '../../store/toast.store';
import { useIsAdmin, useIsDev } from '../../context/SessionContext';
import {
  linksService,
  ResolvedMedia,
  ResolvedTrack,
  SongSuggestion,
} from '../../services/links.service';
import { formatTime } from '../../lib/utils';
import type { Song } from '../../lib/types';
import { useLibraryStore } from '../../store/library.store';

export function LinkMusicModal() {
  const ui = useUiStore();
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

  // Sugerencias comunitarias
  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo resolver el enlace');
    } finally {
      setIsResolving(false);
    }
  };

  const handlePlayResolvedTrack = (track: ResolvedTrack) => {
    const virtualSong: Song = {
      id: `link-${Date.now()}`,
      name: track.title,
      artist: track.artist || 'Enlace externo',
      album: track.album || 'Streaming Web',
      url: track.stream_url,
      cover_url: track.thumbnail || undefined,
      duration: track.duration,
      likes: 0,
    };

    const player = usePlayerStore.getState();
    player.setCurrentSong(virtualSong);
    player.setIsPlaying(true);
    player.setSourceUrl(track.stream_url);
    useToastStore.getState().show(`Reproduciendo «${track.title}»`, 'success', 2200);
  };

  const handleQueueTrack = (track: ResolvedTrack) => {
    const virtualSong: Song = {
      id: `link-${Date.now()}`,
      name: track.title,
      artist: track.artist || 'Enlace externo',
      album: track.album || 'Streaming Web',
      url: track.stream_url,
      cover_url: track.thumbnail || undefined,
      duration: track.duration,
      likes: 0,
    };
    useQueueStore.getState().add(virtualSong);
    useToastStore.getState().show(`«${track.title}» agregada a la cola`, 'info', 1800);
  };

  const handleDownloadTrack = (track: ResolvedTrack) => {
    const downloadUrl = linksService.getDownloadUrl(track.original_url || track.stream_url, `${track.title}.mp3`);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${track.title}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    useToastStore.getState().show(`Descargando «${track.title}»…`, 'info', 2200);
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
      useToastStore.getState().show(err instanceof Error ? err.message : 'Error al enviar sugerencia', 'error');
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
      setSuggestions((prev) => prev.map((s) => (s.id === sugId ? { ...s, status: 'approved' } : s)));
      useToastStore.getState().show('Canción aprobada y guardada en la base de datos', 'success', 2800);
    } catch (err) {
      useToastStore.getState().show(err instanceof Error ? err.message : 'Error al aprobar sugerencia', 'error');
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
        style={{ width: 'min(640px, 94vw)' }}
      >
        <div className="jf-modal-header">
          <div className="jf-modal-header-icon jf-modal-header-icon--link">
            <LinkIcon size={20} weight="bold" />
          </div>
          <div>
            <h2 className="jf-modal-title">Música desde Enlace</h2>
            <p className="jf-modal-subtitle">
              Reproduce, descarga o sugiere canciones y playlists desde YouTube, SoundCloud o enlaces directos
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

        {/* Pestañas: Buscar por Link / Sugerencias comunitarias */}
        <div className="jf-link-tabs">
          <button
            type="button"
            className={`jf-link-tab ${activeTab === 'search' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Globe size={16} weight="bold" /> Explorar Enlace
          </button>
          <button
            type="button"
            className={`jf-link-tab ${activeTab === 'suggestions' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('suggestions')}
          >
            <ThumbsUp size={16} weight="bold" /> Sugerencias de la Comunidad
            {suggestions.filter((s) => s.status === 'pending').length > 0 && (
              <span className="jf-link-tab-badge">
                {suggestions.filter((s) => s.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'search' ? (
          <div className="jf-link-content">
            <form onSubmit={handleResolve} className="jf-link-form">
              <div className="jf-link-input-wrapper">
                <input
                  type="url"
                  className="jf-input jf-link-input"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Pega un enlace de YouTube, SoundCloud, MP3 directo o playlist…"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  className="jf-btn jf-btn--primary jf-link-submit-btn"
                  disabled={isResolving || !url.trim()}
                >
                  {isResolving ? (
                    <>
                      <SpinnerGap size={17} weight="bold" className="jf-spin" /> Resolviendo…
                    </>
                  ) : (
                    <>
                      <Sparkle size={17} weight="fill" /> Explorar
                    </>
                  )}
                </button>
              </div>
            </form>

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
            {resolved?.type === 'track' && (
              <motion.div
                className="jf-link-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="jf-link-card-media">
                  {resolved.thumbnail ? (
                    <img className="jf-link-cover" src={resolved.thumbnail} alt="" />
                  ) : (
                    <div className="jf-link-cover jf-link-cover--placeholder">
                      <MusicNotes size={32} weight="duotone" />
                    </div>
                  )}
                  <span className="jf-link-source-badge">
                    {resolved.source.includes('youtube') ? (
                      <YoutubeLogo size={14} weight="fill" />
                    ) : (
                      <Globe size={14} weight="fill" />
                    )}
                    {resolved.source.toUpperCase()}
                  </span>
                </div>

                <div className="jf-link-card-details">
                  <h3 className="jf-link-title">{resolved.title}</h3>
                  <p className="jf-link-artist">{resolved.artist}</p>
                  {resolved.duration && (
                    <p className="jf-link-duration">
                      <Clock size={13} /> {formatTime(resolved.duration)}
                    </p>
                  )}

                  {/* Acciones principales */}
                  <div className="jf-link-actions-row">
                    <button
                      type="button"
                      className="jf-btn jf-btn--primary"
                      onClick={() => handlePlayResolvedTrack(resolved)}
                    >
                      <Play size={16} weight="fill" /> Reproducir ahora
                    </button>
                    <button
                      type="button"
                      className="jf-btn jf-btn--secondary"
                      onClick={() => handleQueueTrack(resolved)}
                      title="Agregar a la cola"
                    >
                      <Queue size={16} /> A la cola
                    </button>
                    <button
                      type="button"
                      className="jf-btn jf-btn--secondary"
                      onClick={() => handleDownloadTrack(resolved)}
                      title="Descargar audio libremente a tu dispositivo"
                    >
                      <Download size={16} /> Descargar
                    </button>
                  </div>

                  {/* Sección de Sugerencia para Admin / Dev */}
                  <div className="jf-link-suggest-box">
                    <div className="jf-link-suggest-head">
                      <span>¿Quieres que esta canción esté para siempre en la app?</span>
                    </div>
                    {suggestedOk ? (
                      <div className="jf-link-suggest-success">
                        <CheckCircle size={18} weight="fill" />
                        <span>¡Sugerencia enviada! Un administrador la revisará para agregarla.</span>
                      </div>
                    ) : (
                      <div className="jf-link-suggest-form">
                        <input
                          type="text"
                          className="jf-input jf-link-notes-input"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Nota para el dev o admin (opcional: por qué debería agregarse)"
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
            {resolved?.type === 'playlist' && (
              <motion.div
                className="jf-link-playlist-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="jf-link-playlist-head">
                  {resolved.thumbnail && (
                    <img className="jf-link-playlist-cover" src={resolved.thumbnail} alt="" />
                  )}
                  <div>
                    <span className="jf-link-playlist-badge">Playlist Encontrada</span>
                    <h3 className="jf-link-playlist-title">{resolved.title}</h3>
                    <p className="jf-link-playlist-sub">
                      {resolved.count} canciones · Canal: {resolved.artist || 'Varios'}
                    </p>
                  </div>
                </div>

                <div className="jf-link-playlist-items">
                  {resolved.items.slice(0, 30).map((item, idx) => (
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
                      <button
                        type="button"
                        className="jf-btn-icon"
                        title="Explorar y reproducir esta canción"
                        onClick={async () => {
                          setUrl(item.url);
                          setIsResolving(true);
                          try {
                            const res = await linksService.resolveLink(item.url);
                            setResolved(res);
                          } catch {
                            // ignore
                          } finally {
                            setIsResolving(false);
                          }
                        }}
                      >
                        <Play size={14} weight="fill" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* Pestaña: Sugerencias de la comunidad */
          <div className="jf-suggestions-list-view">
            <div className="jf-suggestions-header">
              <p>Canciones propuestas por usuarios para añadir a la base de datos oficial:</p>
              <button
                type="button"
                className="jf-btn jf-btn--secondary jf-btn--sm"
                onClick={loadSuggestions}
                disabled={loadingSuggestions}
              >
                <ArrowsClockwise size={14} className={loadingSuggestions ? 'jf-spin' : ''} /> Actualizar
              </button>
            </div>

            {loadingSuggestions ? (
              <div className="jf-suggestions-loading">
                <SpinnerGap size={28} className="jf-spin" />
                <p>Cargando sugerencias…</p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="jf-suggestions-empty">
                <ThumbsUp size={36} weight="duotone" />
                <p>No hay canciones sugeridas todavía. ¡Sé el primero en proponer una!</p>
              </div>
            ) : (
              <ul className="jf-suggestions-list">
                {suggestions.map((sug) => (
                  <li key={sug.id} className={`jf-suggestion-item is-${sug.status}`}>
                    {sug.thumbnail ? (
                      <img className="jf-suggestion-thumb" src={sug.thumbnail} alt="" />
                    ) : (
                      <div className="jf-suggestion-thumb jf-suggestion-thumb--placeholder">
                        <MusicNotes size={20} />
                      </div>
                    )}
                    <div className="jf-suggestion-info">
                      <span className="jf-suggestion-title">{sug.title}</span>
                      <span className="jf-suggestion-artist">
                        {sug.artist} · Propuesto por <strong>{sug.suggested_by}</strong>
                      </span>
                      {sug.notes && <p className="jf-suggestion-notes">«{sug.notes}»</p>}
                    </div>

                    <div className="jf-suggestion-status-box">
                      {sug.status === 'approved' ? (
                        <span className="jf-sug-badge jf-sug-badge--approved">
                          <CheckCircle size={14} weight="fill" /> En la DB
                        </span>
                      ) : (
                        <span className="jf-sug-badge jf-sug-badge--pending">Pendiente</span>
                      )}
                    </div>

                    {(isAdmin || isDev) && sug.status === 'pending' && (
                      <div className="jf-suggestion-admin-actions">
                        <button
                          type="button"
                          className="jf-btn jf-btn--primary jf-btn--sm"
                          disabled={approvingId === sug.id}
                          onClick={() => handleApprove(sug.id)}
                          title="Descargar audio y agregarlo automáticamente a la Base de Datos"
                        >
                          {approvingId === sug.id ? (
                            <>
                              <SpinnerGap size={13} className="jf-spin" /> Guardando en DB…
                            </>
                          ) : (
                            <>
                              <Database size={13} weight="fill" /> Aprobar y Guardar en DB
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="jf-btn-icon jf-btn-icon--danger"
                          onClick={() => handleDeleteSuggestion(sug.id)}
                          title="Descartar sugerencia"
                        >
                          <Trash size={15} />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
