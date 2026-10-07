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
  Camera,
  PencilSimple,
  UploadSimple,
  Check,
} from '@phosphor-icons/react';
import { useUiStore } from '../../store/ui.store';
import { usePlaylistsStore, CustomPlaylist } from '../../store/playlists.store';
import { useLibraryStore } from '../../store/library.store';
import { usePlayerStore } from '../../store/player.store';
import { useToastStore } from '../../store/toast.store';
import { SongCover } from '../ui/SongCover';
import { formatDuration, shuffleArray } from '../../lib/utils';
import { confirmDialog } from '../../store/confirm.store';
import type { Song } from '../../lib/types';

export function PlaylistDetailModal() {
  const ui = useUiStore();
  const playlists = usePlaylistsStore((s) => s.playlists);
  const playPlaylist = usePlaylistsStore((s) => s.playPlaylist);
  const deletePlaylist = usePlaylistsStore((s) => s.deletePlaylist);
  const updatePlaylist = usePlaylistsStore((s) => s.updatePlaylist);
  const removeSongFromPlaylist = usePlaylistsStore((s) => s.removeSongFromPlaylist);
  const reorderPlaylistSongs = usePlaylistsStore((s) => s.reorderPlaylistSongs);
  const librarySongs = useLibraryStore((s) => s.songs);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCover, setEditCover] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    await usePlayerStore.getState().playWithContext(
      song,
      playlistSongs,
      `Playlist: ${playlist.name}`,
      'playlist'
    );
  };

  const handleShufflePlay = async () => {
    if (playlistSongs.length === 0) return;
    const player = usePlayerStore.getState();
    player.setShuffle(true);
    const shuffled = shuffleArray([...playlistSongs]);
    await player.playWithContext(
      shuffled[0],
      playlistSongs,
      `Playlist: ${playlist.name}`,
      'playlist'
    );
    useToastStore.getState().show(`Reproduciendo «${playlist.name}» en aleatorio 🔀`, 'success', 2200);
  };

  const handleRemove = async (e: React.MouseEvent, songId: string | number) => {
    e.stopPropagation();
    const song = playlistSongs.find((s) => String(s.id) === String(songId));
    const ok = await confirmDialog({
      title: 'Quitar de la playlist',
      message: `¿Deseas quitar «${song?.name || 'esta canción'}» de la playlist?`,
      confirmLabel: 'Quitar',
      tone: 'danger',
      icon: 'trash',
    });
    if (ok) {
      removeSongFromPlaylist(playlist.id, String(songId));
    }
  };

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: `Eliminar playlist «${playlist.name}»`,
      message: '¿Estás seguro de que deseas eliminar esta playlist? Esta acción eliminará su lista personalizada y no se puede deshacer.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
      icon: 'trash',
    });
    if (ok) {
      deletePlaylist(playlist.id);
      ui.close('playlistDetail');
    }
  };

  const openEditor = () => {
    setEditName(playlist.name);
    setEditDesc(playlist.description || '');
    setEditCover(playlist.coverUrl || '');
    setIsEditing(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      useToastStore.getState().show('La imagen no debe superar los 10MB', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        setEditCover(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    updatePlaylist(playlist.id, {
      name: editName.trim(),
      description: editDesc.trim() || undefined,
      coverUrl: editCover.trim() || undefined,
    });
    setIsEditing(false);
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
              <div
                className="jf-pl-modal-cover-wrapper"
                onClick={openEditor}
                title="Haz clic para cambiar la foto de portada"
              >
                {playlist.coverUrl ? (
                  <img
                    src={playlist.coverUrl}
                    alt={playlist.name}
                    className="jf-pl-modal-cover-img"
                  />
                ) : (
                  <div className="jf-pl-modal-big-icon">
                    <MusicNotes size={48} weight="duotone" />
                  </div>
                )}
                <div className="jf-pl-cover-hover-overlay">
                  <Camera size={26} weight="fill" />
                  <span>Cambiar Foto</span>
                </div>
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
              <button
                type="button"
                className="jf-pl-btn-secondary"
                onClick={openEditor}
                title="Cambiar foto de portada o editar nombre de la playlist"
              >
                <PencilSimple size={15} weight="bold" />
                <span>Editar Portada</span>
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

          {/* Sub-modal para Editar Portada y Detalles */}
          {isEditing && (
            <div className="jf-pl-edit-overlay" onClick={() => setIsEditing(false)}>
              <div className="jf-pl-edit-card" onClick={(e) => e.stopPropagation()}>
                <div className="jf-pl-edit-header">
                  <h3>Personalizar Portada de la Playlist</h3>
                  <button
                    type="button"
                    className="jf-pl-modal-close"
                    style={{ position: 'static', width: 30, height: 30 }}
                    onClick={() => setIsEditing(false)}
                    title="Cerrar"
                  >
                    <X size={15} weight="bold" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdits} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Vista previa de portada y controles de carga */}
                  <div className="jf-pl-edit-preview-row">
                    <div className="jf-pl-edit-thumb-box" style={{ background: playlist.color }}>
                      {editCover ? (
                        <img src={editCover} alt="" />
                      ) : (
                        <MusicNotes size={32} weight="duotone" />
                      )}
                    </div>
                    <div className="jf-pl-edit-thumb-actions">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleImageUpload}
                      />
                      <button
                        type="button"
                        className="jf-btn jf-btn--primary"
                        style={{ padding: '7px 14px', fontSize: 12, justifyContent: 'flex-start' }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <UploadSimple size={15} weight="bold" /> Subir foto desde el equipo
                      </button>
                      {editCover && (
                        <button
                          type="button"
                          className="jf-btn"
                          style={{ padding: '4px 8px', fontSize: 11, color: '#f87171', justifyContent: 'flex-start', background: 'transparent' }}
                          onClick={() => setEditCover('')}
                        >
                          <Trash size={13} /> Quitar foto actual
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="jf-form-field">
                    <label className="jf-form-label" style={{ fontSize: 12 }}>
                      O pega el enlace URL de la imagen
                    </label>
                    <input
                      type="text"
                      className="jf-input"
                      value={editCover}
                      onChange={(e) => setEditCover(e.target.value)}
                      placeholder="https://ejemplo.com/portada.jpg"
                      style={{ fontSize: 13 }}
                    />
                  </div>

                  <div className="jf-form-field">
                    <label className="jf-form-label" style={{ fontSize: 12 }}>
                      Nombre de la playlist
                    </label>
                    <input
                      type="text"
                      className="jf-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nombre de la playlist"
                      maxLength={60}
                      required
                      style={{ fontSize: 13 }}
                    />
                  </div>

                  <div className="jf-form-field">
                    <label className="jf-form-label" style={{ fontSize: 12 }}>
                      Descripción (opcional)
                    </label>
                    <textarea
                      className="jf-input jf-textarea"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Descripción de la playlist"
                      rows={2}
                      maxLength={150}
                      style={{ fontSize: 13 }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      className="jf-btn jf-btn--secondary"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="jf-btn jf-btn--primary"
                      disabled={!editName.trim()}
                    >
                      <Check size={14} weight="bold" /> Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
