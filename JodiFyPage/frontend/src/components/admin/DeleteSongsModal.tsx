import { useEffect, useMemo, useState } from 'react';
import { TrashSimple } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { useUiStore } from '../../store/ui.store';
import { useLibraryStore } from '../../store/library.store';
import { useToastStore } from '../../store/toast.store';
import { songsService } from '../../services/songs.service';
import { logsService } from '../../services/social.service';
import { useSession } from '../../context/SessionContext';
import { confirmDialog } from '../../store/confirm.store';

export function DeleteSongsModal() {
  const ui = useUiStore();
  const { session } = useSession();
  const songs = useLibraryStore((s) => s.songs);
  const [query, setQuery] = useState('');
  const [addedBy, setAddedBy] = useState('');
  const [selected, setSelected] = useState<Set<number | string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ui.modal === 'deleteSongs') setSelected(new Set());
  }, [ui.modal]);

  const authors = useMemo(() => [...new Set(songs.map((s) => s.added_by).filter(Boolean))], [songs]);

  const filtered = useMemo(
    () =>
      songs.filter(
        (s) =>
          (!query || s.name.toLowerCase().includes(query.toLowerCase())) &&
          (!addedBy || s.added_by === addedBy),
      ),
    [songs, query, addedBy],
  );

  const toggle = (id: number | string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmDelete = async () => {
    if (selected.size === 0) return;
    const ok = await confirmDialog({
      title: `¿Borrar ${selected.size} canciones?`,
      message: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Borrar',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const ids = [...selected];
      await songsService.deleteSongs(ids);
      useLibraryStore.getState().removeSongs(ids);
      void logsService.add('delete_songs', `${ids.length} canciones borradas`, session?.username);
      useToastStore.getState().show(`${ids.length} canciones borradas`, 'success');
      setSelected(new Set());
      ui.close('deleteSongs');
    } catch {
      useToastStore.getState().show('Falló el borrado', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal name="deleteSongs" title="Borrar canciones" width={520}>
      <div className="jf-delete-songs">
        <div className="jf-delete-tools">
          <input className="jf-input" placeholder="Buscar por nombre…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar" />
          <select className="jf-select" value={addedBy} onChange={(e) => setAddedBy(e.target.value)} aria-label="Filtrar por autor">
            <option value="">Todos</option>
            {authors.map((author) => (
              <option key={author} value={author}>
                {author}
              </option>
            ))}
          </select>
        </div>
        <div className="jf-delete-list">
          {filtered.length === 0 ? (
            <EmptyState icon={TrashSimple} title="Sin coincidencias" />
          ) : (
            filtered.map((song) => (
              <label key={song.id} className={`jf-delete-item ${selected.has(song.id) ? 'is-selected' : ''}`}>
                <input type="checkbox" checked={selected.has(song.id)} onChange={() => toggle(song.id)} />
                <span className="jf-delete-name">{song.name}</span>
                <span className="jf-delete-author">{song.added_by ?? 'JodiFy'}</span>
              </label>
            ))
          )}
        </div>
        <div className="jf-delete-footer">
          <span className="jf-delete-counter">{selected.size} seleccionadas</span>
          <Button variant="danger" size="sm" disabled={selected.size === 0 || busy} onClick={() => void confirmDelete()}>
            <TrashSimple size={14} /> Borrar seleccionadas
          </Button>
        </div>
      </div>
    </Modal>
  );
}
