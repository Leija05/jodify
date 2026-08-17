import { useEffect, useState } from 'react';
import { UsersThree, MusicNotes, Copy } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { useUiStore } from '../../store/ui.store';
import { useToastStore } from '../../store/toast.store';
import { jamService } from '../../services/jam.service';
import { timeAgo } from '../../lib/utils';
import type { JamHistoryEntry } from '../../lib/types';

export function JamHistoryModal() {
  const ui = useUiStore();
  const [entries, setEntries] = useState<JamHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setEntries(await jamService.fetchHistory(30));
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ui.modal !== 'jamHistory') return;
    void load();
  }, [ui.modal]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      useToastStore.getState().show(`Código ${code} copiado`, 'success');
    } catch {
      /* ignore */
    }
  };

  return (
    <Modal name="jamHistory" title="Historial de Jams" width={560}>
      <div className="jf-history">
        <div className="jf-history-toolbar">
          <span className="jf-history-total">
            <UsersThree size={14} /> {entries.length} {entries.length === 1 ? 'sesión' : 'sesiones'}
          </span>
          <Button variant="glass" size="sm" onClick={() => void load()}>
            Recargar
          </Button>
        </div>

        {loading && entries.length === 0 ? (
          <div className="jf-community-loading">
            <Spinner size={22} />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState icon={UsersThree} title="Aún no hay jams" description="Crea una Jam para empezar a escuchar en grupo." />
        ) : (
          <ul className="jf-jam-history-list">
            {entries.map((entry) => (
              <li key={entry.id} className={`jf-jam-history-row ${entry.is_active ? 'is-active' : ''}`}>
                <div className="jf-jam-history-head">
                  <span className="jf-jam-history-code">
                    <MusicNotes size={14} weight="fill" /> {entry.code}
                  </span>
                  <span className={`jf-jam-history-status ${entry.is_active ? 'is-live' : ''}`}>
                    {entry.is_active ? 'En vivo' : 'Finalizada'}
                  </span>
                  <button className="jf-control" aria-label="Copiar código" onClick={() => void copyCode(entry.code)}>
                    <Copy size={13} />
                  </button>
                </div>
                <p className="jf-jam-history-sub">
                  Host: <strong>{entry.host_username}</strong> · {entry.members.length} miembros · {entry.updated_at ? `actualizada hace ${timeAgo(entry.updated_at)}` : ''}
                </p>
                {entry.members.length > 0 && (
                  <div className="jf-jam-history-members">
                    {entry.members.map((m) => (
                      <span key={`${entry.id}-${m.username}`} className={`jf-jam-history-member ${m.active ? 'is-on' : ''}`}>
                        {m.username}
                        {m.is_host ? ' · host' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
