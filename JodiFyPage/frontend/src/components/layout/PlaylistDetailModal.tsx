import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Play,
  Shuffle,
  Trash,
  DotsSixVertical,
  MusicNotes,
  Clock,
  User,
} from '@phosphor-icons/react';
import { useUiStore } from '../../store/ui.store';
import { usePlaylistsStore, CustomPlaylist } from '../../store/playlists.store';
import { useLibraryStore } from '../../store/library.store';
import { playSong } from '../../services/player.service';
import { usePlayerStore } from '../../store/player.store';
import { useToastStore } from '../../store/toast.store';
import { SongCover } from '../ui/SongCover';
import { formatDuration, shuffleArray } from '../../lib/utils';
import type { Song } from '../../lib/types';

export function PlaylistDetailModal() {
  const ui = useUiStore();
  const playlists = usePlaylistsStore((s) => s.playlists);
  const playPlaylist = usePlaylistsStore((s) => s.playPlaylist);
  const deletePlaylist = usePlaylistsStore((s) => s.deletePlaylist);
  const removeSongFromPlaylist = usePlaylistsStore((s) => s.removeSongFromPlaylist);
  const reorderPlaylistSongs = usePlaylistsStore((s) => s.reorderPlaylistSongs);
  const librarySongs = useLibraryStore((s) => s.songs);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const dragOccurredRef = useRef(false);

  const isOpen = ui.modal === 'playlistDetail';
  const playlistId = ui.modalPayload?.playlistId as string | undefined;

  const playlist: CustomPlaylist | undefined = useMemo(() => {
    if (!playlistId) return undefined;
    return playlists.find((p) => p.id === playlistId);
  }, [playlists, playlistId]);

  const playlistSongs: Song[] = useMemo(() => {
    if (!playlist) return [];
    const songMap = new Map(librarySongs.map((s) => [String(s.id), s]));
    return playlist.songIds
      .map((id) => songMap.get(String(id)))
      .filter((s): s is Song => Boolean(s));
  }, [playlist, librarySongs]);

  const totalDuration = useMemo(() => {
    return playlistSongs.reduce((acc, s) => acc + (typeof s.duration === 'number' ? s.duration : 0), 0);
  }, [playlistSongs]);

  if (!isOpen || !playlist) return null;

  const handlePlaySong = async (song: Song) => {
    if (dragOccurredRef.current) return;
    await playSong(song);
    usePlayerStore.getState().setIsPlaying(true);
  };

  const handleShufflePlay = async () => {
    if (playlistSongs.length === 0) return;
    const shuffled = shuffleArray([...playlistSongs]);
    const { useQueueStore } = await import('../../store/queue.store');
    const queue = useQueueStore.getState();
    queue.clear();
    if (shuffled.length > 1) {
      queue.addMany(shuffled.slice(1));
    }
    await playSong(shuffled[0]);
    usePlayerStore.getState().setIsPlaying(true);
    useToastStore.getState().show(`Reproduciendo «${playlist.name}» en aleatorio`, 'success', 2200);
  };

  const handleRemove = (e: React.MouseEvent, songId: string | number) => {
    e.stopPropagation();
    removeSongFromPlaylist(playlist.id, String(songId));
  };

  const handleDelete = () => {
    if (window.confirm(`¿Estás seguro de eliminar la playlist «${playlist.name}»?`)) {
      deletePlaylist(playlist.id);
      ui.close('playlistDetail');
    }
  };

  return (
    <AnimatePresence>
      <div className="jf-modal-backdrop" onClick={() => ui.close('playlistDetail')}>
        <motion.div
          className="jf-pl-modal"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hero Banner Header */}
          <div
            className="jf-pl-modal-hero"
            style={{
              background: playlist.color || 'linear-gradient(135deg, #7f00ff 0%, #00f0ff 100%)',
            }}
          >
            <div className="jf-pl-modal-hero-pattern" />
            <button
              type="button"
              className="jf-pl-modal-close"
              onClick={() => ui.close('playlistDetail')}
              title="Cerrar ventana"
            >
              <X size={18} weight="bold" />
            </button>

            <div className="jf-pl-modal-hero-content">
              <div className="jf-pl-modal-big-icon">
                <MusicNotes size={48} weight="duotone" />
              </div>

              <div className="jf-pl-modal-meta">
                <span className="jf-pl-badge">PLAYLIST PERSONALIZADA</span>
                <h2 className="jf-pl-modal-title" title={playlist.name}>
                  {playlist.name}
                </h2>
                {playlist.description && (
                  <p className="jf-pl-modal-desc">{playlist.description}</p>
                )}
                <div className="jf-pl-modal-info-row">
                  <span className="jf-pl-info-chip">
                    <User size={13} weight="bold" /> {playlist.createdBy || 'Usuario'}
                  </span>
                  <span className="jf-pl-info-dot" />
                  <span className="jf-pl-info-chip">
                    <MusicNotes size={13} /> {playlistSongs.length} {playlistSongs.length === 1 ? 'canción' : 'canciones'}
                  </span>
                  {totalDuration > 0 && (
                    <>
                      <span className="jf-pl-info-dot" />
                      <span className="jf-pl-info-chip">
                        <Clock size={13} /> {formatDuration(totalDuration)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="jf-pl-modal-toolbar">
            <div className="jf-pl-toolbar-left">
              <button
                type="button"
                className="jf-pl-btn-play"
                disabled={playlistSongs.length === 0}
                onClick={() => void playPlaylist(playlist.id)}
                title="Reproducir playlist completa en orden"
              >
                <Play size={18} weight="fill" />
                <span>Reproducir Toda</span>
              </button>
              <button
                type="button"
                className="jf-pl-btn-secondary"
                disabled={playlistSongs.length === 0}
                onClick={() => void handleShufflePlay()}
                title="Reproducir en orden aleatorio"
              >
                <Shuffle size={16} weight="bold" />
                <span>Aleatorio</span>
              </button>
            </div>

            <div className="jf-pl-toolbar-right">
              <span className="jf-pl-drag-hint" title="Mantén presionado y arrastra para reordenar las canciones">
                <DotsSixVertical size={14} weight="bold" /> Arrastra para reordenar
              </span>
              <button
                type="button"
                className="jf-pl-btn-danger"
                onClick={handleDelete}
                title="Eliminar esta playlist"
              >
                <Trash size={15} />
              </button>
            </div>
          </div>

          {/* Song List with Drag & Drop */}
          <div className="jf-pl-modal-body">
            {playlistSongs.length === 0 ? (
              <div className="jf-pl-empty">
                <MusicNotes size={46} weight="duotone" />
                <h3>Esta playlist está vacía</h3>
                <p>
                  Agrega canciones haciendo clic en el menú de tres puntos o el botón de playlist en cualquier canción.
                </p>
              </div>
            ) : (
              <div className="jf-pl-songs-table">
                <div className="jf-pl-table-header">
                  <span className="jf-pl-col-idx">#</span>
                  <span className="jf-pl-col-main">Título</span>
                  <span className="jf-pl-col-artist">Artista</span>
                  <span className="jf-pl-col-time">Duración</span>
                  <span className="jf-pl-col-actions"></span>
                </div>

                <div className="jf-pl-table-rows">
                  {playlistSongs.map((song, index) => {
                    const isCurrent = currentSong?.id === song.id;
                    const isDragging = draggingIdx === index;
                    const isDragOver = dragOverIdx === index;

                    return (
                      <div
                        key={`pl-song-${song.id}-${index}`}
                        className={`jf-pl-song-row ${isCurrent ? 'is-active' : ''} ${isDragging ? 'is-dragging' : ''} ${isDragOver ? 'is-drag-over' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          dragOccurredRef.current = true;
                          setDraggingIdx(index);
                          e.dataTransfer.setData('text/plain', String(index));
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverIdx !== index) setDragOverIdx(index);
                        }}
                        onDragLeave={() => {
                          setDragOverIdx((cur) => (cur === index ? null : cur));
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromIndex = Number(e.dataTransfer.getData('text/plain'));
                          setDragOverIdx(null);
                          setDraggingIdx(null);
                          if (!Number.isNaN(fromIndex) && fromIndex !== index) {
                            reorderPlaylistSongs(playlist.id, fromIndex, index);
                            useToastStore.getState().show('Orden de la playlist actualizado', 'success', 1200);
                          }
                          setTimeout(() => {
                            dragOccurredRef.current = false;
                          }, 120);
                        }}
                        onDragEnd={() => {
                          setDragOverIdx(null);
                          setDraggingIdx(null);
                          setTimeout(() => {
                            dragOccurredRef.current = false;
                          }, 120);
                        }}
                        onClick={() => void handlePlaySong(song)}
                        title="Mantén pulsado y arrastra para mover de posición"
                      >
                        {isDragOver && <div className="jf-pl-drop-line" aria-hidden="true" />}

                        <div className="jf-pl-col-idx">
                          <span className="jf-pl-drag-handle" title="Mantén presionado y arrastra para acomodar">
                            <DotsSixVertical size={16} weight="bold" />
                          </span>
                          <span className="jf-pl-idx-num">{index + 1}</span>
                          {isCurrent && isPlaying && (
                            <span className="jf-pl-playing-bars">
                              <span /><span /><span />
                            </span>
                          )}
                        </div>

                        <div className="jf-pl-col-main">
                          <SongCover song={song} alt="" className="jf-pl-song-thumb" />
                          <div className="jf-pl-song-meta">
                            <span className="jf-pl-song-title">{song.name}</span>
                            <span className="jf-pl-song-sub">{song.artist || song.added_by || 'JodiFy'}</span>
                          </div>
                        </div>

                        <div className="jf-pl-col-artist">
                          <span>{song.artist || song.added_by || '—'}</span>
                        </div>

                        <div className="jf-pl-col-time">
                          <span>{typeof song.duration === 'number' && song.duration > 0 ? formatDuration(song.duration) : '—'}</span>
                        </div>

                        <div className="jf-pl-col-actions">
                          <button
                            type="button"
                            className="jf-pl-action-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handlePlaySong(song);
                            }}
                            title="Reproducir ahora"
                          >
                            <Play size={14} weight="fill" />
                          </button>
                          <button
                            type="button"
                            className="jf-pl-action-icon is-remove"
                            onClick={(e) => handleRemove(e, song.id)}
                            title="Quitar de esta playlist"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
