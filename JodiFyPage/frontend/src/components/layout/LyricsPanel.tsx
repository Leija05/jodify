import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { MusicNotes, ArrowsOut, Play } from '@phosphor-icons/react';
import { usePlayerStore } from '../../store/player.store';
import { useUiStore } from '../../store/ui.store';
import { useLyrics } from '../../hooks/useLyrics';
import { useSettingsStore } from '../../store/settings.store';
import { songArtistMeta, formatTime } from '../../lib/utils';
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

  const synced = isSynced(lines);

  return (
    <section className={`jf-lyrics ${focusMode ? 'is-focus' : ''}`} data-testid="lyrics-panel">
      <div className="jf-lyrics-head">
        <div className="jf-lyrics-title-group">
          <span className="jf-lyrics-brand">Letras</span>
          {synced && song && (
            <span className={`jf-lyrics-mode-badge ${isPlaying ? 'is-live' : ''}`}>
              <span className="jf-lyrics-live-bars">
                <span className="bar-1" />
                <span className="bar-2" />
                <span className="bar-3" />
              </span>
              Karaoke
            </span>
          )}
        </div>

        <div className="jf-lyrics-head-actions">
          {song && (
            <button
              className="jf-lyrics-expand"
              aria-label="Abrir en pantalla grande"
              title="Pantalla grande (F)"
              onClick={() => useUiStore.getState().open('fullscreen')}
            >
              <ArrowsOut size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="jf-lyrics-scroll" ref={scrollRef}>
        {!song ? (
          <div className="jf-lyrics-empty">
            <div className="jf-lyrics-empty-glow">
              <MusicNotes size={46} weight="light" />
            </div>
            <p className="jf-lyrics-empty-title">Reproduce una canción</p>
            <p className="jf-lyrics-empty-desc">Elige una canción para disfrutar de las letras en sincronía.</p>
          </div>
        ) : loading ? (
          <div className="jf-lyrics-loading">
            <div className="jf-lyrics-loading-spinner" />
            <p className="jf-lyrics-hint">Sincronizando letras para «{song.name}»…</p>
          </div>
        ) : lines.length === 0 ? (
          <div className="jf-lyrics-empty">
            <p className="jf-lyrics-hint">Sin letras disponibles</p>
            <p className="jf-lyrics-subhint">Deja que los acordes hablen por sí mismos.</p>
          </div>
        ) : (
          <div className="jf-lyrics-box">
            {lines.map((line, i) => {
              const active = synced && i === activeIndex;
              const seekable = line.time >= 0;
              return (
                <motion.div
                  key={i}
                  className={`jf-lyrics-panel-line-wrapper ${active ? 'is-active' : ''} ${seekable ? 'is-seekable' : ''}`}
                  onClick={() => {
                    if (seekable) usePlayerStore.getState().seek(line.time);
                  }}
                >
                  {seekable && (
                    <span className="jf-lyrics-time-hint" title={`Saltar al minuto ${formatTime(line.time)}`}>
                      <Play size={10} weight="fill" />
                      <span>{formatTime(line.time)}</span>
                    </span>
                  )}
                  <motion.p
                    className={`jf-lyrics-panel-line jf-lyrics-panel-line--${i} ${active ? 'is-active' : ''}`}
                    animate={{
                      opacity: !synced ? 0.88 : active ? 1 : 0.3,
                      scale: active ? 1.04 : 1,
                      x: active ? 4 : 0,
                    }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {line.text}
                  </motion.p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
