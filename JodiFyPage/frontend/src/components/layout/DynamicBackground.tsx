import { usePlayerStore } from '../../store/player.store';
import { getSongCoverCandidates } from '../../lib/utils';
import { useSettingsStore } from '../../store/settings.store';

export function DynamicBackground() {
  const song = usePlayerStore((s) => s.currentSong);
  const disableDynamicBg = useSettingsStore((s) => s.disableDynamicBg);

  const cover = song ? getSongCoverCandidates(song as unknown as Record<string, unknown>)[0] ?? null : null;

  if (disableDynamicBg || !cover) return null;

  return (
    <div className="jf-dynamic-bg" aria-hidden="true">
      <img src={cover} alt="" className="jf-dynamic-bg-img" />
      <div className="jf-dynamic-bg-vignette" />
    </div>
  );
}
