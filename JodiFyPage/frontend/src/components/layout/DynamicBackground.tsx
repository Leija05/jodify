import { usePlayerStore } from '../../store/player.store';
import { getSongCoverCandidates } from '../../lib/utils';
import { useSettingsStore } from '../../store/settings.store';
import { AnimatePresence, motion } from 'motion/react';

export function DynamicBackground() {
  const song = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const disableDynamicBg = useSettingsStore((s) => s.disableDynamicBg);
  const analogNoise = useSettingsStore((s) => s.analogNoise);
  const ambientIntensity = useSettingsStore((s) => s.ambientIntensity ?? 85);

  const cover = song ? getSongCoverCandidates(song as unknown as Record<string, unknown>)[0] ?? null : null;

  if (disableDynamicBg) {
    return (
      <div className="jf-dynamic-bg is-minimal" aria-hidden="true">
        {analogNoise && <div className="jf-ambient-noise" />}
      </div>
    );
  }

  return (
    <div className={`jf-dynamic-bg ${isPlaying ? 'is-playing' : ''}`} aria-hidden="true">
      <AnimatePresence mode="popLayout">
        {cover && (
          <motion.img
            key={cover}
            src={cover}
            alt=""
            className="jf-dynamic-bg-img"
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1.18 }}
            exit={{ opacity: 0, scale: 1.15 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </AnimatePresence>

      <div className="jf-aurora-orbs" style={{ opacity: (ambientIntensity / 100) * 0.95 }}>
        <div className="jf-aurora-orb jf-aurora-orb-1" />
        <div className="jf-aurora-orb jf-aurora-orb-2" />
        <div className="jf-aurora-orb jf-aurora-orb-3" />
      </div>

      <div className="jf-dynamic-bg-vignette" />
      {analogNoise && <div className="jf-ambient-noise" />}
    </div>
  );
}
