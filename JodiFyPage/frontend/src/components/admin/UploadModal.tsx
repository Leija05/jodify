import { useEffect, useState } from 'react';
import { Check, Warning, XCircle, MusicNotes } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useUiStore } from '../../store/ui.store';
import { useLibraryStore } from '../../store/library.store';
import { useToastStore } from '../../store/toast.store';
import { songsService, checkSongNameExists, extractMetadataFromFile } from '../../services/songs.service';
import { logsService } from '../../services/social.service';
import { useSession } from '../../context/SessionContext';
import type { UploadItem } from '../../lib/types';

interface UploadPayload {
  items: Array<{ id: string; name: string; file: File }>;
}

export function UploadModal() {
  const ui = useUiStore();
  const { session } = useSession();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const payload = ui.modalPayload as Partial<UploadPayload> | undefined;

  useEffect(() => {
    if (ui.modal === 'upload' && payload?.items) {
      setItems(
        payload.items.map((item) => ({
          id: item.id,
          name: item.name || item.file?.name || 'canción',
          status: 'uploading' as const,
          progress: 0,
        })),
      );
      setUploading(true);
      void runUploads(payload.items);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.modal, payload]);

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const runUploads = async (payloadItems: Array<{ id: string; name: string; file: File }>) => {
    const username = session?.username ?? '';
    for (const item of payloadItems) {
      try {
        const name = (item.name || item.file.name || 'canción').replace(/\.[^.]+$/, '');
        const meta = await extractMetadataFromFile(item.file);
        const finalName = meta.title || name;

        if (await checkSongNameExists(finalName)) {
          updateItem(item.id, { name: finalName, status: 'duplicate', error: 'Ya existe una canción con este nombre' });
          continue;
        }

        const coverBlob =
          meta.pictureData && meta.pictureFormat
            ? new Blob([meta.pictureData], { type: meta.pictureFormat })
            : undefined;
        const song = await songsService.uploadAudio(item.file, finalName, coverBlob, meta.album, meta.lyrics);
        updateItem(item.id, { name: finalName, status: 'success', progress: 100, coverUrl: meta.picture });
        void logsService.add('upload', `Canción subida: ${finalName}`, username);

        if (song) useLibraryStore.getState().upsertSong(song);
      } catch (error) {
        updateItem(item.id, { name: item.name, status: 'error', error: error instanceof Error ? error.message : 'Error al subir' });
      }
    }
    setUploading(false);
    useToastStore.getState().show('Subida finalizada', 'info');
  };

  const close = () => {
    if (uploading) return;
    ui.close('upload');
  };

  const counts = {
    total: items.length,
    success: items.filter((i) => i.status === 'success').length,
    error: items.filter((i) => i.status === 'error' || i.status === 'duplicate').length,
  };

  return (
    <Modal name="upload" title="Subiendo canciones" width={460} onClose={close}>
      <div className="jf-upload">
        <div className="jf-upload-counts">
          <span>Total: {counts.total}</span>
          <span className="is-success">✓ {counts.success}</span>
          <span className="is-error">✕ {counts.error}</span>
        </div>
        <ul className="jf-upload-list">
          {items.map((item) => (
            <li key={item.id} className={`jf-upload-item jf-upload-item--${item.status}`}>
              {item.coverUrl ? (
                <img className="jf-upload-cover" src={item.coverUrl} alt="" />
              ) : (
                <div className="jf-upload-cover jf-upload-cover--placeholder">
                  <MusicNotes size={16} />
                </div>
              )}
              <div className="jf-upload-info">
                <p className="jf-upload-name">{item.name}</p>
                {item.status === 'uploading' && (
                  <div className="jf-upload-progress">
                    <span style={{ width: `${item.progress}%` }} />
                  </div>
                )}
                {item.status === 'duplicate' && <p className="jf-upload-error"><Warning size={12} /> {item.error}</p>}
                {item.status === 'error' && <p className="jf-upload-error"><XCircle size={12} /> {item.error}</p>}
              </div>
              {item.status === 'success' && <Check size={18} weight="bold" className="jf-upload-ok" />}
            </li>
          ))}
        </ul>
        {!uploading && (
          <Button variant="primary" size="sm" onClick={close} className="jf-upload-done">
            Hecho
          </Button>
        )}
      </div>
    </Modal>
  );
}
