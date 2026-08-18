import { AnimatePresence, motion } from 'motion/react';
import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Heart, ArrowsOut, Moon, Sun, List, SpeakerHigh, SpeakerSimpleX } from '@phosphor-icons/react';
import { usePlayerStore } from '../../store/player.store';
import { useSettingsStore } from '../../store/settings.store';
import { useUiStore } from '../../store/ui.store';
import { useLibraryStore } from '../../store/library.store';
import { Slider } from '../ui/Slider';
import { Visualizer } from './Visualizer';
import { toggleLikeCurrent } from '../../services/player-shortcuts';
import { formatTime, songArtistMeta } from '../../lib/utils';
import { SongCover } from '../ui/SongCover';
import { ensurePlaying, pausePlayback } from '../../services/player.service';

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
      <div className="jf-player-left">
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
          <p className="jf-player-artist">{songArtistMeta(song) || (song?.added_by ? `Por ${song.added_by}` : 'JodiFy Studio')}</p>
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
            min={0}
            max={player.duration || 100}
            step={0.1}
            value={Math.min(player.currentTime, player.duration || 100)}
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
          <button className={`jf-control ${player.isLoop ? 'is-active' : ''}`} aria-label="Repetir" onClick={player.toggleLoop}>
            <Repeat size={17} />
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
