export type StartupSplashStyle =
  | 'cyber_neon'
  | 'vinyl_groove'
  | 'aurora_cosmic'
  | 'sonic_shockwave'
  | 'studio_minimal';

export interface StartupSplashStyleDef {
  id: StartupSplashStyle;
  name: string;
  badge: string;
  desc: string;
  accent: string;
  secondary: string;
  tagline: string;
}

export const STARTUP_SPLASH_STYLES: StartupSplashStyleDef[] = [
  {
    id: 'cyber_neon',
    name: 'Cyber Neon Hi-Tech',
    badge: 'Original',
    desc: 'Láseres neón, cuadrícula holográfica, ondas sónicas dobles y barras reactivas de audio.',
    accent: '#00f0ff',
    secondary: '#a855f7',
    tagline: 'STUDIO AUDIO WORKSTATION',
  },
  {
    id: 'vinyl_groove',
    name: 'Vinilo Hi-Fi 3D',
    badge: 'Audiófilo',
    desc: 'Giro cinemático en perspectiva 3D sobre vinilo dorado con ondas concéntricas y calidez analógica.',
    accent: '#ffd700',
    secondary: '#ff007f',
    tagline: 'HI-FI VINYL EDITION • 33⅓ RPM',
  },
  {
    id: 'aurora_cosmic',
    name: 'Nebulosa & Aurora',
    badge: 'Cósmico',
    desc: 'Polvo estelar, auroras boreales esmeralda fluidas y destello supernova que ilumina la mascota.',
    accent: '#00ff88',
    secondary: '#00e5ff',
    tagline: 'CELESTIAL AUDIO ENGINE',
  },
  {
    id: 'sonic_shockwave',
    name: 'Impacto Sub-Bass',
    badge: 'Bass Overdrive',
    desc: 'Golpe masivo de frecuencias sub-graves con distorsión cromática RGB y ondas de choque expansivas.',
    accent: '#ff0055',
    secondary: '#7928ca',
    tagline: 'SUB-BASS MASTERING SUITE',
  },
  {
    id: 'studio_minimal',
    name: 'Estudio Suizo 64-bit',
    badge: 'Minimal Studio',
    desc: 'Montaje cinético geométrico de ultra precisión, marcas de calibración dB y estética de estudio.',
    accent: '#ffffff',
    secondary: '#00f0ff',
    tagline: 'PRECISION DIGITAL WORKSTATION • 64-BIT',
  },
];
