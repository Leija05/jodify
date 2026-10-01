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

export const DISCORD_GRADIENT_PRESETS = [
  { id: 'cyberpunk', name: 'Cyberpunk Neon', start: '#00f0ff', end: '#ff007f', level: 1 },
  { id: 'synth_sunset', name: 'Atardecer Synth', start: '#ff5e62', end: '#ff9966', level: 1 },
  { id: 'midnight_violet', name: 'Violeta Medianoche', start: '#6366f1', end: '#a855f7', level: 1 },
  { id: 'emerald_wave', name: 'Onda Esmeralda', start: '#0575e6', end: '#00f260', level: 2 },
  { id: 'royal_gold', name: 'Oro Real', start: '#f7971e', end: '#ffd200', level: 3 },
  { id: 'crimson_dark', name: 'Rubí Carmesí', start: '#ed213a', end: '#93291e', level: 4 },
  { id: 'electric_lime', name: 'Lima Eléctrica', start: '#11998e', end: '#38ef7d', level: 5 },
  { id: 'deep_space', name: 'Espacio Profundo', start: '#0f0c29', end: '#302b63', level: 6 },
  { id: 'supernova_fire', name: 'Fuego Supernova', start: '#ff0844', end: '#ffb199', level: 8 },
] as const;

export interface PetVariant {
  id: string;
  name: string;
  requiredLevel: number;
  previewColor: string;
  tag: string;
}

export interface PetUnlockItem {
  id: string;
  name: string;
  species: 'cat' | 'dog' | 'magikarp' | 'capybara' | 'ghost' | 'dragon';
  requiredLevel: number;
  description: string;
  emoji: string;
  variants: PetVariant[];
}

export const PET_UNLOCKS: PetUnlockItem[] = [
  {
    id: 'cat',
    name: 'Gatito Pixel Art',
    species: 'cat',
    requiredLevel: 2,
    description: 'Compañero felino que maúlla y mueve la cabecita al ritmo de tus canciones',
    emoji: '🐱',
    variants: [
      { id: 'orange', name: 'Michi Naranjoso', requiredLevel: 2, previewColor: '#f97316', tag: 'Tabby' },
      { id: 'black', name: 'Gato Negro Místico', requiredLevel: 3, previewColor: '#27272a', tag: 'Midnight' },
      { id: 'white', name: 'Copito Bicolor', requiredLevel: 4, previewColor: '#f8fafc', tag: 'Snow' },
      { id: 'siamese', name: 'Siamés Aristócrata', requiredLevel: 5, previewColor: '#d97706', tag: 'Siamese' },
      { id: 'calico', name: 'Calicó de la Suerte', requiredLevel: 7, previewColor: '#ea580c', tag: 'Lucky' },
    ],
  },
  {
    id: 'dog',
    name: 'Perrito Pixel Art',
    species: 'dog',
    requiredLevel: 2,
    description: 'Fiel perrito alegre que mueve la colita y se alegra con tus playlists favoritas',
    emoji: '🐶',
    variants: [
      { id: 'shiba', name: 'Shiba Inu Alegre', requiredLevel: 2, previewColor: '#f59e0b', tag: 'Doge' },
      { id: 'corgi', name: 'Corgi Saltarín', requiredLevel: 3, previewColor: '#d97706', tag: 'Corgi' },
      { id: 'husky', name: 'Husky Ojos Azules', requiredLevel: 5, previewColor: '#0284c7', tag: 'Husky' },
      { id: 'dalmatian', name: 'Dálmata Manchitas', requiredLevel: 6, previewColor: '#0f172a', tag: 'Spots' },
    ],
  },
  {
    id: 'magikarp',
    name: 'Magikarp Saltarín',
    species: 'magikarp',
    requiredLevel: 3,
    description: 'El legendario pececillo pixelado que da brincos acrobáticos Splash con el bajo',
    emoji: '🐟',
    variants: [
      { id: 'classic', name: 'Magikarp Carmesí', requiredLevel: 3, previewColor: '#ef4444', tag: 'Splash' },
      { id: 'golden', name: 'Magikarp Dorado Shiny ✨', requiredLevel: 9, previewColor: '#ffd700', tag: 'Shiny VIP' },
    ],
  },
  {
    id: 'capybara',
    name: 'Capibara Zen',
    species: 'capybara',
    requiredLevel: 4,
    description: 'El maestro del chill definitivo con su mandarina flotante en la cabeza',
    emoji: '🍊',
    variants: [
      { id: 'classic', name: 'Capibara Manantial', requiredLevel: 4, previewColor: '#92400e', tag: 'Chill' },
      { id: 'zen', name: 'Capibara Onsen', requiredLevel: 7, previewColor: '#b45309', tag: 'Spa' },
    ],
  },
  {
    id: 'ghost',
    name: 'Boo Fantasmita 8-Bit',
    species: 'ghost',
    requiredLevel: 6,
    description: 'Espectro sónico flotante con auriculares gamer que brilla en la oscuridad',
    emoji: '👻',
    variants: [
      { id: 'classic', name: 'Fantasmita Glitch', requiredLevel: 6, previewColor: '#38bdf8', tag: 'Retro' },
      { id: 'neon', name: 'Espectro Neón Violeta', requiredLevel: 10, previewColor: '#a855f7', tag: 'Spectre' },
    ],
  },
  {
    id: 'dragon',
    name: 'Dragoncito Chibi',
    species: 'dragon',
    requiredLevel: 10,
    description: 'Criatura mítica legendaria que escupe chispitas al compás del ecualizador',
    emoji: '🐲',
    variants: [
      { id: 'ruby', name: 'Dragón de Rubí', requiredLevel: 10, previewColor: '#f43f5e', tag: 'Flame' },
      { id: 'astral', name: 'Dragón Cósmico Celestial', requiredLevel: 15, previewColor: '#c084fc', tag: 'Cosmos' },
    ],
  },
];

