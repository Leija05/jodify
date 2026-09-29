import { useState } from 'react';
import { getSongCoverCandidates, resolveMediaUrl } from '../../lib/utils';

interface SongCoverProps {
  song: { cover_url?: unknown; name?: unknown };
  alt?: string;
  className?: string;
  eager?: boolean;
}

const FALLBACK_COVER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231a1a2e'/%3E%3Cstop offset='100%25' stop-color='%2316213e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='12' fill='url(%23g)'/%3E%3Ccircle cx='60' cy='60' r='28' fill='none' stroke='%237f00ff' stroke-width='4' opacity='0.4'/%3E%3Ccircle cx='60' cy='60' r='10' fill='%2300f0ff' opacity='0.7'/%3E%3C/svg%3E";

export function SongCover({ song, alt = '', className = '', eager = false }: SongCoverProps) {
  const [hasError, setHasError] = useState(false);
  const raw = getSongCoverCandidates(song as unknown as Record<string, unknown>)[0];
  const cover = hasError || !raw ? FALLBACK_COVER : resolveMediaUrl(raw);

  return (
    <img
      className={className}
      src={cover}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setHasError(true)}
    />
  );
}