import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Disc,
  Queue,
  Link as LinkIcon,
  TextT,
  Trash,
  MusicNotes,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Sparkle,
  Waveform,
  DotsSixVertical,
} from '@phosphor-icons/react';
import { usePlayerStore } from '../../store/player.store';
import { useQueueStore } from '../../store/queue.store';
import { useUiStore } from '../../store/ui.store';
import { useLyrics } from '../../hooks/useLyrics';
import { songArtistMeta, resolveMediaUrl, formatTime } from '../../lib/utils';
import { useSongCoverGradient } from '../../lib/colorExtractor';
import { useToastStore } from '../../store/toast.store';
import { useContextMenuStore } from '../../store/contextmenu.store';
import { audioFxService } from '../../services/audioFx.service';
import { equalizerApi } from '../../services/equalizer.service';

export function HomeSideWidget() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const onContextMenuCurrentSong = (e: React.MouseEvent) => {
    if (!currentSong) return;
    e.preventDefault();
    e.stopPropagation();
    useContextMenuStore.getState().show(e.clientX, e.clientY, currentSong);
  };
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seek = usePlayerStore((s) => s.seek);

  const queue = useQueueStore((s) => s.items);
  const removeQueue = useQueueStore((s) => s.remove);
  const clearQueue = useQueueStore((s) => s.clear);
  const moveQueue = useQueueStore((s) => s.move);
  const ui = useUiStore();

  // Color de iluminación ambiental según portada de la canción actual
  const gradient = useSongCoverGradient(currentSong);

  // Letra actual en tiempo real para el sneak-peek de la tornamesa
  const { lines, activeIndex } = useLyrics(
    currentSong?.name ?? null,
    songArtistMeta(currentSong),
    currentSong?.lyrics ?? null,
  );
  const currentLyricLine = activeIndex >= 0 && lines[activeIndex] ? lines[activeIndex].text : null;

  const totalDuration = duration || currentSong?.duration || 0;
  const progressPercent = totalDuration > 0 ? Math.min(100, Math.max(0, (currentTime / totalDuration) * 100)) : 0;

  // ================= ESTADO DE SCRATCH INTERACTIVO DEL VINILO =================
  const discRef = useRef<HTMLDivElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchAngle, setScratchAngle] = useState(0);
  const lastAngleRef = useRef(0);
  const isPointerDownRef = useRef(false);

  const onDiscPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    isPointerDownRef.current = true;
    setIsScratching(true);
    const rect = discRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    lastAngleRef.current = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
  };

  const onDiscPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    const rect = discRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    let delta = currentAngle - lastAngleRef.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastAngleRef.current = currentAngle;

    setScratchAngle((prev) => prev + delta);
    audioFxService.onVinylScratch(delta, totalDuration > 0 ? currentTime / totalDuration : 0);
  };

  const onDiscPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPointerDownRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      isPointerDownRef.current = false;
      setIsScratching(false);
    }
  };

  // ================= ESPECTRO DE AUDIO DINÁMICO EN VIVO (WEB AUDIO API) =================
  const [frequencies, setFrequencies] = useState<number[]>(() => Array(20).fill(12));

  useEffect(() => {
    let animId: number;
    let phase = 0;
    const updateSpectrum = () => {
      phase += 0.05;
      const analyser = equalizerApi.getAnalyser();
      if (analyser && isPlaying) {
        const buffer = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buffer);
        const step = Math.max(1, Math.floor(buffer.length / 24));
        const sampled: number[] = [];
        for (let i = 0; i < 20; i++) {
          const val = buffer[i * step] || 0;
          sampled.push(Math.max(12, Math.min(100, Math.round((val / 255) * 100))));
        }
        setFrequencies(sampled);
      } else if (isPlaying) {
        // Onda viva armónica en reproducción
        const sampled: number[] = [];
        for (let i = 0; i < 20; i++) {
          const wave = Math.sin(phase + i * 0.45) * 35 + 45;
          sampled.push(Math.round(wave));
        }
        setFrequencies(sampled);
      } else {
        // En pausa: reposo sutil
        setFrequencies((prev) => (prev[0] === 8 ? prev : prev.map(() => 8)));
      }
      animId = requestAnimationFrame(updateSpectrum);
    };

    animId = requestAnimationFrame(updateSpectrum);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // ================= REORDENAR COLA CON DRAG & DROP =================
  const [queueDragOver, setQueueDragOver] = useState<number | null>(null);
  const [queueDraggingIdx, setQueueDraggingIdx] = useState<number | null>(null);

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!totalDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seek(ratio * totalDuration);
  };

  return (
    <aside className="jf-home-side-widget" data-testid="home-side-widget">
      {/* ================= WIDGET 1: TORNAMESA MASTER AUDIO ULTRA-DETALLADA ================= */}
      <div
        className="jf-side-card jf-side-turntable-card"
        style={{
          boxShadow: gradient.glowColor ? `0 16px 38px ${gradient.glowColor}` : undefined,
        }}
      >
        {/* Cabecera del reproductor Master Audio */}
        <div className="jf-turntable-header">
          <div className="jf-turntable-header-tag">
            <Waveform size={14} weight="bold" className="is-accent-icon" />
            <span className="jf-side-card-tag">Master Audio Hi-Fi</span>
          </div>

          <span className={`jf-side-card-status ${isPlaying ? 'is-playing' : ''}`}>
            {isPlaying ? (
              <>
                <span className="jf-live-dot" /> En Giro (320 kbps)
              </>
            ) : (
              'Detenido'
            )}
          </span>
        </div>

        {/* Deck de la Tornamesa con Plato, Vinilo y Brazo Fonocaptor */}
        <div
          className="jf-turntable-deck"
          onClick={() => {
            // Si el usuario estaba haciendo scratch no alternamos play
            if (!isScratching) togglePlay();
          }}
          role="button"
          tabIndex={0}
          title={isScratching ? '¡Scratching!' : isPlaying ? 'Clic para pausar · Mantén presionado el vinilo para hacer scratch DJ' : 'Clic para reanudar'}
        >
          {/* Brillo ambiental de la tornamesa */}
          <div
            className="jf-turntable-ambient-halo"
            style={{
              background: gradient.glowColor
                ? `radial-gradient(circle, ${gradient.glowColor} 0%, transparent 70%)`
                : undefined,
            }}
          />

          <div className="jf-turntable-platter">
            {/* Vinilo interactivo: soporte para Scratch con arrastre del mouse */}
            <div
              ref={discRef}
              className={`jf-vinyl-disc ${isPlaying && !isScratching ? 'is-spinning' : ''} ${isScratching ? 'is-scratching' : ''}`}
              style={isScratching ? { transform: `rotate(${scratchAngle}deg)`, cursor: 'grabbing' } : undefined}
              onPointerDown={onDiscPointerDown}
              onPointerMove={onDiscPointerMove}
              onPointerUp={onDiscPointerUp}
              onPointerCancel={onDiscPointerUp}
              title="Arrastra para hacer scratch como DJ"
            >
              <div className="jf-vinyl-grooves" />
              <div className="jf-vinyl-reflection" />
              <div className="jf-vinyl-center-label">
                {currentSong?.cover_url ? (
                  <img
                    src={resolveMediaUrl(currentSong.cover_url)}
                    alt=""
                    className="jf-vinyl-center-art"
                  />
                ) : (
                  <Disc size={34} weight="duotone" className="jf-vinyl-center-icon" />
                )}
                <div className="jf-vinyl-spindle" />
              </div>
            </div>

            {/* Brazo de aguja mecánica */}
            <div className={`jf-turntable-tonearm ${isPlaying ? 'is-playing' : ''} ${isScratching ? 'is-scratching' : ''}`}>
              <div className="jf-tonearm-base" />
              <div className="jf-tonearm-stick" />
              <div className="jf-tonearm-head">
                <span className="jf-tonearm-stylus-glow" />
              </div>
            </div>

            {/* Overlay sutil indicando interactividad de scratch */}
            {!isScratching && (
              <div className="jf-turntable-overlay-btn" aria-hidden="true">
                {isPlaying ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" />}
              </div>
            )}
          </div>
        </div>

        {/* ================= INFORMACIÓN NÍTIDA Y CONTROLES DE LA CANCIÓN ================= */}
        <div
          className="jf-turntable-song-info-card"
          onContextMenu={onContextMenuCurrentSong}
          title={currentSong ? `Clic derecho para ver opciones de «${currentSong.name}»` : undefined}
        >
          <div className="jf-turntable-info-top">
            <div className="jf-turntable-text-wrap">
              <h3 className="jf-turntable-song-title" title={currentSong?.name || 'Sin canción seleccionada'}>
                {currentSong?.name || 'Ninguna pista seleccionada'}
              </h3>
              <p className="jf-turntable-song-artist" title={currentSong?.artist || 'JodiFy'}>
                {currentSong?.artist || 'Selecciona una canción en el inicio'}
                {currentSong?.album ? ` · ${currentSong.album}` : ''}
              </p>
            </div>
            {currentSong && (
              <span className="jf-turntable-quality-badge">
                <Sparkle size={11} weight="fill" /> 320K
              </span>
            )}
          </div>

          {/* Barra de progreso interactiva */}
          <div
            className="jf-turntable-progress-wrap"
            onClick={handleSeekClick}
            role="progressbar"
            aria-valuenow={currentTime}
            aria-valuemin={0}
            aria-valuemax={totalDuration}
            title="Haz clic para avanzar o retroceder"
          >
            <div className="jf-turntable-progress-track">
              <div
                className="jf-turntable-progress-fill"
                style={{ width: `${progressPercent}%` }}
              >
                <span className="jf-turntable-progress-thumb" />
              </div>
            </div>
          </div>

          {/* Tiempos de reproducción */}
          <div className="jf-turntable-times-row">
            <span className="jf-turntable-time">{formatTime(currentTime)}</span>
            <span className="jf-turntable-time">{formatTime(totalDuration)}</span>
          </div>

          {/* Controles táctiles inmediatos (Prev, Play/Pausa, Next) */}
          <div className="jf-turntable-controls-row">
            <button
              type="button"
              className="jf-btn-icon jf-btn-icon--sm"
              onClick={(e) => {
                e.stopPropagation();
                void previous();
              }}
              title="Canción anterior"
            >
              <SkipBack size={18} weight="fill" />
            </button>

            <button
              type="button"
              className="jf-turntable-main-play-btn"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
            </button>

            <button
              type="button"
              className="jf-btn-icon jf-btn-icon--sm"
              onClick={(e) => {
                e.stopPropagation();
                void next();
              }}
              title="Siguiente canción"
            >
              <SkipForward size={18} weight="fill" />
            </button>
          </div>
        </div>

        {/* Espectro reactivo de audio en tiempo real (20 barras vivas sincronizadas con Web Audio) */}
        <div className={`jf-turntable-spectrum ${isPlaying ? 'is-active' : ''}`} title="Espectro reactivo en vivo a las frecuencias del sonido">
          {frequencies.map((freqHeight, i) => (
            <span
              key={i}
              className={`jf-spec-bar ${isPlaying ? 'is-active' : ''}`}
              style={{
                height: `${freqHeight}%`,
                transition: 'height 0.08s ease',
              }}
            />
          ))}
        </div>

        {/* Letra activa actual en sneak-peek con clic directo a modo Karaoke */}
        <div
          className="jf-turntable-lyric-peek"
          onClick={() => ui.setMainView('lyrics')}
          role="button"
          tabIndex={0}
          title="Haz clic para ver letras completas en grande (Modo Karaoke)"
        >
          <TextT size={16} weight="bold" className="jf-lyric-peek-icon" />
          <div className="jf-lyric-peek-content">
            <AnimatePresence mode="wait">
              {currentLyricLine ? (
                <motion.p
                  key={currentLyricLine}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="jf-turntable-lyric-text"
                >
                  «{currentLyricLine}»
                </motion.p>
              ) : (
                <p className="jf-turntable-lyric-idle">
                  {currentSong ? 'Letras sincronizadas disponibles · Clic para ver' : 'Selecciona una canción para comenzar'}
                </p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ================= WIDGET 2: COLA PRIORITARIA & SIGUIENTES (CON ARRASTRE / REORDENAR) ================= */}
      <div className="jf-side-card jf-side-queue-card">
        <div className="jf-side-card-head">
          <div className="jf-side-card-title-group">
            <Queue size={18} weight="bold" className="is-accent-icon" />
            <h3 className="jf-side-card-title">Cola Prioritaria & Siguientes</h3>
          </div>
          {queue.length > 0 && (
            <button
              type="button"
              className="jf-side-card-action-btn"
              onClick={clearQueue}
              title="Vaciar cola de reproducción"
            >
              <Trash size={14} />
            </button>
          )}
        </div>

        <div className="jf-side-queue-list">
          {queue.length === 0 ? (
            <div className="jf-side-queue-empty">
              <Queue size={28} weight="duotone" />
              <p>Tu cola está despejada.</p>
              <span>Haz clic derecho en cualquier canción y elige «Reproducir a continuación».</span>
            </div>
          ) : (
            queue.slice(0, 8).map((qSong, idx) => {
              const isItemDragging = queueDraggingIdx === idx;
              return (
                <div
                  key={`${qSong.id}-${idx}`}
                  className={`jf-side-queue-item ${isItemDragging ? 'is-dragging' : ''} ${queueDragOver === idx ? 'is-drag-over' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    setQueueDraggingIdx(idx);
                    e.dataTransfer.setData('text/plain', String(idx));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (queueDragOver !== idx) setQueueDragOver(idx);
                  }}
                  onDragLeave={() => setQueueDragOver((cur) => (cur === idx ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = Number(e.dataTransfer.getData('text/plain'));
                    setQueueDragOver(null);
                    setQueueDraggingIdx(null);
                    if (!Number.isNaN(from) && from !== idx) {
                      moveQueue(from, idx);
                      useToastStore.getState().show('Canción reordenada en la cola', 'success', 1200);
                    }
                  }}
                  onDragEnd={() => {
                    setQueueDragOver(null);
                    setQueueDraggingIdx(null);
                  }}
                  title="Mantén presionado y arrastra para cambiar de orden"
                >
                  {queueDragOver === idx && <span className="jf-queue-drop-line" aria-hidden="true" />}
                  <span className="jf-side-queue-grip" title="Arrastrar para mover">
                    <DotsSixVertical size={14} weight="bold" />
                  </span>
                  <span className="jf-side-queue-idx">{idx === 0 ? '1' : idx + 1}</span>
                  {qSong.cover_url ? (
                    <img
                      className="jf-side-queue-thumb"
                      src={resolveMediaUrl(qSong.cover_url)}
                      alt=""
                    />
                  ) : (
                    <div className="jf-side-queue-thumb jf-side-queue-thumb--placeholder">
                      <MusicNotes size={14} />
                    </div>
                  )}
                  <div className="jf-side-queue-info">
                    <span className="jf-side-queue-title" title={qSong.name}>
                      {qSong.name}
                    </span>
                    <span className="jf-side-queue-artist">{qSong.artist || 'JodiFy'}</span>
                  </div>
                  {idx === 0 && (
                    <span className="jf-priority-badge" title="Agregada con prioridad">
                      Prioridad
                    </span>
                  )}
                  <button
                    type="button"
                    className="jf-side-queue-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeQueue(qSong.id);
                    }}
                    title="Quitar de la cola"
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= WIDGET 3: ACCIONES RÁPIDAS & DESCUBRIMIENTO ================= */}
      <div className="jf-side-card jf-side-quick-card">
        {/* Banner destacado: Buscar por Enlace (YouTube / MP3 / SoundCloud) */}
        <div
          className="jf-quick-banner jf-quick-banner--link"
          onClick={() => ui.open('linkMusic')}
          role="button"
          tabIndex={0}
        >
          <div className="jf-quick-banner-icon">
            <LinkIcon size={22} weight="bold" />
          </div>
          <div className="jf-quick-banner-text">
            <h4>Música por Enlace</h4>
            <p>Pega un link de YouTube, SoundCloud o MP3 para reproducir gratis o sugerir</p>
          </div>
          <span className="jf-quick-banner-arrow">→</span>
        </div>

        {/* Banner destacado: Modo Letras y Karaoke */}
        <div
          className="jf-quick-banner jf-quick-banner--lyrics"
          onClick={() => ui.setMainView('lyrics')}
          role="button"
          tabIndex={0}
        >
          <div className="jf-quick-banner-icon jf-quick-banner-icon--lyrics">
            <TextT size={22} weight="bold" />
          </div>
          <div className="jf-quick-banner-text">
            <h4>Modo Karaoke (T)</h4>
            <p>Pulsa la tecla T o aquí para ver letras sincronizadas a pantalla completa</p>
          </div>
          <span className="jf-key-hint">T</span>
        </div>
      </div>
    </aside>
  );
}
