import { useEffect, useState } from 'react';
import type { Song } from './types';
import { getSongCoverCandidates, resolveMediaUrl } from './utils';

export interface ExtractedGradient {
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
  glowColor: string;
  cardStyle: React.CSSProperties;
}

const gradientCache = new Map<string, ExtractedGradient>();

function hashStringToHsl(str: string, offset = 0): { r: number; g: number; b: number; hex: string } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs((hash + offset) % 360);
  const s = 78;
  const l = 48;
  return hslToRgb(h / 360, s / 100, l / 100);
}

function hslToRgb(h: number, s: number, l: number) {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const ri = Math.round(r * 255);
  const gi = Math.round(g * 255);
  const bi = Math.round(b * 255);
  const hex = `#${((1 << 24) + (ri << 16) + (gi << 8) + bi).toString(16).slice(1)}`;
  return { r: ri, g: gi, b: bi, hex };
}

function buildGradientResult(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
): ExtractedGradient {
  const primaryRgba = `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.52)`;
  const secondaryRgba = `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.28)`;
  const glow = `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.4)`;
  const border = `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.5)`;

  const gradient = `linear-gradient(135deg, ${primaryRgba} 0%, ${secondaryRgba} 52%, rgba(10, 12, 22, 0.94) 100%)`;

  return {
    primary: `rgb(${c1.r}, ${c1.g}, ${c1.b})`,
    secondary: `rgb(${c2.r}, ${c2.g}, ${c2.b})`,
    accent: `rgb(${c1.r}, ${c1.g}, ${c1.b})`,
    gradient,
    glowColor: glow,
    cardStyle: {
      background: gradient,
      borderColor: border,
      boxShadow: `0 14px 38px -8px ${glow}, inset 0 1px 0 0 rgba(255, 255, 255, 0.16)`,
    },
  };
}

function getFallbackGradient(keyText: string): ExtractedGradient {
  const c1 = hashStringToHsl(keyText, 0);
  const c2 = hashStringToHsl(keyText, 65);
  return buildGradientResult(c1, c2);
}

export function extractGradientFromImageUrl(url: string | null | undefined, fallbackKey = 'song'): Promise<ExtractedGradient> {
  const key = url || fallbackKey;
  if (gradientCache.has(key)) {
    return Promise.resolve(gradientCache.get(key)!);
  }

  if (!url) {
    const res = getFallbackGradient(fallbackKey);
    gradientCache.set(key, res);
    return Promise.resolve(res);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;

    const fallback = () => {
      const res = getFallbackGradient(fallbackKey);
      gradientCache.set(key, res);
      resolve(res);
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) return fallback();

        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;

        let bestScore = -1;
        let c1 = { r: 59, g: 130, b: 246 };
        let c2 = { r: 147, g: 51, b: 234 };

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          // Saturation indicator
          if (max > 40 && min < 220 && delta > bestScore) {
            bestScore = delta;
            c1 = { r, g, b };
          }
        }

        // Secondary color from contrasting corner
        const r2 = data[4];
        const g2 = data[5];
        const b2 = data[6];
        if (r2 !== undefined && (r2 !== c1.r || g2 !== c1.g)) {
          c2 = { r: r2, g: g2, b: b2 };
        } else {
          c2 = { r: Math.min(255, c1.r + 40), g: Math.max(0, c1.g - 30), b: Math.min(255, c1.b + 60) };
        }

        const result = buildGradientResult(c1, c2);
        gradientCache.set(key, result);
        resolve(result);
      } catch {
        fallback();
      }
    };

    img.onerror = () => fallback();
  });
}

export function useSongCoverGradient(song: Song | null | undefined): ExtractedGradient {
  const rawCover = song ? getSongCoverCandidates(song as unknown as Record<string, unknown>)[0] : null;
  const coverUrl = rawCover ? resolveMediaUrl(rawCover) : null;
  const fallbackKey = song ? `${song.name}_${song.id}` : 'jodify_anthem';

  const [gradient, setGradient] = useState<ExtractedGradient>(() => {
    return gradientCache.get(coverUrl || fallbackKey) || getFallbackGradient(fallbackKey);
  });

  useEffect(() => {
    let active = true;
    extractGradientFromImageUrl(coverUrl, fallbackKey).then((res) => {
      if (active) setGradient(res);
    });
    return () => {
      active = false;
    };
  }, [coverUrl, fallbackKey]);

  return gradient;
}
