import { useEffect, useMemo, useState } from 'react';
import { ClockCounterClockwise, Play, Flame, MusicNotes } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { SongCover } from '../ui/SongCover';
import { useUiStore } from '../../store/ui.store';
import { useLibraryStore } from '../../store/library.store';
import { usePlayerStore } from '../../store/player.store';
import { fetchListeningHistory } from '../../services/users.service';
import { timeAgo, songArtistMeta } from '../../lib/utils';
import type { Song } from '../../lib/types';

interface HistoryRow {
  song_id?: string | number;
  song_name?: string;
  played_at: string;
}

export function ListeningHistoryModal() {
  const ui = useUiStore();
  const librarySongs = useLibraryStore((s) => s.songs);
  const [tab, setTab] = useState<'recent' | 'top'>('recent');
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

  // Busca la canción en la biblioteca local por ID o nombre
  const findMatchedSong = (songId?: string | number, songName?: string): Song | undefined => {
    if (songId) {
      const match = librarySongs.find((s) => String(s.id) === String(songId));
      if (match) return match;
    }
    if (songName) {
      const lower = songName.trim().toLowerCase();
      const match = librarySongs.find((s) => s.name.trim().toLowerCase() === lower);
      if (match) return match;
    }
    return undefined;
  };

  // 1. Cronológico reciente
  const recentList = useMemo(() => {
    return rows.map((row, idx) => {
      const matched = findMatchedSong(row.song_id, row.song_name);
      return {
        key: `${row.song_id ?? row.song_name ?? idx}-${row.played_at}`,
        songId: row.song_id,
        name: matched?.name ?? row.song_name ?? 'Pista sin título',
        artist: matched ? songArtistMeta(matched) : 'JodiFy',
        playedAt: row.played_at,
        song: matched,
      };
    });
  }, [rows, librarySongs]);

  // 2. Más escuchadas (Agrupado por canción con ranking)
  const topList = useMemo(() => {
    const map = new Map<string, { count: number; lastAt: string; songId?: string | number; name: string }>();

    for (const row of rows) {
      const matched = findMatchedSong(row.song_id, row.song_name);
      const name = matched?.name ?? row.song_name ?? 'Pista sin título';
      const key = (matched ? String(matched.id) : name).toLowerCase();

      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (new Date(row.played_at) > new Date(existing.lastAt)) {
          existing.lastAt = row.played_at;
        }
      } else {
        map.set(key, {
          count: 1,
          lastAt: row.played_at,
          songId: matched?.id ?? row.song_id,
          name,
        });
      }
    }

    return [...map.values()]
      .sort((a, b) => b.count - a.count || new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
      .map((item) => {
        const matched = findMatchedSong(item.songId, item.name);
        return {
          ...item,
          artist: matched ? songArtistMeta(matched) : 'JodiFy',
          song: matched,
        };
      });
  }, [rows, librarySongs]);

  const handlePlaySong = async (song?: Song, songName?: string) => {
    let target = song;
    if (!target && songName) {
      target = librarySongs.find((s) => s.name.toLowerCase() === songName.toLowerCase());
    }
    if (!target) return;
    const activeList = tab === 'top' ? topList : recentList;
    const historySongs = activeList.map((i) => i.song).filter((s): s is Song => Boolean(s));
    await usePlayerStore.getState().playWithContext(
      target,
      historySongs.length > 0 ? historySongs : [target],
      tab === 'top' ? 'Tus más escuchadas' : 'Historial de reproducción',
      'custom'
    );
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
    <Modal name="history" title="Historial de reproducción" width={600} className="jf-modal--history">
      <div className="jf-history">
        <div className="jf-history-toolbar">
          {/* Segmented Tabs: Recientes / Top */}
          <div className="jf-history-tabs" role="tablist">
            <button
              type="button"
              className={`jf-history-tab ${tab === 'recent' ? 'is-active' : ''}`}
              onClick={() => setTab('recent')}
            >
              <ClockCounterClockwise size={14} /> Recientes ({rows.length})
            </button>
            <button
              type="button"
              className={`jf-history-tab ${tab === 'top' ? 'is-active' : ''}`}
              onClick={() => setTab('top')}
            >
              <Flame size={14} /> Más escuchadas
            </button>
          </div>

          <Button variant="glass" size="sm" onClick={() => void reload()}>
            Recargar
          </Button>
        </div>

        {loading && rows.length === 0 ? (
          <div className="jf-community-loading">
            <Spinner size={24} />
          </div>
        ) : error ? (
          <p className="jf-form-message is-error">{error}</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClockCounterClockwise}
            title="Aún no hay historial registrado"
            description="Las canciones que reproduzcas se sincronizarán aquí automáticamente."
          />
        ) : tab === 'recent' ? (
          /* TAB 1: FLUJO CRONOLÓGICO RECIENTE */
          <ol className="jf-history-list">
            {recentList.map((item) => (
              <li
                key={item.key}
                className="jf-history-row"
                onClick={() => void handlePlaySong(item.song, item.name)}
                title="Clic para reproducir"
              >
                <div className="jf-history-art">
                  {item.song ? (
                    <SongCover song={item.song} alt={item.name} />
                  ) : (
                    <div className="jf-history-art-fallback">
                      <MusicNotes size={16} />
                    </div>
                  )}
                </div>
                <div className="jf-history-meta">
                  <p className="jf-history-name">{item.name}</p>
                  <p className="jf-history-sub">
                    {item.artist} · <span className="jf-history-time">hace {timeAgo(item.playedAt)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="jf-history-play-btn"
                  aria-label={`Reproducir ${item.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handlePlaySong(item.song, item.name);
                  }}
                >
                  <Play size={14} weight="fill" />
                </button>
              </li>
            ))}
          </ol>
        ) : (
          /* TAB 2: MÁS ESCUCHADAS / RANKING */
          <ol className="jf-history-list">
            {topList.map((item, index) => {
              const rankClass = index === 0 ? 'is-first' : index === 1 ? 'is-second' : index === 2 ? 'is-third' : '';
              return (
                <li
                  key={`${item.name}-${index}`}
                  className="jf-history-row"
                  onClick={() => void handlePlaySong(item.song, item.name)}
                  title="Clic para reproducir"
                >
                  <span className={`jf-history-rank ${rankClass}`}>#{index + 1}</span>
                  <div className="jf-history-art">
                    {item.song ? (
                      <SongCover song={item.song} alt={item.name} />
                    ) : (
                      <div className="jf-history-art-fallback">
                        <MusicNotes size={16} />
                      </div>
                    )}
                  </div>
                  <div className="jf-history-meta">
                    <p className="jf-history-name">{item.name}</p>
                    <p className="jf-history-sub">
                      {item.artist} · <strong className="jf-history-plays">{item.count} {item.count === 1 ? 'vez' : 'veces'}</strong>
                      {' '}· último hace {timeAgo(item.lastAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="jf-history-play-btn"
                    aria-label={`Reproducir ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handlePlaySong(item.song, item.name);
                    }}
                  >
                    <Play size={14} weight="fill" />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Modal>
  );
}
