import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, SkipBack, Play, Pause, SkipForward, Heart, Shuffle, Repeat } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { Slider } from '../ui/Slider';
import { usePlayerStore } from '../../store/player.store';
import { useLibraryStore } from '../../store/library.store';
import { useUiStore } from '../../store/ui.store';
import { useLyrics } from '../../hooks/useLyrics';
import { formatTime, songArtistMeta } from '../../lib/utils';
import { SongCover } from '../ui/SongCover';
import { ensurePlaying, pausePlayback } from '../../services/player.service';
import { toggleLikeCurrent } from '../../services/player-shortcuts';

export function FullscreenPlayer() {
  const player = usePlayerStore();
  const song = player.currentSong;
  const isLiked = useLibraryStore((s) => s.likedIds.includes(String(song?.id)));
  const reduce = useReducedMotion();

  const { lines, activeIndex, loading } = useLyrics(song?.name ?? null, songArtistMeta(song));

  const lyricsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeIndex < 0 || !lyricsRef.current) return;
    const container = lyricsRef.current;
    const active = container.querySelector<HTMLElement>(`.jf-lyrics-line--${activeIndex}`);
    if (!active) return;
    const cRect = container.getBoundingClientRect();
    const aRect = active.getBoundingClientRect();
    const top = container.scrollTop + aRect.top - cRect.top - container.clientHeight / 2 + aRect.height / 2;
    container.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }, [activeIndex, reduce]);

  const handlePlayPause = () => {
    if (!song) return;
    if (player.isPlaying) pausePlayback();
    else ensurePlaying();
  };

  return (
    <Modal name="fullscreen" width={1240} className="jf-modal--fullscreen">
      {song && (
        <div className="jf-fullscreen">
          <div className="jf-fullscreen-ambient" aria-hidden="true">
            <span className="jf-ambient-blob jf-ambient-blob--a" />
            <span className="jf-ambient-blob jf-ambient-blob--b" />
            <span className="jf-ambient-blob jf-ambient-blob--c" />
          </div>

          <div className="jf-fullscreen-left">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={song.id}
                className="jf-vinyl"
                initial={{ opacity: 0, scale: 0.9, y: 24, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.94, y: -10 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className={`jf-vinyl-disc ${player.isPlaying && !reduce ? 'is-spinning' : ''}`} aria-hidden="true" />
                <SongCover song={song} alt={`Portada de ${song.name}`} className="jf-fullscreen-cover" eager />
              </motion.div>
            </AnimatePresence>

            <div className="jf-fullscreen-meta">
              <span className="jf-eyebrow">
                <span className="jf-eyebrow-dot" />
                Ahora suena
              </span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.h2
                  key={song.id}
                  className="jf-fullscreen-title"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  {song.name}
                </motion.h2>
              </AnimatePresence>
              <p className="jf-fullscreen-artist">{songArtistMeta(song) || 'JodiFy Studio'}</p>
            </div>

            <div className="jf-fullscreen-timeline">
              <span className="jf-time">{formatTime(player.currentTime)}</span>
              <Slider
                className="jf-progress jf-progress--large"
                min={0}
                max={player.duration || 100}
                step={0.1}
                value={Math.min(player.currentTime, player.duration || 100)}
                onChange={(e) => player.seek(Number(e.target.value))}
                aria-label="Progreso"
              />
              <span className="jf-time">{formatTime(player.duration)}</span>
            </div>

            <div className="jf-fullscreen-controls">
              <button
                className={`jf-control ${player.isShuffle ? 'is-active' : ''}`}
                aria-label="Aleatorio"
                onClick={player.toggleShuffle}
              >
                <Shuffle size={18} />
              </button>
              <button className="jf-control" aria-label="Anterior" onClick={() => void player.previous()}>
                <SkipBack size={20} weight="fill" />
              </button>
              <button className="jf-control jf-control--play jf-control--play-lg" aria-label="Reproducir" onClick={handlePlayPause}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={player.isPlaying ? 'pause' : 'play'}
                    initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.5, opacity: 0, rotate: 30 }}
                    transition={{ type: 'spring', duration: 0.32, bounce: 0.22 }}
                  >
                    {player.isPlaying ? <Pause size={26} weight="fill" /> : <Play size={26} weight="fill" />}
                  </motion.span>
                </AnimatePresence>
              </button>
              <button className="jf-control" aria-label="Siguiente" onClick={() => void player.next()}>
                <SkipForward size={20} weight="fill" />
              </button>
              <button
                className={`jf-control ${player.isLoop ? 'is-active' : ''}`}
                aria-label="Repetir"
                onClick={player.toggleLoop}
              >
                <Repeat size={18} />
              </button>
            </div>
          </div>

          <div className="jf-fullscreen-right">
            <div className="jf-fullscreen-lyrics" ref={lyricsRef} aria-live="polite">
              {loading ? (
                <div className="jf-lyrics-skeleton" aria-label="Cargando letras">
                  <span />
                  <span />
                  <span />
                </div>
              ) : lines.length === 0 ? (
                <p className="jf-lyrics-hint">Sin letras disponibles. Deja que la música hable.</p>
              ) : (
                lines.map((line, i) => (
                  <p
                    key={i}
                    className={`jf-lyrics-line jf-lyrics-line--${i} ${i === activeIndex ? 'is-active' : ''} ${line.time >= 0 ? 'is-seekable' : ''}`}
                    onClick={() => {
                      if (line.time >= 0) usePlayerStore.getState().seek(line.time);
                    }}
                  >
                    {line.text}
                  </p>
                ))
              )}
            </div>
          </div>

          <div className="jf-fullscreen-actions">
            <motion.button
              className={`jf-fullscreen-like ${isLiked ? 'is-liked' : ''}`}
              aria-label={isLiked ? 'Quitar like' : 'Me gusta'}
              onClick={() => void toggleLikeCurrent()}
              animate={{ scale: isLiked ? [1, 1.4, 1] : 1 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <Heart size={20} weight={isLiked ? 'fill' : 'regular'} />
            </motion.button>
            <button className="jf-fullscreen-close" aria-label="Cerrar" onClick={() => useUiStore.getState().close('fullscreen')}>
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
