import type { Song } from './types';

export interface SongPalette {
  primary: string;
  secondary: string;
  accent: string;
  ambientDark: string;
}

// Curated high-fidelity harmonic palettes inspired by Apple Music's vibrant gradient mesh
const CURATED_PALETTES: SongPalette[] = [
  {
    primary: '#7F00FF', // Electric Violet
    secondary: '#00E5FF', // Cyan
    accent: '#FF007A', // Neon Rose
    ambientDark: '#0A0614',
  },
  {
    primary: '#FF2D55', // Apple Crimson
    secondary: '#5856D6', // Deep Indigo
    accent: '#FF9500', // Sun Amber
    ambientDark: '#120408',
  },
  {
    primary: '#007AFF', // Cobalt Blue
    secondary: '#00F0FF', // Aqua Laser
    accent: '#5E5CE6', // Royal Purple
    ambientDark: '#030814',
  },
  {
    primary: '#FF375F', // Strawberry Neon
    secondary: '#BF5AF2', // Orchid Purple
    accent: '#FFD60A', // Cyber Yellow
    ambientDark: '#14040A',
  },
  {
    primary: '#30D158', // Emerald Green
    secondary: '#00C7BE', // Teal Aurora
    accent: '#64D2FF', // Ice Blue
    ambientDark: '#03100B',
  },
  {
    primary: '#AF52DE', // Lavender Violet
    secondary: '#FF2D55', // Vivid Coral
    accent: '#5E5CE6', // Electric Night
    ambientDark: '#0D0518',
  },
  {
    primary: '#FF9F0A', // Solar Tangerine
    secondary: '#FF375F', // Rose Quartz
    accent: '#BF5AF2', // Ultra Violet
    ambientDark: '#140804',
  },
  {
    primary: '#0A84FF', // Marine Blue
    secondary: '#32D74B', // Mint Green
    accent: '#00E5FF', // Pure Cyan
    ambientDark: '#020C14',
  },
];

/**
 * Genera una paleta de color armónica y consistente para cada canción.
 * Si la canción no tiene metadatos de color, genera un hash determinista basado en su ID y nombre.
 */
export function getSongPalette(song: Song | null | undefined): SongPalette {
  const defaultPalette = CURATED_PALETTES[0] as SongPalette;
  if (!song) {
    return defaultPalette;
  }

  const seed = String(song.id ?? song.name ?? '');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % CURATED_PALETTES.length;
  return (CURATED_PALETTES[index] as SongPalette) ?? defaultPalette;
}
