import type { UserAccess, CommunityUser } from './types';

export interface AvatarFrameDefinition {
  id: string;
  name: string;
  colors: [string, string, ...string[]];
  glowColor: string;
  description: string;
}

export interface ProfileThemeDefinition {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  gradient: [string, string];
  description: string;
}

export const AVATAR_FRAMES: AvatarFrameDefinition[] = [
  {
    id: 'none',
    name: 'Sin marco',
    colors: ['transparent', 'transparent'],
    glowColor: 'transparent',
    description: 'Estilo clásico circular',
  },
  {
    id: 'neon_cyan',
    name: 'Neon Pulse',
    colors: ['#00f0ff', '#7f00ff', '#00f0ff'],
    glowColor: 'rgba(0, 240, 255, 0.75)',
    description: 'Halo cian reactivo con pulsación sonora',
  },
  {
    id: 'fire_aura',
    name: 'Aura de Fuego',
    colors: ['#ff0044', '#ffaa00', '#ff0044'],
    glowColor: 'rgba(255, 100, 0, 0.8)',
    description: 'Llama ardiente de ritmo imparable',
  },
  {
    id: 'cyber_glitch',
    name: 'Cyber Glitch',
    colors: ['#ffee00', '#ff0077', '#00f0ff', '#ffee00'],
    glowColor: 'rgba(255, 0, 119, 0.75)',
    description: 'Neón dinámico de baja fidelidad',
  },
  {
    id: 'golden_crest',
    name: 'Corona Oro VIP',
    colors: ['#ffd700', '#fff4cc', '#ffaa00', '#ffd700'],
    glowColor: 'rgba(255, 215, 0, 0.8)',
    description: 'Aura dorada de distinción audiófila',
  },
  {
    id: 'rainbow_prism',
    name: 'Prisma Tornasol',
    colors: ['#ff0055', '#ff9900', '#00ffcc', '#0099ff', '#aa00ff'],
    glowColor: 'rgba(0, 240, 255, 0.75)',
    description: 'Degradado espectral tornasol',
  },
  {
    id: 'cosmic_void',
    name: 'Vórtice Cósmico',
    colors: ['#a855f7', '#3b82f6', '#ec4899', '#a855f7'],
    glowColor: 'rgba(168, 85, 247, 0.8)',
    description: 'Nebulosa interestelar violeta y cyan',
  },
  {
    id: 'matrix_emerald',
    name: 'Matrix Esmeralda',
    colors: ['#00ff66', '#008833', '#a3e635', '#00ff66'],
    glowColor: 'rgba(0, 255, 102, 0.75)',
    description: 'Código sonoro verde terminal',
  },
  {
    id: 'rgb_soundwave',
    name: 'Onda Sonora RGB',
    colors: ['#00f0ff', '#ff0077', '#7928ca', '#00f0ff'],
    glowColor: 'rgba(255, 0, 119, 0.75)',
    description: 'Onda de frecuencia de alta fidelidad',
  },
  {
    id: 'pixel',
    name: 'Pixel Magic',
    colors: ['#10b981', '#34d399', '#059669'],
    glowColor: 'rgba(16, 185, 129, 0.75)',
    description: 'Borde esmeralda cristalino de audio retro',
  },
];

