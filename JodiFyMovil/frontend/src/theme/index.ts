import { Platform } from 'react-native';

/**
 * "Neon Obsidian" — sistema de diseño de JodiFy Mobile.
 * Obsidiana profunda + neón (violeta/cian/rosa) con tipografía Outfit + Manrope.
 */

export const colors = {
  background: '#050507',
  backgroundSoft: '#08080c',
  surface: 'rgba(16,16,22,0.78)',
  surfaceSolid: '#0d0d13',
  surfaceElevated: '#15151d',
  surfaceDeep: 'rgba(8,8,12,0.92)',
  surfaceAlt: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.16)',
  track: 'rgba(255,255,255,0.12)',
  primary: '#7f00ff',
  primarySoft: 'rgba(127,0,255,0.14)',
  primaryBorder: 'rgba(127,0,255,0.4)',
  secondary: '#00f0ff',
  secondarySoft: 'rgba(0,240,255,0.12)',
  accent: '#ff0080',
  success: '#00ff88',
  warning: '#ffb800',
  error: '#ff3366',
  text: '#f4f4f6',
  textMuted: 'rgba(244,244,246,0.55)',
  textDim: 'rgba(244,244,246,0.32)',
  white: '#ffffff',
  black: '#000000',
} as const;

export const gradients = {
  primary: ['#7f00ff', '#00f0ff'] as const,
  accent: ['#ff0080', '#7f00ff'] as const,
  full: ['#7f00ff', '#00f0ff', '#ff0080'] as const,
  play: ['#7f00ff', '#c100ff'] as const,
  hero: ['rgba(20,2,38,0.55)', 'rgba(5,5,7,0.96)'] as const,
  surface: ['rgba(127,0,255,0.30)', 'rgba(0,240,255,0.18)', 'rgba(255,0,128,0.16)'] as const,
} as const;

export const fonts = {
  display: 'Outfit_900Black',
  title: 'Outfit_700Bold',
  titleMedium: 'Outfit_600SemiBold',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 9999,
} as const;

export const glow = {
  primary: 'rgba(127, 0, 255, 0.45)',
  secondary: 'rgba(0, 240, 255, 0.30)',
  accent: 'rgba(255, 0, 128, 0.40)',
} as const;

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  glow: {
    shadowColor: '#7f00ff',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
} as const;

/** Insets por plataforma (sin dependencias extra): parte inferior del notch/home indicator. */
export const safeArea = {
  bottom: Platform.OS === 'ios' ? 34 : 16,
  top: Platform.OS === 'ios' ? 54 : 44,
} as const;