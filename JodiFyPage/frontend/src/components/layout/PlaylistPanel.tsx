import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { MagnifyingGlass, Queue, SlidersHorizontal, UsersThree, Users, GearSix, ArrowDown, Shuffle, MusicNotes } from '@phosphor-icons/react';
import { Segmented } from '../ui/Segmented';
import { IconButton } from '../ui/IconButton';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { SongRow } from '../player/SongRow';
import { SongListSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { useUiStore } from '../../store/ui.store';
import { useLibraryStore, selectFilteredSongs } from '../../store/library.store';
import { useQueueStore } from '../../store/queue.store';
import { useSettingsStore } from '../../store/settings.store';
import { useIsAdmin, useSession } from '../../context/SessionContext';
import type { Tab } from '../../lib/types';
import { formatTime } from '../../lib/utils';
import { useSleepTimer } from '../../hooks/useSleepTimer';
import { usePlayerStore } from '../../store/player.store';

const ease = [0.16, 1, 0.3, 1] as const;

export function PlaylistPanel() {
  const isAdmin = useIsAdmin();
  const ui = useUiStore();
  const { session } = useSession();
  const library = useLibraryStore();
  const queueCount = useQueueStore((s) => s.items.length);
  const settings = useSettingsStore();
  const { remainingMs, totalMs } = useSleepTimer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const filtered = useMemo(() => selectFilteredSongs(library), [library]);

  useEffect(() => {
    const timer = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      file,
    }));
    ui.open('upload', { items });
  };

  const sleepProgress = remainingMs != null && totalMs ? 1 - remainingMs / totalMs : null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isAdmin) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <aside
      className={`jf-playlist ${isDragging ? 'is-dragging' : ''}`}
      data-testid="playlist-panel"
      onDragEnter={(e) => {
        if (isAdmin) e.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(e) => {
        if (isAdmin) e.preventDefault();
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      <motion.header
        className="jf-playlist-topbar"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
      >
        <div className="jf-playlist-identity">
          {session && (
            <Avatar
              username={session.username}
              size={30}
              presence="online"
              onClick={() => ui.open('profile')}
            />
          )}
          <span className="jf-playlist-brandmark">
            <span className="jf-brandmark-dot" />
            JodiFy
          </span>
        </div>
        <div className="jf-playlist-actions">
          <IconButton size="sm" icon={Queue} label="Cola" active={ui.modal === 'queue'} onClick={() => ui.toggle('queue')}>
            {queueCount > 0 && <span className="jf-badge-count">{queueCount}</span>}
          </IconButton>
          <IconButton size="sm" icon={UsersThree} label="Jam" active={ui.modal === 'jam'} onClick={() => ui.toggle('jam')} />
          <IconButton size="sm" icon={Users} label="Miembros" active={ui.modal === 'community'} onClick={() => ui.toggle('community')} />
          <IconButton size="sm" icon={SlidersHorizontal} label="Ecualizador" active={ui.modal === 'equalizer'} onClick={() => ui.toggle('equalizer')} />
          <IconButton size="sm" icon={GearSix} label="Ajustes" onClick={() => ui.toggle('settings')} />
        </div>
      </motion.header>

      <motion.section
        className="jf-playlist-library"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease, delay: 0.06 }}
      >
        <div className="jf-library-head">
          <span className="jf-eyebrow">
            <span className="jf-eyebrow-dot" />
            Tu colección
          </span>
          <span className="jf-library-count">{filtered.length}</span>
        </div>
        <Segmented<Tab>
          value={library.currentTab}
          onChange={(tab) => {
            library.setCurrentTab(tab);
            if (tab === 'downloads') void enterDownloadsTab();
          }}
          options={[
            { value: 'global', label: 'Global' },
            { value: 'personal', label: 'Favoritas' },
            { value: 'downloads', label: 'Descargadas' },
          ]}
        />
      </motion.section>

      <motion.div
        className="jf-playlist-tools"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease, delay: 0.12 }}
      >
        <div className="jf-search">
          <MagnifyingGlass size={16} />
          <input
            type="search"
            placeholder="Buscar canciones…"
            value={library.searchTerm}
            onChange={(e) => library.setSearchTerm(e.target.value)}
            aria-label="Buscar"
            data-testid="search-input"
          />
        </div>
        <select
          className="jf-select"
          value={library.currentSort}
          onChange={(e) => library.setCurrentSort(e.target.value as never)}
          aria-label="Ordenar"
        >
          <option value="recent">Recientes</option>
          <option value="old">Antiguas</option>
          <option value="popular">Populares</option>
          <option value="artist">Artista</option>
          <option value="name">Nombre</option>
        </select>
        {isAdmin && (
          <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()} className="jf-add-song-btn">
            <MusicNotes size={15} weight="fill" /> Subir
          </Button>
        )}
      </motion.div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <motion.div
        className="jf-playlist-stats"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease, delay: 0.18 }}
      >
        <span className="jf-stat-chip-line">
          <Shuffle size={12} /> {formatTime(sessionSeconds)} de sesión
        </span>
        <span className="jf-stat-chip-line">
          <Queue size={12} /> {queueCount} en cola
        </span>
        {settings.sleepTimer && (
          <span className="jf-stat-chip-line jf-stat-chip-line--timer">
            {sleepProgress != null && (
              <span className="jf-timer-bar">
                <span style={{ width: `${sleepProgress * 100}%` }} />
              </span>
            )}
            Dormir {remainingMs != null ? formatTime(remainingMs / 1000) : '…'}
          </span>
        )}
      </motion.div>

      {library.currentTab === 'downloads' && (
        <div className="jf-smart-mix">
          <Button variant="glass" size="sm" onClick={() => void smartMix()}>
            <ArrowDown size={14} /> Mix de descargas
          </Button>
        </div>
      )}

      <div className="jf-song-list-scroll">
        {!library.loaded ? (
          <SongListSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MusicNotes}
            title={library.currentTab === 'downloads' ? 'Nada descargado aún' : library.searchTerm ? 'Sin resultados' : 'Biblioteca vacía'}
            description={library.currentTab === 'downloads' ? 'Descarga canciones para escucharlas sin conexión.' : undefined}
          />
        ) : (
          <ul className="jf-song-list">
            {filtered.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} />
            ))}
          </ul>
        )}
      </div>

      <footer className="jf-playlist-footer">
        <span className="jf-footer-stat">{filtered.length} canciones</span>
        <span className="jf-footer-sep" />
        <span className="jf-footer-stat">{formatTime(sessionSeconds)} en sesión</span>
        <span className="jf-footer-sep" />
        <span className="jf-footer-stat jf-footer-stat--muted">JodiFy 2.0</span>
      </footer>
    </aside>
  );
}

async function smartMix(): Promise<void> {
  const { shuffleArray } = await import('../../lib/utils');
  const library = useLibraryStore.getState();
  const pool = library.songs.filter((s) => library.downloadedIds.includes(s.id));
  if (pool.length === 0) return;
  const { playSong } = await import('../../services/player.service');
  await playSong(shuffleArray(pool)[0]);
  usePlayerStore.getState().setIsPlaying(true);
}

async function enterDownloadsTab(): Promise<void> {
  const { getAllOfflineIds } = await import('../../lib/idb');
  const ids = await getAllOfflineIds();
  useLibraryStore.getState().setDownloadedIds(ids);
}
