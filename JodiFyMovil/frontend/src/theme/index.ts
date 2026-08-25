import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * "Neon Obsidian v2" — JodiFy Mobile Design System.
 * Deep obsidian + neon violet/cyan/pink with optical typography.
 * Built for fluid interfaces, double-bezel cards, and spring physics.
 */

export const colors = {
  background: '#030305',
  backgroundElevated: '#08080C',
  surface: 'rgba(12,12,18,0.85)',
  surfaceSolid: '#0A0A10',
  surfaceDeep: '#050508',
  surfaceHover: 'rgba(255,255,255,0.04)',
  surfacePressed: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.12)',
  track: 'rgba(255,255,255,0.10)',
  borderFocus: 'rgba(127,0,255,0.5)',
  primary: '#7F00FF',
  primarySoft: 'rgba(127,0,255,0.12)',
  primaryStrong: 'rgba(127,0,255,0.45)',
  secondary: '#00E5FF',
  secondarySoft: 'rgba(0,229,255,0.12)',
  accent: '#FF007A',
  accentSoft: 'rgba(255,0,122,0.12)',
  success: '#00E676',
  successSoft: 'rgba(0,230,118,0.12)',
  warning: '#FFB300',
  warningSoft: 'rgba(255,179,0,0.12)',
  error: '#FF3D5C',
  errorSoft: 'rgba(255,61,92,0.12)',
  text: '#F5F5F7',
  textSecondary: 'rgba(245,245,247,0.72)',
  textMuted: 'rgba(245,245,247,0.48)',
  textDim: 'rgba(245,245,247,0.34)',
  textInverse: '#050507',
  glowPrimary: 'rgba(127,0,255,0.35)',
  glowSecondary: 'rgba(0,229,255,0.25)',
  glowAccent: 'rgba(255,0,122,0.3)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const gradients = {
  primary: ['#7F00FF', '#00E5FF'] as const,
  accent: ['#FF007A', '#7F00FF'] as const,
  full: ['#7F00FF', '#00E5FF', '#FF007A'] as const,
  play: ['#7F00FF', '#B800FF'] as const,
  hero: ['rgba(20,2,38,0.55)', 'rgba(5,5,7,0.96)'] as const,
  surface: ['rgba(127,0,255,0.25)', 'rgba(0,229,255,0.15)', 'rgba(255,0,122,0.12)'] as const,
  cardOuter: ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)'] as const,
} as const;

export const typography = {
  displayLarge: { fontFamily: 'Outfit_900Black', fontSize: 34, letterSpacing: -1.2, lineHeight: 40 },
  displayMedium: { fontFamily: 'Outfit_700Bold', fontSize: 28, letterSpacing: -0.8, lineHeight: 34 },
  displaySmall: { fontFamily: 'Outfit_700Bold', fontSize: 22, letterSpacing: -0.5, lineHeight: 28 },
  headlineLarge: { fontFamily: 'Outfit_700Bold', fontSize: 20, letterSpacing: -0.3, lineHeight: 26 },
  headlineMedium: { fontFamily: 'Outfit_600SemiBold', fontSize: 17, letterSpacing: -0.2, lineHeight: 22 },
  headlineSmall: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, letterSpacing: -0.1, lineHeight: 20 },
  bodyLarge: { fontFamily: 'Manrope_500Medium', fontSize: 16, letterSpacing: 0, lineHeight: 24 },
  bodyMedium: { fontFamily: 'Manrope_400Regular', fontSize: 14, letterSpacing: 0.1, lineHeight: 20 },
  bodySmall: { fontFamily: 'Manrope_400Regular', fontSize: 12, letterSpacing: 0.2, lineHeight: 16 },
  labelLarge: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, letterSpacing: 0.3, lineHeight: 18 },
  labelMedium: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, letterSpacing: 0.5, lineHeight: 14 },
  labelSmall: { fontFamily: 'Manrope_500Medium', fontSize: 10, letterSpacing: 0.8, lineHeight: 12 },
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40,
} as const;

export const radius = {
  xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 32,
  pill: 9999,
  cardOuter: 24, cardInner: 20,
  sheetOuter: 28, sheetInner: 24,
} as const;

export const touch = {
  minimum: 48,
  comfortable: 52,
  generous: 56,
  large: 64,
  iconOnly: 48,
  iconComfortable: 52,
  iconGenerous: 56,
} as const;

export const buttonSize = {
  sm: { height: 40, paddingHorizontal: 16, minWidth: 80 },
  md: { height: 48, paddingHorizontal: 20, minWidth: 96 },
  lg: { height: 56, paddingHorizontal: 24, minWidth: 112 },
  xl: { height: 64, paddingHorizontal: 32, minWidth: 140 },
  icon: { size: 48 },
  iconComfortable: { size: 52 },
  iconGenerous: { size: 56 },
} as const;

export const focus = {
  ringWidth: 2,
  ringColor: colors.borderFocus,
  ringOffset: 2,
} as const;

export const elevation = {
  level0: { shadowOpacity: 0, elevation: 0 },
  level1: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  level2: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  level3: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  level4: { shadowColor: '#7F00FF', shadowOpacity: 0.4, shadowRadius: 40, shadowOffset: { width: 0, height: 0 }, elevation: 16 },
} as const;

export const motion = {
  springDefault: { damping: 26, stiffness: 320 },
  springQuick: { damping: 30, stiffness: 500 },
  springBounce: { damping: 17, stiffness: 300 },
  springDrawer: { damping: 30, stiffness: 280 },
  duration: { instant: 0, fast: 120, normal: 200, slow: 300, slower: 450, focal: 650 },
  ease: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
    drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  reduced: { duration: { fast: 0, normal: 0, slow: 100, slower: 150, focal: 200 } },
} as const;

export const transition = {
  fast: motion.duration.fast,
  normal: motion.duration.normal,
  slow: motion.duration.slow,
} as const;

/** Suscripción React al ajuste de accesibilidad "reduce motion" del sistema. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduced(v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      if (alive) setReduced(v);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

export const glow = {
  primary: 'rgba(127, 0, 255, 0.45)',
  secondary: 'rgba(0, 229, 255, 0.30)',
  accent: 'rgba(255, 0, 122, 0.40)',
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  glowCyan: {
    shadowColor: colors.secondary,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
} as const;

export const safeArea = {
  bottom: Platform.OS === 'ios' ? 34 : 16,
  top: Platform.OS === 'ios' ? 54 : 44,
} as const;

export type ColorKey = keyof typeof colors;
export type GradientKey = keyof typeof gradients;
export type TypographyKey = keyof typeof typography;
export type SpacingKey = keyof typeof spacing;
export type RadiusKey = keyof typeof radius;
export type TouchKey = keyof typeof touch;
export type ElevationKey = keyof typeof elevation;
export type MotionKey = keyof typeof motion;
export type ButtonSizeKey = keyof typeof buttonSize;
export type FocusKey = keyof typeof focus;
export type TransitionKey = keyof typeof transition;