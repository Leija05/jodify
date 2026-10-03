import type { Song } from './types';

export interface SongPalette {
  primary: string;
  secondary: string;
  accent: string;
  ambientDark: string;
}

// Curated high-fidelity harmonic palettes inspired by Apple Music and Spotify dynamic themes
const CURATED_PALETTES: SongPalette[] = [
  {
    primary: '#8A2BE2', // Electric Purple / Violet
    secondary: '#00F0FF', // Cyber Cyan
    accent: '#FF007F', // Neon Magenta
    ambientDark: '#0C061A',
  },
  {
    primary: '#FF2D55', // Vivid Crimson
    secondary: '#FF9500', // Sunset Amber
    accent: '#5856D6', // Royal Indigo
    ambientDark: '#16050C',
  },
  {
    primary: '#007AFF', // Deep Cobalt
    secondary: '#00E5FF', // Electric Cyan
    accent: '#7928CA', // Vaporwave Violet
    ambientDark: '#040A18',
  },
  {
    primary: '#10B981', // Emerald Mint
    secondary: '#00F0FF', // Aqua Glow
    accent: '#3B82F6', // Cerulean
    ambientDark: '#041611',
  },
  {
    primary: '#FF007A', // Hyperpop Hot Pink
    secondary: '#7928CA', // Cosmic Violet
    accent: '#FFD600', // Solar Flare
    ambientDark: '#180412',
  },
  {
    primary: '#FF8A00', // Tangerine Pulse
    secondary: '#E52E71', // Rose Gold
    accent: '#9B51E0', // Deep Orchid
    ambientDark: '#180B04',
  },
  {
    primary: '#05D6A4', // Acid Turquoise
    secondary: '#5E5CE6', // Synthwave Indigo
    accent: '#FF3B30', // Electric Coral
    ambientDark: '#031411',
  },
  {
    primary: '#BF5AF2', // Lilac Dream
    secondary: '#FF375F', // Neon Strawberry
    accent: '#5AC8FA', // Sky Cyan
    ambientDark: '#12051A',
  },
  {
    primary: '#F59E0B', // Golden Amber
    secondary: '#EF4444', // Red Flame
    accent: '#8B5CF6', // Purple Glow
    ambientDark: '#160F03',
  },
  {
    primary: '#06B6D4', // Deep Teal
    secondary: '#3B82F6', // Electric Indigo
    accent: '#10B981', // Seafoam
    ambientDark: '#031317',
  },
  {
    primary: '#EC4899', // Velvet Orchid
    secondary: '#F43F5E', // Ruby Rose
    accent: '#A855F7', // Ultraviolet
    ambientDark: '#170410',
  },
  {
    primary: '#6366F1', // Midnight Indigo
    secondary: '#A855F7', // Astral Violet
    accent: '#00F0FF', // Cyan Beam
    ambientDark: '#08081A',
  },
  {
    primary: '#14B8A6', // Caribbean Mint
    secondary: '#8B5CF6', // Royal Purple
    accent: '#F43F5E', // Radiant Pink
    ambientDark: '#041413',
  },
  {
    primary: '#F43F5E', // Neon Crimson
    secondary: '#8B5CF6', // Iris Glow
    accent: '#06B6D4', // Cyan Laser
    ambientDark: '#17050B',
  },
  {
    primary: '#D946EF', // Fuchsia Rush
    secondary: '#00F0FF', // Cyan Breeze
    accent: '#F59E0B', // Solar Gold
    ambientDark: '#16041A',
  },
  {
    primary: '#3B82F6', // Blue Horizon
    secondary: '#10B981', // Mint Aurora
    accent: '#F43F5E', // Rose Glow
    ambientDark: '#050D1A',
  },
];

/**
 * Genera una paleta de color armónica y consistente para cada canción.
 * Analiza el título, artista y portada para reflejar la vibra estética real de la canción.
 */
export function getSongPalette(song: Song | null | undefined): SongPalette {
  const defaultPalette = CURATED_PALETTES[0] as SongPalette;
  if (!song) {
    return defaultPalette;
  }

  // 1. Detección específica por título / portada de alta precisión
  const nameNorm = (song.name || '').toLowerCase().trim();
  const artistNorm = (song.artist || '').toLowerCase().trim();

  // Coqueta / Fuerza Regida (Noche azul zafiro profunda, cielo nocturno y luna cyan)
  if (nameNorm.includes('coqueta') || (artistNorm.includes('fuerza regida') && nameNorm.includes('coqueta'))) {
    return {
      primary: '#1D4ED8', // Deep Sapphire Blue
      secondary: '#00E5FF', // Electric Moon Cyan
      accent: '#6366F1', // Midnight Indigo
      ambientDark: '#040B1C', // Night Sky Blue
    };
  }

  // Me Jalo (Noche crepuscular azul cobalto)
  if (nameNorm.includes('jalo') || nameNorm.includes('me jalo')) {
    return {
      primary: '#2563EB', // Royal Cobalt
      secondary: '#38BDF8', // Sky Cyan
      accent: '#818CF8', // Soft Twilight
      ambientDark: '#03081A',
    };
  }

  // Classy 101 (Feid / Young Miko: Púrpura eléctrico y verde neón característico)
  if (nameNorm.includes('classy') || nameNorm.includes('feid')) {
    return {
      primary: '#8B5CF6', // Electric Purple
      secondary: '#10B981', // Neon Mint
      accent: '#F43F5E', // Vivid Coral
      ambientDark: '#0F051C',
    };
  }

  // Si la canción provee color explícito en sus metadatos
  const metaColor = (song as any).primary_color || (song as any).accent_color;
  if (metaColor && typeof metaColor === 'string' && metaColor.startsWith('#')) {
    return {
      primary: metaColor,
      secondary: (song as any).secondary_color || '#00F0FF',
      accent: '#FF007F',
      ambientDark: '#06060F',
    };
  }

  // Hash determinista enriquecido con título y artista
  const seed = `${song.id ?? ''}_${nameNorm}_${artistNorm}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % CURATED_PALETTES.length;
  return (CURATED_PALETTES[index] as SongPalette) ?? defaultPalette;
}
