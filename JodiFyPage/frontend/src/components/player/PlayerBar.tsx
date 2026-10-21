import { AnimatePresence, motion } from 'motion/react';
import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, RepeatOnce, Heart, ArrowsOut, Moon, Sun, List, SpeakerHigh, SpeakerSimpleX, TextT, CheckCircle } from '@phosphor-icons/react';
import { usePlayerStore } from '../../store/player.store';
import { useSettingsStore } from '../../store/settings.store';
import { useUiStore } from '../../store/ui.store';
import { useToastStore } from '../../store/toast.store';
import { useLibraryStore } from '../../store/library.store';
import { Slider } from '../ui/Slider';
import { Visualizer } from './Visualizer';
import { toggleLikeCurrent } from '../../services/player-shortcuts';
import { formatTime, songArtistMeta } from '../../lib/utils';
import { SongCover } from '../ui/SongCover';
import { ensurePlaying, pausePlayback } from '../../services/player.service';
import { useContextMenuStore } from '../../store/contextmenu.store';

function PlayerMiniProgress({ duration }: { duration: number }) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  return (
    <div className="jf-player-mini-progress" aria-hidden="true">
      <div className="jf-player-mini-progress-fill" style={{ width: `${progressPercent}%` }} />
    </div>
  );
}

function PlayerTimeline({ duration }: { duration: number }) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const seek = usePlayerStore((s) => s.seek);
  const max = duration > 0 ? duration : 100;
  return (
    <div className="jf-player-timeline">
      <span className="jf-time">{formatTime(currentTime)}</span>
      <Slider
        className="jf-progress"
        fill
        min={0}
        max={max}
        step={0.1}
        value={Math.min(currentTime, max)}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label="Progreso"
        data-testid="progress-slider"
      />
      <span className="jf-time">{formatTime(duration)}</span>
    </div>
  );
}

