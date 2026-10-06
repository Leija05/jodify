import { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  MagnifyingGlass,
  MusicNotes,
  Square,
  Trash,
  TrashSimple,
} from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { useUiStore } from '../../store/ui.store';
import { useLibraryStore } from '../../store/library.store';
import { usePlayerStore } from '../../store/player.store';
import { useQueueStore } from '../../store/queue.store';
import { useToastStore } from '../../store/toast.store';
import { songsService } from '../../services/songs.service';
import { logsService } from '../../services/social.service';
import { useSession } from '../../context/SessionContext';
import { confirmDialog } from '../../store/confirm.store';
import { formatDuration, resolveMediaUrl } from '../../lib/utils';

export function DeleteSongsModal() {
  const ui = useUiStore();
  const { session } = useSession();
  const songs = useLibraryStore((s) => s.songs);
  const [query, setQuery] = useState('');
  const [addedBy, setAddedBy] = useState('');
  const [selected, setSelected] = useState<Set<number | string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ui.modal === 'deleteSongs') {
      setSelected(new Set());
      setQuery('');
      setAddedBy('');
    }
  }, [ui.modal]);

  const authors = useMemo(
    () => [...new Set(songs.map((s) => s.added_by).filter(Boolean))],
    [songs]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return songs.filter((s) => {
      const matchQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.artist && s.artist.toLowerCase().includes(q)) ||
        (s.album && s.album.toLowerCase().includes(q));
      const matchAuthor = !addedBy || s.added_by === addedBy;
      return matchQ && matchAuthor;
    });
  }, [songs, query, addedBy]);

  const toggle = (id: number | string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelected(new Set());
  };

  const confirmDelete = async () => {
    if (selected.size === 0) return;
    const count = selected.size;
    const ok = await confirmDialog({
      title: `¿Eliminar ${count} ${count === 1 ? 'canción' : 'canciones'} de la biblioteca?`,
      message: `Se eliminarán permanentemente de la base de datos junto con sus me gusta, descargas e historial. Esta acción no se puede deshacer.`,
      confirmLabel: `Eliminar ${count} ${count === 1 ? 'canción' : 'canciones'}`,
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!ok) return;

    setBusy(true);
    try {
      const ids = [...selected];
      await songsService.deleteSongs(ids);
      useLibraryStore.getState().removeSongs(ids);

      // Limpiar cola de reproducción y detener reproductor si la canción actual fue eliminada
      const queueStore = useQueueStore.getState();
      ids.forEach((id) => queueStore.remove(id));

      const player = usePlayerStore.getState();
      if (player.currentSong && ids.some((id) => String(id) === String(player.currentSong?.id))) {
        player.setCurrentSong(null);
        player.setIsPlaying(false);
        player.setSourceUrl(null);
      }

      void logsService.add('delete_songs', `${count} canciones eliminadas en lote`, session?.username);
      useToastStore.getState().show(`✅ ${count} ${count === 1 ? 'canción eliminada' : 'canciones eliminadas'} con éxito`, 'success', 3500);
      setSelected(new Set());
      ui.close('deleteSongs');
    } catch (err: any) {
      useToastStore.getState().show(err?.message || 'Error al eliminar las canciones', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal name="deleteSongs" title="Eliminar varias canciones" width={580}>
      <div className="jf-delete-songs">
        {/* Barra superior de búsqueda y filtro */}
        <div className="jf-delete-tools">
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              className="jf-input"
              placeholder="Buscar por canción, artista o álbum…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar"
              style={{ width: '100%', paddingLeft: '32px' }}
            />
            <MagnifyingGlass
              size={15}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.4)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {authors.length > 0 && (
            <select
              className="jf-select"
              value={addedBy}
              onChange={(e) => setAddedBy(e.target.value)}
              aria-label="Filtrar por autor"
              style={{ maxWidth: 160 }}
            >
              <option value="">Todos los autores</option>
              {authors.map((author) => (
                <option key={author} value={author}>
                  {author}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Acciones de selección masiva */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.6)',
            padding: '2px 4px',
          }}
        >
          <span>
            Mostrando <strong>{filtered.length}</strong> de {songs.length} canciones
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {filtered.length > 0 && (
              <button
                type="button"
                className="jf-link-btn"
                onClick={handleSelectAllFiltered}
                style={{
                  fontSize: '12px',
                  color: 'var(--accent, #00f0ff)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Seleccionar todas ({filtered.length})
              </button>
            )}
            {selected.size > 0 && (
              <button
                type="button"
                className="jf-link-btn"
                onClick={handleDeselectAll}
                style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.5)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Deseleccionar todas
              </button>
            )}
          </div>
        </div>

        {/* Lista seleccionable de canciones */}
        <div className="jf-delete-list" style={{ maxHeight: '360px', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <EmptyState icon={TrashSimple} title="No se encontraron canciones" />
          ) : (
            filtered.map((song) => {
              const isSelected = selected.has(song.id);
              const coverUrl = resolveMediaUrl(song.cover_url);

              return (
                <div
                  key={song.id}
                  className={`jf-delete-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => toggle(song.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderRadius: '8px',
                    border: isSelected
                      ? '1px solid rgba(239, 68, 68, 0.35)'
                      : '1px solid transparent',
                  }}
                >
                  {/* Checkbox */}
                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {isSelected ? (
                      <CheckSquare size={18} weight="fill" color="#ef4444" />
                    ) : (
                      <Square size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    )}
                  </div>

                  {/* Portada */}
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt=""
                      style={{
                        width: 36,
                        height: 36,
                        minWidth: 36,
                        objectFit: 'cover',
                        borderRadius: 6,
                        background: '#1a1a24',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        minWidth: 36,
                        borderRadius: 6,
                        background: '#1a1a24',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.3)',
                      }}
                    >
                      <MusicNotes size={16} />
                    </div>
                  )}

                  {/* Nombre y Artista */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <span
                      className="jf-delete-name"
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: isSelected ? '#fca5a5' : 'inherit',
                      }}
                    >
                      {song.name}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.5)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {song.artist || 'Artista desconocido'}
                      {song.album ? ` · ${song.album}` : ''}
                    </span>
                  </div>

                  {/* Duración */}
                  {song.duration ? (
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.4)',
                        fontFamily: 'monospace',
                        flexShrink: 0,
                      }}
                    >
                      {formatDuration(song.duration)}
                    </span>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Barra inferior de confirmación */}
        <div className="jf-delete-footer" style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="jf-delete-counter" style={{ fontSize: '13px' }}>
            {selected.size > 0 ? (
              <strong style={{ color: '#ef4444' }}>{selected.size} seleccionadas para eliminar</strong>
            ) : (
              'Ninguna canción seleccionada'
            )}
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" size="sm" onClick={() => ui.close('deleteSongs')} disabled={busy}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={selected.size === 0 || busy}
              onClick={() => void confirmDelete()}
            >
              <Trash size={14} weight="bold" />
              {busy
                ? 'Eliminando…'
                : selected.size > 0
                ? `Eliminar (${selected.size})`
                : 'Eliminar seleccionadas'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