export const PROFILE_THEMES: ProfileThemeDefinition[] = [
  {
    id: 'aurora',
    name: 'Aurora Boreal',
    primaryColor: '#10b981',
    secondaryColor: '#6366f1',
    gradient: ['#10b981', '#6366f1'],
    description: 'Mareas verdes y violetas bioluminiscentes',
  },
  {
    id: 'velvet',
    name: 'Midnight Velvet',
    primaryColor: '#6366f1',
    secondaryColor: '#0f172a',
    gradient: ['#6366f1', '#1e1b4b'],
    description: 'Negro ónix con destellos índigo profundo',
  },
  {
    id: 'emerald',
    name: 'Esmeralda Hi-Fi',
    primaryColor: '#00f0ff',
    secondaryColor: '#10b981',
    gradient: ['#00f0ff', '#10b981'],
    description: 'Brillo acústico menta y cian',
  },
  {
    id: 'crimson',
    name: 'Crimson Dark',
    primaryColor: '#f43f5e',
    secondaryColor: '#4c0519',
    gradient: ['#f43f5e', '#881337'],
    description: 'Rojo rubí eléctrico y carbón ardiente',
  },
  {
    id: 'cyber',
    name: 'Cyber Neon',
    primaryColor: '#a855f7',
    secondaryColor: '#00f0ff',
    gradient: ['#a855f7', '#00f0ff'],
    description: 'Púrpura eléctrico y cian estilo synthwave',
  },
  {
    id: 'gold',
    name: 'Oro Supremo VIP',
    primaryColor: '#ffd700',
    secondaryColor: '#b45309',
    gradient: ['#ffd700', '#d97706'],
    description: 'Champaña y oro pulido con reflejos de lujo',
  },
  {
    id: 'astral',
    name: 'Nebulosa Astral',
    primaryColor: '#ec4899',
    secondaryColor: '#7c3aed',
    gradient: ['#ec4899', '#7c3aed'],
    description: 'Polvo de estrellas y radiación cósmica violeta',
  },
];

export const PROFILE_BADGES = [
  'Audiófilo Hi-Fi 🎧',
  'DJ de la Comunidad 🎛️',
  'Noctámbulo Musical 🌙',
  'Coleccionista Legendario 💎',
  'Pionero JodiFy ⚡',
  'Vibes Infinitas 🌊',
  'Maestro del Vinilo 📻',
  'Cyber Beats 🤖',
] as const;

export const VIBE_PRESETS = [
  '⚡ A tope de ritmo',
  '🌙 Modo Chill & Relax',
  '💻 En la zona de código',
  '🎧 Hi-Fi Frequencies',
  '🔥 Modo Bestia / Gym',
  '🌧️ Lluvia & Nostalgia',
  '🌌 Viaje Cósmico',
  '☕ Café & Acústico',
] as const;

export const AVATAR_PRESETS = [
  {
    id: 'neon_dj',
    name: 'Cyber DJ',
    url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=280&auto=format&fit=crop&q=80',
  },
  {
    id: 'lofi_girl',
    name: 'Lo-Fi Chill',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=280&auto=format&fit=crop&q=80',
  },
  {
    id: 'synth_astronaut',
    name: 'Synth Astronaut',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=280&auto=format&fit=crop&q=80',
  },
  {
    id: 'vinyl_collector',
    name: 'Vinyl Collector',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=280&auto=format&fit=crop&q=80',
  },
  {
    id: 'daft_helm',
    name: 'Daft Helmet',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=280&auto=format&fit=crop&q=80',
  },
  {
    id: 'cyber_headphones',
    name: 'Hi-Fi Gold',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=280&auto=format&fit=crop&q=80',
  },
  {
    id: 'cosmic_night',
    name: 'Cosmic Violet',
    url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=280&auto=format&fit=crop&q=80',
  },
  {
    id: 'matrix_neon',
    name: 'Matrix Green',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=280&auto=format&fit=crop&q=80',
  },
];

export function resolveAvatarUrl(
  user?: Partial<UserAccess> | Partial<CommunityUser> | null
): string | null {
  if (!user) return null;

  // 1. Explicit avatar_url
  const rawUrl = user.avatar_url;
  if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim().length > 0) {
    const trimmed = rawUrl.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('file://')
    ) {
      return trimmed;
    }
    const apiBase = process.env.EXPO_PUBLIC_API_BASE || 'https://jodify-backend.onrender.com';
    return `${apiBase.replace(/\/$/, '')}/${trimmed.replace(/^\//, '')}`;
  }

  // 2. Discord profile avatar object
  const communityDiscord = (user as Partial<CommunityUser>)?.discord;
  if (communityDiscord?.avatar_url) {
    return communityDiscord.avatar_url;
  }

  // 3. Discord ID default fallback
  if (user.discord_id && typeof user.discord_id === 'string' && user.discord_id.trim().length > 0) {
    const rawId = user.discord_id.trim();
    const lastDigits = parseInt(rawId.slice(-4), 10) || 0;
    const index = Math.abs(lastDigits) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }

  return null;
}