export function PlayerBar() {
  const song = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isOfflinePlayback = usePlayerStore((s) => s.isOfflinePlayback);
  const duration = usePlayerStore((s) => s.duration);
  const isShuffle = usePlayerStore((s) => s.isShuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeatMode = usePlayerStore((s) => s.cycleRepeatMode);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const setMuted = usePlayerStore((s) => s.setMuted);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);

  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const language = useSettingsStore((s) => s.language);
  const disableVisualizer = useSettingsStore((s) => s.disableVisualizer);

  const mainView = useUiStore((s) => s.mainView);
  const toggleMainView = useUiStore((s) => s.toggleMainView);
  const modal = useUiStore((s) => s.modal);
  const openModal = useUiStore((s) => s.open);
  const toggleModal = useUiStore((s) => s.toggle);

  const isLiked = useLibraryStore((s) => (song ? s.likedIds.some((id) => String(id) === String(song.id)) : false));

  const handlePlayPause = () => {
    if (!song) return;
    if (isPlaying) pausePlayback();
    else ensurePlaying();
  };

  return (
    <motion.footer
      className="jf-player"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      data-testid="player-bar"
    >
      {/* Barra de progreso sutil integrada para vista móvil */}
      <PlayerMiniProgress duration={duration} />

      <div
        className="jf-player-left"
        onContextMenu={(e) => {
          if (song) {
            e.preventDefault();
            e.stopPropagation();
            useContextMenuStore.getState().show(e.clientX, e.clientY, song);
          }
        }}
        title={song ? `Clic derecho para ver opciones de «${song.name}»` : undefined}
      >
        <AnimatePresence mode="popLayout">
          {song ? (
            <motion.div
              key={song.id}
              className="jf-player-cover-wrap"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <SongCover song={song} alt="" className="jf-player-cover" eager />
              {isPlaying && <span className="jf-player-cover-pulse" aria-hidden="true" />}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="jf-player-cover-wrap jf-player-cover-wrap--empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <img className="jf-player-empty-logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="JodiFy" />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="jf-player-meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <p className={`jf-player-title ${song && song.name.length > 28 ? 'is-long' : ''}`}>{song?.name ?? 'Nada sonando'}</p>
            {isOfflinePlayback && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: 'rgba(0, 240, 255, 0.12)',
                  color: '#00f0ff',
                  border: '1px solid rgba(0, 240, 255, 0.25)',
                  flexShrink: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
                title="Reproduciendo desde almacenamiento local sin conexión"
              >
                <CheckCircle size={10} weight="fill" /> Offline
              </span>
            )}
          </div>
          <p className="jf-player-artist">
            {songArtistMeta(song) || (song?.added_by ? `Por ${song.added_by}` : 'JodiFy Studio')}
            {song?.album ? ` · ${song.album}` : ''}
          </p>
        </div>
        <button
          className={`jf-like-btn ${isLiked ? 'is-liked' : ''}`}
          aria-label={isLiked ? 'Quitar like' : 'Me gusta'}
          onClick={() => void toggleLikeCurrent()}
        >
          <Heart size={18} weight={isLiked ? 'fill' : 'regular'} />
        </button>
      </div>

      <div className="jf-player-center">
        <PlayerTimeline duration={duration} />
        <div className="jf-player-controls">
          <button className={`jf-control jf-control--shuffle ${isShuffle ? 'is-active' : ''}`} aria-label="Aleatorio" onClick={toggleShuffle}>
            <Shuffle size={17} />
          </button>
          <button className="jf-control jf-control--prev" aria-label="Anterior" onClick={() => void previous()}>
            <SkipBack size={19} weight="fill" />
          </button>
          <button className="jf-control jf-control--play" aria-label="Reproducir" onClick={handlePlayPause} disabled={!song} data-testid="play-btn">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isPlaying ? 'pause' : 'play'}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
              >
                {isPlaying ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" />}
              </motion.span>
            </AnimatePresence>
          </button>
          <button className="jf-control jf-control--next" aria-label="Siguiente" onClick={() => void next()}>
            <SkipForward size={19} weight="fill" />
          </button>
          <button
            className={`jf-control jf-control--repeat ${repeatMode !== 'off' ? 'is-active' : ''} ${repeatMode === 'all' ? 'is-repeat-all' : ''} ${repeatMode === 'one' ? 'is-repeat-one' : ''}`}
            aria-label={
              repeatMode === 'all'
                ? 'Repetir toda la colección'
                : repeatMode === 'one'
                  ? 'Repetir esta canción'
                  : 'Repetición desactivada'
            }
            title={
              repeatMode === 'all'
                ? 'Repitiendo toda la colección (Clic para una canción)'
                : repeatMode === 'one'
                  ? 'Repitiendo esta canción (Clic para desactivar)'
                  : 'Activar repetición (Clic para repetir colección)'
            }
            onClick={() => {
              const nextMode = cycleRepeatMode();
              const msg =
                nextMode === 'all'
                  ? (language === 'en' ? 'Loop entire collection' : 'Repetir toda la colección')
                  : nextMode === 'one'
                    ? (language === 'en' ? 'Loop current song' : 'Repetir esta canción')
                    : (language === 'en' ? 'Repeat off' : 'Repetición desactivada');
              useToastStore.getState().show(msg, 'info', 1200);
            }}
          >
            {repeatMode === 'one' ? (
              <RepeatOnce size={18} weight="bold" />
            ) : (
              <Repeat size={17} weight={repeatMode === 'all' ? 'bold' : 'regular'} />
            )}
          </button>
        </div>
      </div>

      <div className="jf-player-right">
        {!disableVisualizer && <Visualizer />}
        <button className="jf-control" aria-label={muted ? 'Activar sonido' : 'Silenciar'} onClick={() => setMuted(!muted)}>
          {muted || volume === 0 ? <SpeakerSimpleX size={18} /> : <SpeakerHigh size={18} />}
        </button>
        <Slider
          className="jf-volume"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volumen"
          data-testid="volume-slider"
        />
        <button
          className="jf-control jf-theme-toggle"
          aria-label="Cambiar tema"
          onClick={() => toggleTheme()}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button
          className={`jf-control jf-lyrics-toggle ${mainView === 'lyrics' ? 'is-active' : ''}`}
          aria-label={mainView === 'lyrics' ? 'Volver a pantalla de inicio (T)' : 'Ver letras sincronizadas (T)'}
          title={mainView === 'lyrics' ? 'Volver a Pantalla de Inicio (T)' : 'Ver Letras Sincronizadas y Biblioteca (T)'}
          onClick={() => toggleMainView()}
        >
          <TextT size={17} weight="bold" />
        </button>
        <button className="jf-control jf-fullscreen-btn" aria-label="Pantalla completa" onClick={() => openModal('fullscreen')} disabled={!song}>
          <ArrowsOut size={17} />
        </button>
        <button
          className={`jf-control jf-player-queue-btn ${modal === 'queue' ? 'is-active' : ''}`}
          aria-label="Abrir cola de reproducción"
          title="Cola de reproducción (Q)"
          onClick={() => toggleModal('queue')}
        >
          <List size={17} weight="bold" />
        </button>
      </div>
    </motion.footer>
  );
}
