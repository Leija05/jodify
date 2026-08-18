import { getSongCoverCandidates, resolveMediaUrl } from '../../lib/utils';

interface SongCoverProps {
  song: { cover_url?: unknown; name?: unknown };
  alt?: string;
  className?: string;
  eager?: boolean;
}

export function SongCover({ song, alt = '', className = '', eager = false }: SongCoverProps) {
  const raw = getSongCoverCandidates(song as unknown as Record<string, unknown>)[0];
  const cover = resolveMediaUrl(raw) || '/assets/default-cover.png';
  return <img className={className} src={cover} alt={alt} loading={eager ? 'eager' : 'lazy'} />;
}