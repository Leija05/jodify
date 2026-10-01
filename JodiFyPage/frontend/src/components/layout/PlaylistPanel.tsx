import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  MagnifyingGlass,
  Queue,
  SlidersHorizontal,
  TerminalWindow,
  UsersThree,
  Users,
  GearSix,
  ArrowDown,
  Shuffle,
  MusicNotes,
  CloudSlash,
  Playlist,
  Plus,
  Play,
  Trash,
  ArrowLeft,
  DotsSixVertical,
} from '@phosphor-icons/react';
import { Segmented } from '../ui/Segmented';
import { IconButton } from '../ui/IconButton';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { SongRow } from '../player/SongRow';
import { SongCover } from '../ui/SongCover';
import { SongListSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { useUiStore } from '../../store/ui.store';
import { useLibraryStore, selectFilteredSongs } from '../../store/library.store';
import { useBackendStore } from '../../store/backend.store';
import { useUploadStore } from '../../store/upload.store';
import { useQueueStore } from '../../store/queue.store';
import { useSettingsStore } from '../../store/settings.store';
import { usePlaylistsStore, CustomPlaylist } from '../../store/playlists.store';
import { useIsAdmin, useIsDev, useSession } from '../../context/SessionContext';
import type { Tab, Song } from '../../lib/types';
import { formatTime, formatDuration, resolveAvatarSrc } from '../../lib/utils';
import { useSleepTimer } from '../../hooks/useSleepTimer';
import { usePlayerStore } from '../../store/player.store';
import { playSong } from '../../services/player.service';
import { useToastStore } from '../../store/toast.store';

const ease = [0.16, 1, 0.3, 1] as const;

export function PlaylistPanel() {
  const isAdmin = useIsAdmin();
  const isDev = useIsDev();
  const ui = useUiStore();
  const { session } = useSession();
  const library = useLibraryStore();
  const backendStatus = useBackendStore((s) => s.status);
  const backendRetrying = useBackendStore((s) => s.retrying);
  const checkBackendNow = useBackendStore((s) => s.checkNow);
  const queueCount = useQueueStore((s) => s.items.length);
  const settings = useSettingsStore();
  const { remainingMs, totalMs } = useSleepTimer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const playlists = usePlaylistsStore((s) => s.playlists);
  const playPlaylist = usePlaylistsStore((s) => s.playPlaylist);
  const deletePlaylist = usePlaylistsStore((s) => s.deletePlaylist);
  const removeSongFromPlaylist = usePlaylistsStore((s) => s.removeSongFromPlaylist);
  const reorderPlaylistSongs = usePlaylistsStore((s) => s.reorderPlaylistSongs);
  const currentSong = usePlayerStore((s) => s.currentSong);

  const [viewingPlaylistId, setViewingPlaylistId] = useState<string | null>(null);
  const [plDragOverIdx, setPlDragOverIdx] = useState<number | null>(null);
  const [plDraggingIdx, setPlDraggingIdx] = useState<number | null>(null);
  const plDragOccurredRef = useRef(false);

  const filtered = useMemo(() => selectFilteredSongs(library), [library]);

  const viewingPlaylist: CustomPlaylist | null = useMemo(() => {
    if (!viewingPlaylistId) return null;
    return playlists.find((p) => p.id === viewingPlaylistId) || null;
  }, [playlists, viewingPlaylistId]);

  const viewingPlaylistSongs: Song[] = useMemo(() => {
    if (!viewingPlaylist) return [];
    const songMap = new Map(library.songs.map((s) => [String(s.id), s]));
    return viewingPlaylist.songIds
      .map((id) => songMap.get(String(id)))
      .filter((s): s is Song => Boolean(s));
  }, [viewingPlaylist, library.songs]);

  const viewingPlaylistDuration = useMemo(() => {
    return viewingPlaylistSongs.reduce(
      (acc, s) => acc + (typeof s.duration === 'number' ? s.duration : 0),
      0,
    );
  }, [viewingPlaylistSongs]);

  useEffect(() => {
    const timer = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    useUploadStore.getState().enqueueFiles(Array.from(files), session?.username ?? '');
  };

  const sleepProgress = remainingMs != null && totalMs ? 1 - remainingMs / totalMs : null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isAdmin) return;
    handleFiles(e.dataTransfer.files);
  };

  const isPlaylistsTab = library.currentTab === 'playlists';

  return (
    <aside
      className={`jf-playlist ${isDragging ? 'is-dragging' : ''}`}
      data-testid="playlist-panel"
      onDragEnter={(e) => {
        if (isAdmin) e.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(e) => {
        if (isAdmin) e.preventDefault();
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      <motion.header
        className="jf-playlist-topbar"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
      >
        <div className="jf-playlist-identity">
          {session && (
            <div className={`jf-avatar-frame-wrap ${session.avatar_frame && session.avatar_frame !== 'none' ? `jf-avatar-frame--${session.avatar_frame}` : ''}`} style={{ padding: 2 }}>
              <Avatar
                username={session.display_name || session.username}
                src={resolveAvatarSrc(session)}
                size={30}
                presence="online"
                onClick={() => ui.open('profile')}
              />
            </div>
          )}
          <span className="jf-playlist-brandmark">
            <img className="jf-brandmark-logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="JodiFy" />
            JodiFy
          </span>
        </div>
        <div className="jf-playlist-actions">
          <IconButton size="sm" icon={Queue} label="Cola" active={ui.modal === 'queue'} onClick={() => ui.toggle('queue')}>
            {queueCount > 0 && <span className="jf-badge-count">{queueCount}</span>}
          </IconButton>
          <IconButton size="sm" icon={UsersThree} label="Jam" active={ui.modal === 'jam'} onClick={() => ui.toggle('jam')} />
          <IconButton size="sm" icon={Users} label="Miembros" active={ui.modal === 'community'} onClick={() => ui.toggle('community')} />
          <IconButton size="sm" icon={SlidersHorizontal} label="Ecualizador" active={ui.modal === 'equalizer'} onClick={() => ui.toggle('equalizer')} />
          <IconButton size="sm" icon={GearSix} label="Ajustes" onClick={() => ui.toggle('settings')} />
          {isDev && (
            <IconButton
              size="sm"
              icon={TerminalWindow}
              label="Panel dev"
              active={ui.modal === 'devCenter'}
              onClick={() => ui.toggle('devCenter')}
            />
          )}
        </div>
      </motion.header>

      <motion.section
        className="jf-playlist-library"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease, delay: 0.06 }}
      >
        <div className="jf-library-head">
          <span className="jf-eyebrow">
            <span className="jf-eyebrow-dot" />
            Tu colección
          </span>
          <span className="jf-library-count">
            {isPlaylistsTab
              ? (viewingPlaylist ? viewingPlaylistSongs.length : playlists.length)
              : filtered.length}
          </span>
        </div>
        <Segmented<Tab>
          value={library.currentTab}
          onChange={(tab) => {
            library.setCurrentTab(tab);
            if (tab === 'downloads') void enterDownloadsTab();
            if (tab !== 'playlists') setViewingPlaylistId(null);
          }}
          options={[
            { value: 'global', label: 'Global' },
            { value: 'personal', label: 'Favoritas' },
            { value: 'downloads', label: 'Descargadas' },
            { value: 'playlists', label: 'Playlists' },
          ]}
        />
      </motion.section>

      {/* Barra de herramientas para canciones o modo playlists */}
      {!isPlaylistsTab ? (
        <motion.div
          className="jf-playlist-tools"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease, delay: 0.12 }}
        >
          <div className="jf-search">
            <MagnifyingGlass size={16} />
            <input
              type="search"
              placeholder="Buscar canciones…"
              value={library.searchTerm}
              onChange={(e) => library.setSearchTerm(e.target.value)}
              aria-label="Buscar"
              data-testid="search-input"
            />
          </div>
          <select
            className="jf-select"
            value={library.currentSort}
            onChange={(e) => library.setCurrentSort(e.target.value as never)}
            aria-label="Ordenar"
          >
            <option value="recent">Recientes</option>
            <option value="old">Antiguas</option>
            <option value="popular">Populares</option>
            <option value="artist">Artista</option>
            <option value="name">Nombre</option>
          </select>
          {isAdmin && (
            <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()} className="jf-add-song-btn">
              <MusicNotes size={15} weight="fill" /> Subir
            </Button>
          )}
        </motion.div>
      ) : viewingPlaylist ? (
        /* Barra de navegación de playlist interna */
        <div className="jf-pl-sidebar-nav">
          <button
            type="button"
            className="jf-pl-back-btn"
            onClick={() => setViewingPlaylistId(null)}
            title="Volver a la lista de playlists"
          >
            <ArrowLeft size={15} weight="bold" />
            <span>Volver a Playlists</span>
          </button>

          <button
            type="button"
            className="jf-pl-btn-play-mini"
            disabled={viewingPlaylistSongs.length === 0}
            onClick={() => void playPlaylist(viewingPlaylist.id)}
            title="Reproducir toda la playlist"
          >
            <Play size={13} weight="fill" />
            <span>Reproducir Toda</span>
          </button>
        </div>
      ) : (
        /* Barra de creación de playlists */
        <div className="jf-pl-sidebar-tools">
          <span className="jf-pl-sidebar-title">
            <Playlist size={16} weight="bold" /> Colecciones ({playlists.length})
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => ui.open('createPlaylist')}
            className="jf-pl-new-btn"
          >
            <Plus size={14} weight="bold" /> Nueva Playlist
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.opus,.webm,.wma,.oga,.aiff"
        multiple
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <motion.div
        className="jf-playlist-stats"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease, delay: 0.18 }}
      >
        <span className="jf-stat-chip-line">
          <Shuffle size={12} /> {formatTime(sessionSeconds)} de sesión
        </span>
        <span className="jf-stat-chip-line">
          <Queue size={12} /> {queueCount} en cola
        </span>
        {settings.sleepTimer && (
          <span className="jf-stat-chip-line jf-stat-chip-line--timer">
            {sleepProgress != null && (
              <span className="jf-timer-bar">
                <span style={{ width: `${sleepProgress * 100}%` }} />
              </span>
            )}
            Dormir {remainingMs != null ? formatTime(remainingMs / 1000) : '…'}
          </span>
        )}
      </motion.div>

      {library.currentTab === 'downloads' && (
        <div className="jf-smart-mix">
          <Button variant="glass" size="sm" onClick={() => void smartMix()}>
            <ArrowDown size={14} /> Mix de descargas
          </Button>
        </div>
      )}

      {/* ÁREA DE CONTENIDO (Canciones normales vs Playlists) */}
      <div className="jf-song-list-scroll">
        {isPlaylistsTab ? (
          viewingPlaylist ? (
            /* Vista de detalle de playlist dentro del sidebar con Drag & Drop */
            <div className="jf-pl-sidebar-detail">
              <div
                className="jf-pl-sidebar-header-card"
                style={{ background: viewingPlaylist.color || 'linear-gradient(135deg, #7f00ff, #00f0ff)' }}
              >
                <div className="jf-pl-sidebar-card-info">
                  <h4 className="jf-pl-sidebar-card-name">{viewingPlaylist.name}</h4>
                  <p className="jf-pl-sidebar-card-meta">
                    {viewingPlaylistSongs.length} temas
                    {viewingPlaylistDuration > 0 && ` · ${formatDuration(viewingPlaylistDuration)}`}
                  </p>
                </div>
              </div>

              <div className="jf-pl-drag-legend">
                <DotsSixVertical size={13} />
                <span>Mantén presionado y arrastra para reordenar</span>
              </div>

              {viewingPlaylistSongs.length === 0 ? (
                <EmptyState
                  icon={MusicNotes}
                  title="Playlist sin canciones"
                  description="Haz clic derecho en cualquier canción de la biblioteca para añadirla aquí."
                />
              ) : (
                <ul className="jf-pl-sidebar-songs-list">
                  {viewingPlaylistSongs.map((song, index) => {
                    const isCurrent = currentSong?.id === song.id;
                    const isDraggingThis = plDraggingIdx === index;
                    const isOverThis = plDragOverIdx === index;

                    return (
                      <li
                        key={`pl-sidebar-song-${song.id}-${index}`}
                        className={`jf-pl-sidebar-song-row ${isCurrent ? 'is-active' : ''} ${isDraggingThis ? 'is-dragging' : ''} ${isOverThis ? 'is-drag-over' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          plDragOccurredRef.current = true;
                          setPlDraggingIdx(index);
                          e.dataTransfer.setData('text/plain', String(index));
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (plDragOverIdx !== index) setPlDragOverIdx(index);
                        }}
                        onDragLeave={() => {
                          setPlDragOverIdx((cur) => (cur === index ? null : cur));
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromIdx = Number(e.dataTransfer.getData('text/plain'));
                          setPlDragOverIdx(null);
                          setPlDraggingIdx(null);
                          if (!Number.isNaN(fromIdx) && fromIdx !== index) {
                            reorderPlaylistSongs(viewingPlaylist.id, fromIdx, index);
                            useToastStore.getState().show('Orden de la playlist actualizado', 'success', 1200);
                          }
                          setTimeout(() => {
                            plDragOccurredRef.current = false;
                          }, 120);
                        }}
                        onDragEnd={() => {
                          setPlDragOverIdx(null);
                          setPlDraggingIdx(null);
                          setTimeout(() => {
                            plDragOccurredRef.current = false;
                          }, 120);
                        }}
                        onClick={() => {
                          if (plDragOccurredRef.current) return;
                          void playSong(song);
                          usePlayerStore.getState().setIsPlaying(true);
                        }}
                        title="Mantén pulsado y arrastra para reordenar"
                      >
                        {isOverThis && <span className="jf-queue-drop-line" aria-hidden="true" />}
                        <span className="jf-pl-sidebar-grip" aria-hidden="true">
                          <DotsSixVertical size={14} weight="bold" />
                        </span>
                        <SongCover song={song} alt="" className="jf-pl-sidebar-cover" />
                        <div className="jf-pl-sidebar-meta">
                          <span className="jf-pl-sidebar-song-name">{song.name}</span>
                          <span className="jf-pl-sidebar-song-artist">{song.artist || song.added_by || 'JodiFy'}</span>
                        </div>
                        {typeof song.duration === 'number' && song.duration > 0 && (
                          <span className="jf-pl-sidebar-duration">{formatDuration(song.duration)}</span>
                        )}
                        <button
                          type="button"
                          className="jf-pl-sidebar-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSongFromPlaylist(viewingPlaylist.id, String(song.id));
                          }}
                          title="Quitar canción de la playlist"
                        >
                          <Trash size={13} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            /* Lista de Playlists para reproducir directamente o abrir */
            <div className="jf-pl-sidebar-list">
              {playlists.length === 0 ? (
                <EmptyState
                  icon={Playlist}
                  title="No tienes playlists aún"
                  description="Crea tu primera lista de reproducción personalizada para organizar tu música favorita."
                  actionLabel="Crear Playlist"
                  onAction={() => ui.open('createPlaylist')}
                />
              ) : (
                <ul className="jf-pl-cards-list">
                  {playlists.map((pl) => (
                    <li
                      key={pl.id}
                      className="jf-pl-sidebar-card-item"
                      onClick={() => setViewingPlaylistId(pl.id)}
                      title="Haz clic para abrir y ver todas las canciones de la playlist"
                    >
                      <div className="jf-pl-sidebar-card-thumb" style={{ background: pl.color || '#7f00ff', overflow: 'hidden' }}>
                        {pl.coverUrl ? (
                          <img src={pl.coverUrl} alt={pl.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <MusicNotes size={18} weight="duotone" />
                        )}
                      </div>
                      <div className="jf-pl-sidebar-card-details">
                        <span className="jf-pl-sidebar-card-title">{pl.name}</span>
                        <span className="jf-pl-sidebar-card-count">
                          {pl.songIds.length} {pl.songIds.length === 1 ? 'canción' : 'canciones'}
                        </span>
                      </div>
                      <div className="jf-pl-sidebar-card-actions">
                        <button
                          type="button"
                          className="jf-pl-play-pill"
                          onClick={(e) => {
                            e.stopPropagation();
                            void playPlaylist(pl.id);
                          }}
                          title={`Reproducir playlist ${pl.name} de principio a fin`}
                        >
                          <Play size={13} weight="fill" />
                        </button>
                        <button
                          type="button"
                          className="jf-pl-trash-pill"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`¿Eliminar «${pl.name}»?`)) {
                              deletePlaylist(pl.id);
                            }
                          }}
                          title="Eliminar playlist"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        ) : !library.loaded ? (
          <SongListSkeleton />
        ) : filtered.length === 0 ? (
          backendStatus === 'offline' && library.currentTab !== 'downloads' ? (
            <EmptyState
              icon={CloudSlash}
              title="Servidor backend inactivo"
              description="No se pudieron cargar las canciones del servidor. La app reconectará en tiempo real en cuanto el backend esté activo."
              actionLabel={backendRetrying ? 'Comprobando…' : 'Reintentar ahora'}
              onAction={() => void checkBackendNow(true)}
            />
          ) : (
            <EmptyState
              icon={MusicNotes}
              title={library.currentTab === 'downloads' ? 'Nada descargado aún' : library.searchTerm ? 'Sin resultados' : 'Biblioteca vacía'}
              description={library.currentTab === 'downloads' ? 'Descarga canciones para escucharlas sin conexión.' : undefined}
            />
          )
        ) : (
          <ul className="jf-song-list">
            {filtered.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} />
            ))}
          </ul>
        )}
      </div>

      <footer className="jf-playlist-footer">
        <span className="jf-footer-stat">
          {isPlaylistsTab
            ? `${viewingPlaylist ? viewingPlaylistSongs.length : playlists.length} ${viewingPlaylist ? 'canciones' : 'playlists'}`
            : `${filtered.length} canciones`}
        </span>
        <span className="jf-footer-sep" />
        <span className="jf-footer-stat">{formatTime(sessionSeconds)} en sesión</span>
        <span className="jf-footer-sep" />
        <span className="jf-footer-stat jf-footer-stat--muted">JodiFy 2.0</span>
      </footer>
    </aside>
  );
}

async function smartMix(): Promise<void> {
  const { shuffleArray } = await import('../../lib/utils');
  const library = useLibraryStore.getState();
  const pool = library.songs.filter((s) => library.downloadedIds.includes(s.id));
  if (pool.length === 0) return;
  const { playSong } = await import('../../services/player.service');
  await playSong(shuffleArray(pool)[0]);
  usePlayerStore.getState().setIsPlaying(true);
}

async function enterDownloadsTab(): Promise<void> {
  const { getAllOfflineIds } = await import('../../lib/idb');
  const ids = await getAllOfflineIds();
  useLibraryStore.getState().setDownloadedIds(ids);
}
