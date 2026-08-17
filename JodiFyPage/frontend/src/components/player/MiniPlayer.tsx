import { useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Pause } from '@phosphor-icons/react';
import { usePlayerStore } from '../../store/player.store';
import { useSettingsStore } from '../../store/settings.store';
import { useSession } from '../../context/SessionContext';
import { useHeartbeat } from '../../hooks/useHeartbeat';
import { useOffline } from '../../hooks/useOffline';
import { useVisualizer } from '../../hooks/useVisualizer';
import { ensurePlaying, pausePlayback } from '../../services/player.service';
import { getSongCoverCandidates, songArtistMeta } from '../../lib/utils';
import { SongCover } from '../ui/SongCover';

export function MiniPlayer() {
  const song = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  if (!song) return null;

  return (
    <motion.div
      className="jf-mini-player"
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => {
        if (isPlaying) pausePlayback();
        else ensurePlaying();
      }}
      data-testid="mini-player"
    >
      <SongCover song={song} alt="" className="jf-mini-cover" eager />
      <div className="jf-mini-meta">
        <p className="jf-mini-title">{song.name}</p>
        <p className="jf-mini-artist">{songArtistMeta(song) || song.added_by || 'JodiFy'}</p>
      </div>
      <button className="jf-mini-play" aria-label="Reproducir">
        {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
      </button>
    </motion.div>
  );
}

export function BreathingBackground() {
  const song = usePlayerStore((s) => s.currentSong);
  const disableDynamicBg = useSettingsStore((s) => s.disableDynamicBg);
  const cover = song ? getSongCoverCandidates(song as unknown as Record<string, unknown>)[0] ?? null : null;
  if (disableDynamicBg || !cover) return null;
  return (
    <div className="jf-dynamic-bg" aria-hidden="true">
      <img src={cover} alt="" />
      <div className="jf-dynamic-vignette" />
    </div>
  );
}

export function HomeVisualizer({ width = 240, height = 60 }: { width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useVisualizer(canvasRef);
  return <canvas ref={canvasRef} className="jf-hero-visualizer" style={{ width, height }} aria-hidden="true" />;
}

export function useSessionSessionSync(): void {
  const { session } = useSession();
  useHeartbeat(Boolean(session));
  const { isOffline } = useOffline();
  void isOffline;
}