export function getFrameDefinition(frameId?: string | null | undefined): AvatarFrameDefinition {
  const fallback = AVATAR_FRAMES[0]!;
  if (!frameId || frameId === 'none') {
    return fallback;
  }
  return AVATAR_FRAMES.find((f) => f.id === frameId) ?? fallback;
}

export function getThemeDefinition(themeId?: string | null | undefined): ProfileThemeDefinition {
  const fallback = PROFILE_THEMES[0]!;
  if (!themeId) return fallback;
  return PROFILE_THEMES.find((t) => t.id === themeId) ?? fallback;
}

export interface ProfileAnimationDefinition {
  id: string;
  name: string;
  badge: string;
  accent: string;
  secondary: string;
  colors: [string, string, ...string[]];
  description: string;
  icon: string;
}

export const PROFILE_ANIMATIONS: ProfileAnimationDefinition[] = [
  {
    id: 'none',
    name: 'Estándar Limpio',
    badge: 'Básico',
    accent: '#64748b',
    secondary: '#475569',
    colors: ['transparent', 'transparent'],
    description: 'Entrada clásica suave y sutil sin efectos adicionales',
    icon: 'sparkles-outline',
  },
  {
    id: 'astral-pulse',
    name: 'Pulso Cósmico Astral',
    badge: 'JodiFy Nova',
    accent: '#38bdf8',
    secondary: '#818cf8',
    colors: ['#38bdf8', '#818cf8', '#c084fc'],
    description: 'Expansión de ondas estelares luminosas y polvo nebular',
    icon: 'planet-outline',
  },
  {
    id: 'cyber-glitch',
    name: 'Cyber Matrix Glitch',
    badge: 'JodiFy Cyber',
    accent: '#00f0ff',
    secondary: '#ff007f',
    colors: ['#00f0ff', '#ff007f', '#00ff66'],
    description: 'Barrido holográfico con scanlines digitales y aberración cian',
    icon: 'hardware-chip-outline',
  },
  {
    id: 'synthwave-horizon',
    name: 'Atardecer Synthwave',
    badge: 'JodiFy Retro',
    accent: '#ff007f',
    secondary: '#7928ca',
    colors: ['#ff007f', '#7928ca', '#ffaa00'],
    description: 'Rejilla láser retro ochentera con sol de neón en el horizonte',
    icon: 'sunny-outline',
  },
  {
    id: 'neon-equalizer',
    name: 'Ondas Espectro Neón',
    badge: 'JodiFy Audio',
    accent: '#10b981',
    secondary: '#00f0ff',
    colors: ['#10b981', '#00f0ff', '#3b82f6'],
    description: 'Barras de ecualizador reactivas y destellos de frecuencia',
    icon: 'pulse-outline',
  },
  {
    id: 'sakura-drift',
    name: 'Brisa Sakura Neón',
    badge: 'JodiFy Zen',
    accent: '#f472b6',
    secondary: '#fda4af',
    colors: ['#f472b6', '#fb7185', '#fda4af'],
    description: 'Pétalos bioluminiscentes cayendo suavemente con estela zen',
    icon: 'flower-outline',
  },
  {
    id: 'supernova-gold',
    name: 'Supernova Real Oro VIP',
    badge: 'JodiFy Elite',
    accent: '#ffd700',
    secondary: '#f59e0b',
    colors: ['#ffd700', '#f59e0b', '#fffbeb'],
    description: 'Explosión de luz dorada, chispas resplandecientes y rayos de realeza',
    icon: 'trophy-outline',
  },
  {
    id: 'abyssal-flame',
    name: 'Fuego Abisal Violeta',
    badge: 'JodiFy Mythic',
    accent: '#a855f7',
    secondary: '#ec4899',
    colors: ['#a855f7', '#6366f1', '#ec4899'],
    description: 'Llamas espectrales místicas que ascienden con ascuas radiantes',
    icon: 'flame-outline',
  },
];

export function getProfileAnimationDefinition(animId?: string | null | undefined): ProfileAnimationDefinition {
  const fallback = PROFILE_ANIMATIONS[0]!;
  if (!animId || animId === 'none') {
    return fallback;
  }
  return PROFILE_ANIMATIONS.find((a) => a.id === animId) ?? fallback;
}

