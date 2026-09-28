import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  X,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Heart,
  Shuffle,
  Repeat,
  ArrowsOut,
  ArrowsIn,
  Disc,
  TextT,
  WaveSine,
  Sparkle,
  SpeakerHigh,
  SpeakerSimpleX,
} from '@phosphor-icons/react';
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
import { FullscreenVisualizer } from './FullscreenVisualizer';

type FullscreenMode = 'studio' | 'lyrics' | 'visualizer';

export function FullscreenPlayer() {
  const player = usePlayerStore();
  const song = player.currentSong;
  const isLiked = useLibraryStore((s) => (song ? s.likedIds.includes(song.id) : false));
  const reduce = useReducedMotion();

  const [mode, setMode] = useState<FullscreenMode>('studio');
  const [cinemaMode, setCinemaMode] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);

  const { lines, activeIndex, loading } = useLyrics(
    song?.name ?? null,
    songArtistMeta(song),
    song?.lyrics ?? null
  );

  // Auto-scroll lyrics smoothly to active line
  useEffect(() => {
    if (activeIndex < 0 || !lyricsRef.current) return;
    const container = lyricsRef.current;
    const active = container.querySelector<HTMLElement>(`.jf-lyrics-line--${activeIndex}`);
    if (!active) return;
    const cRect = container.getBoundingClientRect();
    const aRect = active.getBoundingClientRect();
    const top = container.scrollTop + aRect.top - cRect.top - container.clientHeight / 2 + aRect.height / 2;
    container.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }, [activeIndex, reduce, mode]);

  // Track native browser fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleNativeFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  // Idle detection for Cinema / Focus mode
  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (cinemaMode) {
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
      }, 4200);
    }
  }, [cinemaMode]);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [cinemaMode, resetIdleTimer]);

  const handlePlayPause = () => {
    if (!song) return;
    if (player.isPlaying) pausePlayback();
    else ensurePlaying();
  };

  const handleVolumeToggleMute = () => {
    player.setMuted(!player.muted);
  };

  const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!player.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(ratio * player.duration);
  };

  return (
    <Modal name="fullscreen" width={1920} className="jf-modal--fullscreen">
      {song && (
        <div
          className={`jf-fullscreen ${cinemaMode ? 'is-cinema' : ''} ${isIdle ? 'is-idle' : ''} mode--${mode}`}
          onMouseMove={resetIdleTimer}
          onClick={resetIdleTimer}
        >
          {/* Dynamic Living Aurora Gradient Engine */}
          <div className="jf-fullscreen-aurora" aria-hidden="true">
            <span className="jf-aurora-orb jf-aurora-orb--1" />
            <span className="jf-aurora-orb jf-aurora-orb--2" />
            <span className="jf-aurora-orb jf-aurora-orb--3" />
            <span className="jf-aurora-orb jf-aurora-orb--4" />
            <span className={`jf-aurora-beat ${player.isPlaying ? 'is-beating' : ''}`} />
            <div className="jf-aurora-noise" />
            <div className="jf-aurora-vignette" />
          </div>

          {/* Top Floating Glass Header */}
          <header className="jf-fullscreen-header">
            {/* Left: Studio Identity & Quality Indicator */}
            <div className="jf-fs-brand">
              <div className="jf-fs-brand-dot">
                <span className={`jf-fs-pulse-ring ${player.isPlaying ? 'is-live' : ''}`} />
                <span className="jf-fs-pulse-core" />
              </div>
              <div className="jf-fs-brand-info">
                <span className="jf-fs-brand-title">JodiFy Studio Pro</span>
                <span className="jf-fs-brand-badge">
                  {song.genre ? `${song.genre} • ` : ''}Master Lossless • Hi-Res
                </span>
              </div>
            </div>

            {/* Center: Segmented Experience Mode Pill */}
            <nav className="jf-fs-mode-nav" aria-label="Modo de visualización">
              <button
                type="button"
                className={`jf-fs-mode-btn ${mode === 'studio' ? 'is-active' : ''}`}
                onClick={() => setMode('studio')}
                title="Estudio y Vinilo 3D"
              >
                <Disc size={18} weight={mode === 'studio' ? 'fill' : 'regular'} />
                <span>Vinilo</span>
              </button>
              <button
                type="button"
                className={`jf-fs-mode-btn ${mode === 'lyrics' ? 'is-active' : ''}`}
                onClick={() => setMode('lyrics')}
                title="Letras Dinámicas Sing"
              >
                <TextT size={18} weight={mode === 'lyrics' ? 'bold' : 'regular'} />
                <span>Letras</span>
              </button>
              <button
                type="button"
                className={`jf-fs-mode-btn ${mode === 'visualizer' ? 'is-active' : ''}`}
                onClick={() => setMode('visualizer')}
                title="Espectro de Frecuencias en Vivo"
              >
                <WaveSine size={18} weight={mode === 'visualizer' ? 'bold' : 'regular'} />
                <span>Espectro</span>
              </button>
            </nav>

            {/* Right: Actions Cluster */}
            <div className="jf-fs-actions">
              <button
                type="button"
                className={`jf-fs-action-btn ${cinemaMode ? 'is-active' : ''}`}
                onClick={() => setCinemaMode((c) => !c)}
                title={cinemaMode ? 'Salir de Modo Cinema' : 'Activar Modo Cinema / Relajación'}
                aria-label="Modo Cinema"
              >
                <Sparkle size={19} weight={cinemaMode ? 'fill' : 'regular'} />
              </button>

              <button
                type="button"
                className="jf-fs-action-btn"
                onClick={toggleNativeFullscreen}
                title={isNativeFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa nativa'}
                aria-label="Alternar pantalla completa nativa"
              >
                {isNativeFullscreen ? <ArrowsIn size={19} /> : <ArrowsOut size={19} />}
              </button>

              <motion.button
                type="button"
                className={`jf-fs-action-btn ${isLiked ? 'is-liked' : ''}`}
                aria-label={isLiked ? 'Quitar like' : 'Me gusta'}
                onClick={() => void toggleLikeCurrent()}
                animate={{ scale: isLiked ? [1, 1.35, 1] : 1 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                title={isLiked ? 'En tus favoritos' : 'Añadir a favoritos'}
              >
                <Heart size={19} weight={isLiked ? 'fill' : 'regular'} />
              </motion.button>

              <button
                type="button"
                className="jf-fs-action-btn jf-fs-close-btn"
                aria-label="Cerrar reproductor"
                onClick={() => useUiStore.getState().close('fullscreen')}
                title="Cerrar (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {/* Central Main Stage */}
          <main className="jf-fullscreen-stage">
            <AnimatePresence mode="wait">
              {/* MODE 1: STUDIO & 3D VINYL */}
              {mode === 'studio' && (
                <motion.div
                  key="stage-studio"
                  className="jf-fs-studio-grid"
                  initial={{ opacity: 0, y: 16, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -16, filter: 'blur(10px)' }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="jf-fs-vinyl-showcase">
                    <div className="jf-vinyl-deck">
                      {/* Realistic Vinyl Record */}
                      <div
                        className={`jf-vinyl-disc ${player.isPlaying && !reduce ? 'is-spinning' : ''}`}
                        aria-hidden="true"
                      >
                        <div className="jf-vinyl-center-label">
                          <SongCover song={song} alt="" className="jf-vinyl-label-art" />
                          <div className="jf-vinyl-spindle" />
                        </div>
                      </div>

                      {/* Cover Sleeve */}
                      <div className="jf-vinyl-sleeve">
                        <SongCover
                          song={song}
                          alt={`Portada de ${song.name}`}
                          className="jf-fullscreen-cover"
                          eager
                        />
                        <div className="jf-sleeve-sheen" />
                      </div>
                    </div>

                    <div className="jf-fs-track-info">
                      <div className="jf-fs-meta-pills">
                        <span className="jf-fs-pill">
                          <span className="jf-pill-pulse" />
                          En reproducción
                        </span>
                        {song.album && <span className="jf-fs-pill jf-fs-pill--dim">{song.album}</span>}
                      </div>

                      <h1 className="jf-fullscreen-title" title={song.name}>
                        {song.name}
                      </h1>

                      <p className="jf-fullscreen-artist">
                        {songArtistMeta(song) || 'JodiFy Artist'}
                      </p>
                    </div>
                  </div>

                  {/* Right Side Lyrics Preview Stream in Studio Mode */}
                  <div className="jf-fs-studio-lyrics-wrapper">
                    <div className="jf-fs-lyrics-container" ref={lyricsRef} aria-live="polite">
                      {loading ? (
                        <div className="jf-lyrics-skeleton" aria-label="Cargando letras">
                          <span />
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : lines.length === 0 ? (
                        <div className="jf-lyrics-empty">
                          <TextT size={40} weight="light" className="jf-empty-icon" />
                          <p className="jf-lyrics-hint">Instrumental o sin letra sincronizada disponible.</p>
                          <span className="jf-lyrics-subhint">Siente la vibración del sonido puro.</span>
                        </div>
                      ) : (
                        lines.map((line, i) => (
                          <p
                            key={i}
                            className={`jf-lyrics-line jf-lyrics-line--${i} ${
                              i === activeIndex ? 'is-active' : ''
                            } ${i < activeIndex ? 'is-past' : ''} ${line.time >= 0 ? 'is-seekable' : ''}`}
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
                </motion.div>
              )}

              {/* MODE 2: FULLSCREEN EXPANDED LYRICS (SING MODE) */}
              {mode === 'lyrics' && (
                <motion.div
                  key="stage-lyrics"
                  className="jf-fs-sing-stage"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="jf-fs-sing-header">
                    <SongCover song={song} alt="" className="jf-sing-mini-art" />
                    <div>
                      <h2 className="jf-sing-title">{song.name}</h2>
                      <p className="jf-sing-artist">{songArtistMeta(song) || 'JodiFy'}</p>
                    </div>
                  </div>

                  <div className="jf-fs-lyrics-container jf-fs-lyrics--expanded" ref={lyricsRef} aria-live="polite">
                    {loading ? (
                      <div className="jf-lyrics-skeleton">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : lines.length === 0 ? (
                      <div className="jf-lyrics-empty">
                        <p className="jf-lyrics-hint">No hay letras sincronizadas para esta canción.</p>
                      </div>
                    ) : (
                      lines.map((line, i) => (
                        <p
                          key={i}
                          className={`jf-lyrics-line jf-lyrics-line--${i} jf-lyrics-line--giant ${
                            i === activeIndex ? 'is-active' : ''
                          } ${i < activeIndex ? 'is-past' : ''} ${line.time >= 0 ? 'is-seekable' : ''}`}
                          onClick={() => {
                            if (line.time >= 0) usePlayerStore.getState().seek(line.time);
                          }}
                        >
                          {line.text}
                        </p>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {/* MODE 3: LIVE AUDIO SPECTRUM VISUALIZER */}
              {mode === 'visualizer' && (
                <motion.div
                  key="stage-visualizer"
                  className="jf-fs-visualizer-stage"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="jf-fs-vis-artwork-wrap">
                    <SongCover
                      song={song}
                      alt={song.name}
                      className={`jf-fs-vis-art ${player.isPlaying ? 'is-pumping' : ''}`}
                    />
                    <div className="jf-fs-vis-aura" />
                  </div>

                  <div className="jf-fs-vis-meta">
                    <h2 className="jf-fullscreen-title">{song.name}</h2>
                    <p className="jf-fullscreen-artist">{songArtistMeta(song) || 'JodiFy Studio'}</p>
                  </div>

                  {/* Realtime Canvas Spectrum */}
                  <div className="jf-fs-canvas-wrapper">
                    <FullscreenVisualizer className="jf-fs-main-spectrum" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Bottom Floating Glass Dock (Controls & Timeline) */}
          <footer className="jf-fullscreen-footer">
            {/* Timeline Bar with Hover Time */}
            <div className="jf-fs-timeline-container" onMouseMove={handleTimelineHover} onMouseLeave={() => setHoverTime(null)}>
              <div className="jf-fs-timeline-row">
                <span className="jf-fs-time jf-fs-time--elapsed">{formatTime(player.currentTime)}</span>

                <div className="jf-fs-slider-wrap">
                  <Slider
                    className="jf-progress jf-progress--fullscreen"
                    min={0}
                    max={player.duration || 100}
                    step={0.1}
                    value={Math.min(player.currentTime, player.duration || 100)}
                    onChange={(e) => player.seek(Number(e.target.value))}
                    aria-label="Línea de tiempo"
                  />
                  {hoverTime !== null && (
                    <span
                      className="jf-fs-hover-tooltip"
                      style={{
                        left: `${(hoverTime / (player.duration || 1)) * 100}%`,
                      }}
                    >
                      {formatTime(hoverTime)}
                    </span>
                  )}
                </div>

                <span className="jf-fs-time jf-fs-time--remaining">
                  {player.duration > 0 ? `-${formatTime(Math.max(0, player.duration - player.currentTime))}` : '0:00'}
                </span>
              </div>
            </div>

            {/* Glass Island Primary Controls */}
            <div className="jf-fs-controls-island">
              {/* Secondary Left: Shuffle & Prev */}
              <div className="jf-fs-controls-cluster">
                <button
                  type="button"
                  className={`jf-control jf-fs-btn ${player.isShuffle ? 'is-active' : ''}`}
                  aria-label="Modo aleatorio"
                  onClick={player.toggleShuffle}
                  title="Modo aleatorio"
                >
                  <Shuffle size={20} weight={player.isShuffle ? 'bold' : 'regular'} />
                </button>

                <button
                  type="button"
                  className="jf-control jf-fs-btn"
                  aria-label="Pista anterior"
                  onClick={() => void player.previous()}
                  title="Anterior"
                >
                  <SkipBack size={22} weight="fill" />
                </button>
              </div>

              {/* Radiant Center Play/Pause */}
              <button
                type="button"
                className="jf-control jf-fs-play-btn"
                aria-label={player.isPlaying ? 'Pausar' : 'Reproducir'}
                onClick={handlePlayPause}
                title={player.isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={player.isPlaying ? 'pause' : 'play'}
                    initial={{ scale: 0.45, opacity: 0, rotate: -25 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.45, opacity: 0, rotate: 25 }}
                    transition={{ type: 'spring', duration: 0.28, bounce: 0.25 }}
                    className="jf-fs-play-icon"
                  >
                    {player.isPlaying ? <Pause size={28} weight="fill" /> : <Play size={28} weight="fill" />}
                  </motion.span>
                </AnimatePresence>
              </button>

              {/* Secondary Right: Next & Repeat */}
              <div className="jf-fs-controls-cluster">
                <button
                  type="button"
                  className="jf-control jf-fs-btn"
                  aria-label="Siguiente pista"
                  onClick={() => void player.next()}
                  title="Siguiente"
                >
                  <SkipForward size={22} weight="fill" />
                </button>

                <button
                  type="button"
                  className={`jf-control jf-fs-btn ${player.isLoop ? 'is-active' : ''}`}
                  aria-label="Repetir canción"
                  onClick={player.toggleLoop}
                  title="Repetir"
                >
                  <Repeat size={20} weight={player.isLoop ? 'bold' : 'regular'} />
                </button>
              </div>

              {/* Volume Capsule Inside Island */}
              <div className="jf-fs-volume-capsule">
                <button
                  type="button"
                  className="jf-fs-vol-btn"
                  onClick={handleVolumeToggleMute}
                  title={player.muted ? 'Desmutear' : 'Silenciar'}
                >
                  {player.muted || player.volume === 0 ? (
                    <SpeakerSimpleX size={18} />
                  ) : (
                    <SpeakerHigh size={18} />
                  )}
                </button>
                <Slider
                  className="jf-fs-vol-slider"
                  min={0}
                  max={1}
                  step={0.01}
                  value={player.muted ? 0 : player.volume}
                  onChange={(e) => {
                    player.setVolume(Number(e.target.value));
                    if (player.muted) player.setMuted(false);
                  }}
                  aria-label="Volumen"
                />
              </div>
            </div>
          </footer>
        </div>
      )}
    </Modal>
  );
}
