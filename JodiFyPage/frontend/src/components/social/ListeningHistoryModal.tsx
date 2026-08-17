import { useEffect, useMemo, useState } from 'react';
import { ClockCounterClockwise, Play } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { useUiStore } from '../../store/ui.store';
import { useLibraryStore } from '../../store/library.store';
import { usePlayerStore } from '../../store/player.store';
import { playSong } from '../../services/player.service';
import { fetchListeningHistory } from '../../services/users.service';
import { timeAgo } from '../../lib/utils';

interface HistoryRow {
  song_id?: string | number;
  song_name?: string;
  played_at: string;
}

export function ListeningHistoryModal() {
  const ui = useUiStore();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const username = (ui.modalPayload.username as string | undefined) ?? '';

  useEffect(() => {
    if (ui.modal !== 'history' || !username) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchListeningHistory(username, 50)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el historial');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ui.modal, username]);

  const { grouped, total } = useMemo(() => {
    const counts = new Map<string, { count: number; lastAt: string }>();
    for (const row of rows) {
      const key = String(row.song_id ?? row.song_name ?? '');
      if (!key) continue;
      const prev = counts.get(key);
      counts.set(key, {
        count: (prev?.count ?? 0) + 1,
        lastAt: prev && new Date(prev.lastAt) > new Date(row.played_at) ? prev.lastAt : row.played_at,
      });
    }
    const list = [...counts.entries()].map(([id, v]) => ({ id, ...v }));
    return { grouped: list, total: rows.length };
  }, [rows]);

  const playFromHistory = async (songId: string | number, songName?: string) => {
    const library = useLibraryStore.getState();
    const song =
      library.songs.find((s) => String(s.id) === String(songId)) ??
      library.songs.find((s) => s.name.toLowerCase() === String(songName ?? '').toLowerCase());
    if (!song) return;
    await playSong(song);
    usePlayerStore.getState().setIsPlaying(true);
  };

  const reload = async () => {
    if (!username) return;
    setError(null);
    try {
      setRows(await fetchListeningHistory(username, 50));
    } catch {
      setError('No se pudo cargar el historial');
    }
  };

  return (
    <Modal name="history" title="Historial de reproducción" width={560}>
      <div className="jf-history">
        <div className="jf-history-toolbar">
          <span className="jf-history-total">
            <ClockCounterClockwise size={14} /> {total} {total === 1 ? 'reproducción' : 'reproducciones'}
          </span>
          <Button variant="glass" size="sm" onClick={() => void reload()}>
            Recargar
          </Button>
        </div>

        {loading && rows.length === 0 ? (
          <div className="jf-community-loading">
            <Spinner size={22} />
          </div>
        ) : error ? (
          <p className="jf-form-message is-error">{error}</p>
        ) : grouped.length === 0 ? (
          <EmptyState icon={ClockCounterClockwise} title="Aún no hay historial" description="Cuando reproduzcas canciones, aparecerán aquí." />
        ) : (
          <ol className="jf-history-list">
            {grouped.map((row, index) => (
              <li key={`${row.id}-${index}`} className="jf-history-row">
                <span className="jf-history-rank">{index + 1}</span>
                <div className="jf-history-meta">
                  <p className="jf-history-name">{row.id}</p>
                  <p className="jf-history-sub">
                    {row.count} {row.count === 1 ? 'vez' : 'veces'} · último hace {timeAgo(row.lastAt)}
                  </p>
                </div>
                <button
                  className="jf-control"
                  aria-label="Reproducir"
                  onClick={() => void playFromHistory(row.id)}
                >
                  <Play size={14} weight="fill" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Modal>
  );
}
