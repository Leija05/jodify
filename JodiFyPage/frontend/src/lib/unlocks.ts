export interface StyleUnlockItem {
  id: string;
  name: string;
  requiredLevel: number;
  description: string;
  color?: string;
  gradient?: string;
  badge?: string;
}

export const AVATAR_FRAME_UNLOCKS: StyleUnlockItem[] = [
  {
    id: 'none',
    name: 'Sin Marco',
    requiredLevel: 1,
    description: 'Estilo clásico circular minimalista',
    color: '#64748b',
  },
  {
    id: 'minimal',
    name: 'Minimal Rim',
    requiredLevel: 1,
    description: 'Borde fino de precisión metálica',
    color: '#94a3b8',
  },
  {
    id: 'neon',
    name: 'Neon Pulse',
    requiredLevel: 2,
    description: 'Halo cian pulsante con energía sonora reactiva',
    color: '#00f0ff',
  },
  {
    id: 'pixel',
    name: 'Pixel Magic',
    requiredLevel: 3,
    description: 'Borde esmeralda cristalino de audio retro',
    color: '#10b981',
  },
  {
    id: 'synthwave',
    name: 'Synthwave Glow',
    requiredLevel: 5,
    description: 'Destellos violetas y magenta ochenteros',
    color: '#a855f7',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Matrix',
    requiredLevel: 7,
    description: 'Halo angular giratorio amarillo neón y fucsia',
    color: '#facc15',
  },
  {
    id: 'gold',
    name: 'Corona Oro VIP',
    requiredLevel: 10,
    description: 'Aura dorada de máxima distinción audiófila',
    color: '#ffd700',
  },
  {
    id: 'cosmic',
    name: 'Cosmic Void',
    requiredLevel: 14,
    description: 'Vórtice nebular de estrellas y constelaciones',
    color: '#38bdf8',
  },
  {
    id: 'godtier',
    name: 'Supernova God',
    requiredLevel: 20,
    description: 'Fuego estelar radiante de deidad sonora',
    color: '#f43f5e',
  },
];

export const PROFILE_THEME_UNLOCKS: StyleUnlockItem[] = [
  {
    id: 'aurora',
    name: 'Aurora Boreal',
    requiredLevel: 1,
    description: 'Mareas verdes y violetas bioluminiscentes',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.3) 0%, rgba(99,102,241,0.2) 100%)',
  },
  {
    id: 'velvet',
    name: 'Midnight Velvet',
    requiredLevel: 1,
    description: 'Negro ónix con destellos índigo profundo',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(15,23,42,0.6) 100%)',
  },
  {
    id: 'emerald',
    name: 'Esmeralda Hi-Fi',
    requiredLevel: 2,
    description: 'Brillo acústico menta y cian de alta fidelidad',
    color: '#00f0ff',
    gradient: 'linear-gradient(135deg, rgba(0,240,255,0.3) 0%, rgba(16,185,129,0.25) 100%)',
  },
  {
    id: 'crimson',
    name: 'Crimson Dark',
    requiredLevel: 4,
    description: 'Rojo rubí eléctrico y carbón ardiente',
    color: '#f43f5e',
    gradient: 'linear-gradient(135deg, rgba(244,63,94,0.35) 0%, rgba(30,10,15,0.7) 100%)',
  },
  {
    id: 'cyber',
    name: 'Cyber Neon',
    requiredLevel: 6,
    description: 'Púrpura eléctrico y cian estilo synthwave',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.35) 0%, rgba(0,240,255,0.25) 100%)',
  },
  {
    id: 'gold',
    name: 'Oro Supremo VIP',
    requiredLevel: 9,
    description: 'Champaña y oro pulido con reflejos de lujo',
    color: '#ffd700',
    gradient: 'linear-gradient(135deg, rgba(255,215,0,0.35) 0%, rgba(60,40,10,0.7) 100%)',
  },
  {
    id: 'astral',
    name: 'Nebulosa Astral',
    requiredLevel: 12,
    description: 'Polvo de estrellas y radiación cósmica violeta',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, rgba(236,72,153,0.35) 0%, rgba(124,58,237,0.3) 100%)',
  },
];

export const PROFILE_EFFECT_UNLOCKS: StyleUnlockItem[] = [
  {
    id: 'none',
    name: 'Atmósfera Serena',
    requiredLevel: 1,
    description: 'Resplandor sutil estándar con orbes dinámicos',
    color: '#64748b',
  },
  {
    id: 'stars',
    name: 'Polvo Estelar',
    requiredLevel: 3,
    description: 'Partículas cósmicas flotantes titilantes',
    color: '#38bdf8',
  },
  {
    id: 'grid',
    name: 'Cyber Grid 3D',
    requiredLevel: 5,
    description: 'Perspectiva de cuadrícula digital de synthwave',
    color: '#a855f7',
  },
  {
    id: 'aurora_waves',
    name: 'Ondas Boreales',
    requiredLevel: 8,
    description: 'Velo bioluminiscente en movimiento orgánico',
    color: '#10b981',
  },
  {
    id: 'supernova',
    name: 'Pulso Supernova',
    requiredLevel: 12,
    description: 'Expansión de rayos cósmicos y destellos de energía',
    color: '#ffd700',
  },
];

export const ACCENT_COLOR_PRESETS = [
  { name: 'Cian Neón', hex: '#00f0ff', level: 1 },
  { name: 'Esmeralda', hex: '#10b981', level: 1 },
  { name: 'Púrpura Synth', hex: '#a855f7', level: 2 },
  { name: 'Rosa Eléctrico', hex: '#f43f5e', level: 3 },
  { name: 'Oro Supremo', hex: '#ffd700', level: 5 },
  { name: 'Azul Eléctrico', hex: '#3b82f6', level: 1 },
  { name: 'Naranja Fuego', hex: '#f97316', level: 4 },
];

export const PROFILE_BADGE_PRESETS = [
  { text: 'Audiófilo Hi-Fi 🎧', level: 1 },
  { text: 'Explorador de Ritmos 🌊', level: 1 },
  { text: 'Beat Crafter Master 🎹', level: 2 },
  { text: 'Basshead Devoto 🔊', level: 3 },
  { text: 'Coleccionista de Vinilos 📀', level: 4 },
  { text: 'Caza-Joyas Sonoras 🔍', level: 5 },
  { text: 'Vibra Nocturna 🌙', level: 6 },
  { text: 'Oído Absoluto 💎', level: 8 },
  { text: 'Deidad del Ritmo 👑', level: 12 },
];

export function isStyleUnlocked(requiredLevel: number, userLevel: number): boolean {
  return userLevel >= requiredLevel;
}
