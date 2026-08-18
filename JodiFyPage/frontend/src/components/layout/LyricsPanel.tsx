import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { MusicNotes, ArrowsOut } from '@phosphor-icons/react';
import { usePlayerStore } from '../../store/player.store';
import { useUiStore } from '../../store/ui.store';
import { useLyrics } from '../../hooks/useLyrics';
import { useSettingsStore } from '../../store/settings.store';
import { songArtistMeta } from '../../lib/utils';
import { isSynced } from '../../lib/lrc';

export function LyricsPanel() {
  const song = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { lines, activeIndex, loading } = useLyrics(song?.name ?? null, songArtistMeta(song), song?.lyrics ?? null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const focusMode = useSettingsStore((s) => s.focusMode);

  useEffect(() => {
    if (activeIndex < 0 || !scrollRef.current) return;
    const container = scrollRef.current;
    const active = container.querySelector<HTMLElement>(`.jf-lyrics-panel-line--${activeIndex}`);
    if (!active) return;
    const cRect = container.getBoundingClientRect();
    const aRect = active.getBoundingClientRect();
    const top = container.scrollTop + aRect.top - cRect.top - container.clientHeight / 2 + aRect.height / 2;
    container.scrollTo({ top, behavior: 'smooth' });
  }, [activeIndex]);

  return (
    <section className={`jf-lyrics ${focusMode ? 'is-focus' : ''}`} data-testid="lyrics-panel">
      <div className="jf-lyrics-head">
        <span className="jf-lyrics-brand">Letras</span>
        <div className="jf-lyrics-head-actions">
          {song && (
            <button
              className="jf-lyrics-expand"
              aria-label="Abrir en pantalla grande"
              title="Pantalla grande (F)"
              onClick={() => useUiStore.getState().open('fullscreen')}
            >
              <ArrowsOut size={13} />
            </button>
          )}
          {isPlaying && (
            <span className="jf-now-playing-dot" aria-label="Reproduciendo">
              <span />
            </span>
          )}
        </div>
      </div>

      <div className="jf-lyrics-scroll" ref={scrollRef}>
        {!song ? (
          <div className="jf-lyrics-empty">
            <MusicNotes size={42} weight="light" />
            <p>Reproduce una canción para ver sus letras</p>
          </div>
        ) : loading ? (
          <p className="jf-lyrics-hint">Buscando letras para «{song.name}»…</p>
        ) : lines.length === 0 ? (
          <div className="jf-lyrics-empty">
            <p className="jf-lyrics-hint">Sin letras disponibles.</p>
            <p className="jf-lyrics-subhint">Deja que la música hable.</p>
          </div>
        ) : (
          <div className="jf-lyrics-box">
            {(() => {
              const synced = isSynced(lines);
              return lines.map((line, i) => {
              const active = synced && i === activeIndex;
              const seekable = line.time >= 0;
              return (
                <motion.p
                  key={i}
                  className={`jf-lyrics-panel-line jf-lyrics-panel-line--${i} ${active ? 'is-active' : ''} ${seekable ? 'is-seekable' : ''}`}
                  animate={{ opacity: !synced ? 1 : active ? 1 : 0.28, scale: active ? 1.06 : 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  onClick={() => {
                    if (seekable) usePlayerStore.getState().seek(line.time);
                  }}
                >
                  {line.text}
                </motion.p>
              );
            });
            })()}
          </div>
        )}
      </div>
    </section>
  );
}
