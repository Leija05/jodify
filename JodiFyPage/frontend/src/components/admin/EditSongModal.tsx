import { useEffect, useState } from 'react';
import { PencilSimple } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useUiStore } from '../../store/ui.store';
import { useLibraryStore } from '../../store/library.store';
import { useToastStore } from '../../store/toast.store';
import { songsService } from '../../services/songs.service';
import { logsService } from '../../services/social.service';
import type { Song } from '../../lib/types';

export function EditSongModal() {
  const ui = useUiStore();
  const song = ui.modalPayload?.song as Song | undefined;

  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ui.modal === 'editSong' && song) {
      setName(song.name ?? '');
      setArtist(song.artist ?? '');
      setAlbum(song.album ?? '');
      setLyrics(song.lyrics ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.modal, song?.id]);

  const handleSave = async () => {
    if (!song) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      useToastStore.getState().show('El nombre de la canción no puede estar vacío', 'error');
      return;
    }
    setBusy(true);
    const toast = useToastStore.getState();
    try {
      const updated = await songsService.updateSongMeta(song.id, {
        name: trimmed,
        artist: artist.trim() || undefined,
        album: album.trim() || undefined,
        lyrics: lyrics.trim() || undefined,
      });
      useLibraryStore.getState().upsertSong(updated);
      toast.show(`«${updated.name}» actualizada`, 'success', 2200);
      void logsService.add('edit_song', `Canción editada: ${updated.name}`);
      ui.close('editSong');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'No se pudo actualizar la canción', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal name="editSong" title="Editar canción" width={520}>
      <div className="jf-edit-song-form">
        <label className="jf-field">
          <span className="jf-field-label">Nombre</span>
          <input className="jf-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la canción" data-testid="edit-song-name" />
        </label>
        <label className="jf-field">
          <span className="jf-field-label">Artista</span>
          <input className="jf-input" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artista que la canta" data-testid="edit-song-artist" />
        </label>
        <label className="jf-field">
          <span className="jf-field-label">Álbum</span>
          <input className="jf-input" value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="Álbum" data-testid="edit-song-album" />
        </label>
        <label className="jf-field">
          <span className="jf-field-label">Letras</span>
          <textarea
            className="jf-input jf-input--area"
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Pegá la letra acá. Podés usar formato LRC ([mm:ss] línea) para sincronizarla con la reproducción."
            rows={7}
            data-testid="edit-song-lyrics"
          />
        </label>
        <div className="jf-edit-song-actions">
          <Button variant="ghost" onClick={() => ui.close('editSong')}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={busy} data-testid="edit-song-save">
            <PencilSimple size={15} weight="bold" />
            {busy ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}