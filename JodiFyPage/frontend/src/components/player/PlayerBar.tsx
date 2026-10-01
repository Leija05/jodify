import { AnimatePresence, motion } from 'motion/react';
import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, RepeatOnce, Heart, ArrowsOut, Moon, Sun, List, SpeakerHigh, SpeakerSimpleX, TextT } from '@phosphor-icons/react';
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

export function PlayerBar() {
  const player = usePlayerStore();
  const settings = useSettingsStore();
  const ui = useUiStore();

  const song = player.currentSong;
  const isLiked = useLibraryStore((s) => (song ? s.likedIds.includes(song.id) : false));

  const handlePlayPause = () => {
    if (!song) return;
    if (player.isPlaying) pausePlayback();
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
              {player.isPlaying && <span className="jf-player-cover-pulse" aria-hidden="true" />}
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
          <p className={`jf-player-title ${song && song.name.length > 28 ? 'is-long' : ''}`}>{song?.name ?? 'Nada sonando'}</p>
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
        <div className="jf-player-timeline">
          <span className="jf-time">{formatTime(player.currentTime)}</span>
          <Slider
            className="jf-progress"
            fill
            min={0}
            max={player.duration && player.duration > 0 ? player.duration : 100}
            step={0.1}
            value={Math.min(player.currentTime, player.duration && player.duration > 0 ? player.duration : 100)}
            onChange={(e) => player.seek(Number(e.target.value))}
            aria-label="Progreso"
            data-testid="progress-slider"
          />
          <span className="jf-time">{formatTime(player.duration)}</span>
        </div>
        <div className="jf-player-controls">
          <button className={`jf-control ${player.isShuffle ? 'is-active' : ''}`} aria-label="Aleatorio" onClick={player.toggleShuffle}>
            <Shuffle size={17} />
          </button>
          <button className="jf-control" aria-label="Anterior" onClick={() => void player.previous()}>
            <SkipBack size={19} weight="fill" />
          </button>
          <button className="jf-control jf-control--play" aria-label="Reproducir" onClick={handlePlayPause} disabled={!song} data-testid="play-btn">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={player.isPlaying ? 'pause' : 'play'}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
              >
                {player.isPlaying ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" />}
              </motion.span>
            </AnimatePresence>
          </button>
          <button className="jf-control" aria-label="Siguiente" onClick={() => void player.next()}>
            <SkipForward size={19} weight="fill" />
          </button>
          <button
            className={`jf-control ${player.repeatMode !== 'off' ? 'is-active' : ''} ${player.repeatMode === 'all' ? 'is-repeat-all' : ''} ${player.repeatMode === 'one' ? 'is-repeat-one' : ''}`}
            aria-label={
              player.repeatMode === 'all'
                ? 'Repetir toda la colección'
                : player.repeatMode === 'one'
                  ? 'Repetir esta canción'
                  : 'Repetición desactivada'
            }
            title={
              player.repeatMode === 'all'
                ? 'Repitiendo toda la colección (Clic para una canción)'
                : player.repeatMode === 'one'
                  ? 'Repitiendo esta canción (Clic para desactivar)'
                  : 'Activar repetición (Clic para repetir colección)'
            }
            onClick={() => {
              const next = player.cycleRepeatMode();
              const msg =
                next === 'all'
                  ? (settings.language === 'en' ? 'Loop entire collection' : 'Repetir toda la colección')
                  : next === 'one'
                    ? (settings.language === 'en' ? 'Loop current song' : 'Repetir esta canción')
                    : (settings.language === 'en' ? 'Repeat off' : 'Repetición desactivada');
              useToastStore.getState().show(msg, 'info', 1200);
            }}
          >
            {player.repeatMode === 'one' ? (
              <RepeatOnce size={18} weight="bold" />
            ) : (
              <Repeat size={17} weight={player.repeatMode === 'all' ? 'bold' : 'regular'} />
            )}
          </button>
        </div>
      </div>

      <div className="jf-player-right">
        {!settings.disableVisualizer && <Visualizer />}
        <button className="jf-control" aria-label={player.muted ? 'Activar sonido' : 'Silenciar'} onClick={() => player.setMuted(!player.muted)}>
          {player.muted || player.volume === 0 ? <SpeakerSimpleX size={18} /> : <SpeakerHigh size={18} />}
        </button>
        <Slider
          className="jf-volume"
          min={0}
          max={1}
          step={0.01}
          value={player.volume}
          onChange={(e) => player.setVolume(Number(e.target.value))}
          aria-label="Volumen"
          data-testid="volume-slider"
        />
        <button
          className="jf-control jf-theme-toggle"
          aria-label="Cambiar tema"
          onClick={() => settings.toggleTheme()}
        >
          {settings.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button
          className={`jf-control jf-lyrics-toggle ${ui.mainView === 'lyrics' ? 'is-active' : ''}`}
          aria-label={ui.mainView === 'lyrics' ? 'Volver a pantalla de inicio (T)' : 'Ver letras sincronizadas (T)'}
          title={ui.mainView === 'lyrics' ? 'Volver a Pantalla de Inicio (T)' : 'Ver Letras Sincronizadas y Biblioteca (T)'}
          onClick={() => ui.toggleMainView()}
        >
          <TextT size={17} weight="bold" />
        </button>
        <button className="jf-control jf-fullscreen-btn" aria-label="Pantalla completa" onClick={() => ui.open('fullscreen')} disabled={!song}>
          <ArrowsOut size={17} />
        </button>
        <button className="jf-control jf-mobile-queue" aria-label="Abrir cola" onClick={() => ui.toggle('queue')}>
          <List size={17} />
        </button>
      </div>
    </motion.footer>
  );
}
