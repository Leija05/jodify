import { initialOf } from '../../lib/utils';
import type { Presence } from '../../lib/types';

interface AvatarProps {
  username?: string | null;
  src?: string | null;
  size?: number;
  presence?: Presence;
  onClick?: () => void;
}

export function Avatar({ username, src, size = 40, presence, onClick }: AvatarProps) {
  return (
    <div
      className={`jf-avatar ${presence ? `jf-avatar--${presence}` : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      onClick={onClick}
      aria-label={username ?? 'avatar'}
      title={username ?? undefined}
    >
      {src ? <img src={src} alt="" loading="lazy" /> : <span>{initialOf(username)}</span>}
      {presence && <span className={`jf-presence-dot jf-presence-dot--${presence}`} aria-hidden="true" />}
    </div>
  );
}