export interface ProfileAnimationUnlockItem {
  id: string;
  name: string;
  requiredLevel: number;
  description: string;
  badge: string;
  accent: string;
}

export const PROFILE_ANIMATION_UNLOCKS: ProfileAnimationUnlockItem[] = [
  {
    id: 'none',
    name: 'Estándar Limpio',
    requiredLevel: 1,
    description: 'Entrada clásica suave y sutil sin efectos adicionales',
    badge: 'Básico',
    accent: '#64748b',
  },
  {
    id: 'astral-pulse',
    name: 'Pulso Cósmico Astral',
    requiredLevel: 2,
    description: 'Expansión de ondas estelares luminosas y polvo nebular al abrir el perfil',
    badge: 'JodiFy Nova',
    accent: '#38bdf8',
  },
  {
    id: 'cyber-glitch',
    name: 'Cyber Matrix Glitch',
    requiredLevel: 3,
    description: 'Barrido holográfico futurista con scanlines digitales y aberración cian/fucsia',
    badge: 'JodiFy Cyber',
    accent: '#00f0ff',
  },
  {
    id: 'synthwave-horizon',
    name: 'Atardecer Synthwave',
    requiredLevel: 5,
    description: 'Rejilla láser retro ochentera con destello de horizonte en fuga y neón',
    badge: 'JodiFy Retro',
    accent: '#ff007f',
  },
  {
    id: 'neon-equalizer',
    name: 'Ondas Espectro Neón',
    requiredLevel: 7,
    description: 'Barras de ecualizador de frecuencia hipercinética y relámpagos rítmicos',
    badge: 'JodiFy Audio',
    accent: '#10b981',
  },
  {
    id: 'sakura-drift',
    name: 'Brisa Sakura Neón',
    requiredLevel: 9,
    description: 'Pétalos bioluminiscentes cayendo suavemente con estela zen',
    badge: 'JodiFy Zen',
    accent: '#f472b6',
  },
  {
    id: 'supernova-gold',
    name: 'Supernova Real Oro VIP',
    requiredLevel: 12,
    description: 'Explosión de luz dorada, chispas resplandecientes y rayos de sol naciente',
    badge: 'JodiFy Elite',
    accent: '#ffd700',
  },
  {
    id: 'abyssal-flame',
    name: 'Fuego Abisal Violeta',
    requiredLevel: 15,
    description: 'Llamas espectrales místicas que ascienden con ascuas radiantes',
    badge: 'JodiFy Mythic',
    accent: '#a855f7',
  },
];

export function isStyleUnlocked(requiredLevel: number, userLevel: number): boolean {
  return userLevel >= requiredLevel;
}

