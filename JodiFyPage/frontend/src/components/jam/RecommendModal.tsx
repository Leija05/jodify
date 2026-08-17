import { useMemo, useState } from 'react';
import { MagnifyingGlass, MusicNotes } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { useUiStore } from '../../store/ui.store';
import { useLibraryStore, selectFilteredSongs } from '../../store/library.store';
import { useSession } from '../../context/SessionContext';
import { sendRecommendation } from '../../services/jam.service';
import { getSongCoverCandidates } from '../../lib/utils';

export function RecommendModal() {
  const ui = useUiStore();
  const library = useLibraryStore();
  const { session } = useSession();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');

  const pool = useMemo(() => {
    const filtered = selectFilteredSongs(library).slice(0, 120);
    const categories = ['Todas', ...new Set(filtered.map((s) => s.category ?? s.genre ?? 'General').filter(Boolean))];
    const list = category === 'Todas' ? filtered : filtered.filter((s) => (s.category ?? s.genre ?? 'General') === category);
    return { categories, list };
  }, [library, category]);

  const handleSend = async (songId: number | string) => {
    const song = pool.list.find((s) => s.id === songId);
    if (!song) return;
    await sendRecommendation(song, session?.username ?? 'Invitado');
    ui.close('jamRecommend');
  };

  return (
    <Modal name="jamRecommend" title="Recomendar canción" width={440}>
      <div className="jf-recommend">
        <div className="jf-search">
          <MagnifyingGlass size={16} />
          <input
            className="jf-input"
            placeholder="Buscar canción para recomendar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar"
          />
        </div>
        <div className="jf-recommend-cats">
          {pool.categories.slice(0, 8).map((cat) => (
            <button
              key={cat}
              className={`jf-recommend-cat ${category === cat ? 'is-active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="jf-recommend-list">
          {pool.list
            .filter((s) => !query || s.name.toLowerCase().includes(query.toLowerCase()))
            .map((song) => {
              const cover = getSongCoverCandidates(song as unknown as Record<string, unknown>)[0] ?? '/assets/default-cover.png';
              return (
                <button key={song.id} className="jf-recommend-item" onClick={() => void handleSend(song.id)}>
                  <img className="jf-recommend-cover" src={cover} alt="" loading="lazy" />
                  <span className="jf-recommend-name">{song.name}</span>
                  <span className="jf-recommend-send">Enviar →</span>
                </button>
              );
            })}
          {pool.list.length === 0 && (
            <EmptyState icon={MusicNotes} title="Sin canciones" description="La biblioteca está vacía para recomendar." />
          )}
        </div>
      </div>
    </Modal>
  );
}
