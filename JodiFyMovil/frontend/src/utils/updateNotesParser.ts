/**
 * updateNotesParser.ts - Extractor y formateador inteligente de novedades para JodiFy Móvil.
 * Procesa automáticamente las notas del backend eliminando ruido y resaltando
 * las características importantes de cada actualización para la app móvil.
 */

export type MobileHighlightCategory = 'feature' | 'performance' | 'fix' | 'audio';

export interface MobileHighlightItem {
  id: string;
  category: MobileHighlightCategory;
  title: string;
  description: string;
  tag: string;
  iconName: 'sparkles' | 'flash' | 'musical-notes' | 'shield-checkmark' | 'construct';
  accentColor: string;
  bgGlow: string;
}

export interface ParsedMobileHighlights {
  title: string;
  items: MobileHighlightItem[];
  allItems: MobileHighlightItem[];
  hasMore: boolean;
  totalCount: number;
}

// Características predeterminadas específicas de JodiFy Móvil (Android / iOS)
const DEFAULT_MOBILE_HIGHLIGHTS: MobileHighlightItem[] = [
  {
    id: 'mob-feat-lockscreen',
    category: 'feature',
    title: 'Reproducción Continua en Pantalla Bloqueada',
    description: 'Controles multimedia fluidos y carátula interactiva en la pantalla de bloqueo y barra de notificaciones.',
    tag: 'NOVEDAD',
    iconName: 'sparkles',
    accentColor: '#00E5FF',
    bgGlow: 'rgba(0, 229, 255, 0.12)',
  },
  {
    id: 'mob-audio-dsp',
    category: 'audio',
    title: 'Surround 3D & Bass Boost Refinado',
    description: 'Procesamiento de audio adaptado para auriculares Bluetooth con ecualización de 10 bandas.',
    tag: 'AUDIO HQ',
    iconName: 'musical-notes',
    accentColor: '#B388FF',
    bgGlow: 'rgba(179, 136, 255, 0.14)',
  },
  {
    id: 'mob-perf-battery',
    category: 'performance',
    title: 'Modo Ahorro de Datos & Batería',
    description: 'Consumo optimizado de red y buffer adaptativo para sesiones prolongadas de música.',
    tag: 'OPTIMIZACIÓN',
    iconName: 'flash',
    accentColor: '#FFD700',
    bgGlow: 'rgba(255, 215, 0, 0.12)',
  },
  {
    id: 'mob-fix-stability',
    category: 'fix',
    title: 'Actualizador APK Seguro y Estable',
    description: 'Descargas de alta velocidad con verificación de integridad sin perder tus canciones guardadas.',
    tag: 'ESTABILIDAD',
    iconName: 'shield-checkmark',
    accentColor: '#00E676',
    bgGlow: 'rgba(0, 230, 118, 0.12)',
  },
];

const FEATURE_REGEX = /\b(feat|feature|nuevo|nueva|añadid|agregad|pantalla|bloqueo|interfaz|gesto|haptic|vibraci[oó]n|notificaci[oó]n)\b/i;
const AUDIO_REGEX = /\b(audio|dsp|sound|sonido|ecualiz|bass|surround|3d|volumen|alta fidelidad|lossless)\b/i;
const PERF_REGEX = /\b(perf|performance|velocidad|bater[ií]a|consumo|datos|buffer|fluidez|memoria|r[aá]pido)\b/i;
const FIX_REGEX = /\b(fix|correcci[oó]n|corregid|solucion|bug|crash|error|bloqueo|cierre|instalaci[oó]n|apk)\b/i;

const NOISE_REGEX = /^(merge\s+(pull\s+request|branch)|bump\s+version|chore(\(.*\))?:|ci(\(.*\))?:|build(\(.*\))?:|docs(\(.*\))?:|test(\(.*\))?:|refactor(\(internal\))?:)/i;

function cleanLine(rawLine: string): string {
  let cleaned = rawLine
    .replace(/^(\s*[-*•#>]+\s*)+/, '')
    .replace(/\s*\(#[0-9]+\)/g, '')
    .replace(/\b[0-9a-f]{7,40}\b/gi, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();

  const prefixMatch = cleaned.match(/^(feat|fix|perf|chore|sec|audio)(\([^)]*\))?:\s*(.+)$/i);
  if (prefixMatch && prefixMatch[3]) {
    cleaned = prefixMatch[3].trim();
  }

  return cleaned;
}

function detectMobileCategory(text: string): {
  category: MobileHighlightCategory;
  tag: string;
  iconName: MobileHighlightItem['iconName'];
  accentColor: string;
  bgGlow: string;
} {
  if (AUDIO_REGEX.test(text)) {
    return {
      category: 'audio',
      tag: 'AUDIO HQ',
      iconName: 'musical-notes',
      accentColor: '#B388FF',
      bgGlow: 'rgba(179, 136, 255, 0.14)',
    };
  }
  if (PERF_REGEX.test(text)) {
    return {
      category: 'performance',
      tag: 'OPTIMIZACIÓN',
      iconName: 'flash',
      accentColor: '#FFD700',
      bgGlow: 'rgba(255, 215, 0, 0.12)',
    };
  }
  if (FIX_REGEX.test(text)) {
    return {
      category: 'fix',
      tag: 'CORRECCIÓN',
      iconName: 'construct',
      accentColor: '#00E676',
      bgGlow: 'rgba(0, 230, 118, 0.12)',
    };
  }
  if (FEATURE_REGEX.test(text)) {
    return {
      category: 'feature',
      tag: 'NOVEDAD',
      iconName: 'sparkles',
      accentColor: '#00E5FF',
      bgGlow: 'rgba(0, 229, 255, 0.12)',
    };
  }
  return {
    category: 'feature',
    tag: 'MEJORA',
    iconName: 'sparkles',
    accentColor: '#00E5FF',
    bgGlow: 'rgba(0, 229, 255, 0.12)',
  };
}

function splitMobileTitleAndDesc(cleanText: string): { title: string; description: string } {
  const dashMatch = cleanText.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dashMatch && dashMatch[1] && dashMatch[2] && dashMatch[1].length < 45) {
    return {
      title: dashMatch[1].trim(),
      description: dashMatch[2].charAt(0).toUpperCase() + dashMatch[2].slice(1).trim(),
    };
  }

  const colonIdx = cleanText.indexOf(':');
  if (colonIdx > 0 && colonIdx < 35) {
    const rawPrefix = cleanText.slice(0, colonIdx).trim();
    const rawRest = cleanText.slice(colonIdx + 1).trim();
    if (rawRest.length > 5) {
      return {
        title: rawPrefix,
        description: rawRest.charAt(0).toUpperCase() + rawRest.slice(1),
      };
    }
  }

  if (cleanText.length <= 42) {
    return {
      title: cleanText,
      description: 'Mejora de rendimiento y experiencia móvil integrada en esta versión.',
    };
  }

  const breakMatch = cleanText.match(/^(.{14,40}?)[,;.]\s*(.+)$/);
  if (breakMatch && breakMatch[1] && breakMatch[2]) {
    return {
      title: breakMatch[1].trim(),
      description: breakMatch[2].charAt(0).toUpperCase() + breakMatch[2].slice(1).trim(),
    };
  }

  const words = cleanText.split(' ');
  const titleWords = words.slice(0, 4).join(' ');
  const descWords = words.slice(4).join(' ');

  return {
    title: titleWords,
    description: (descWords.charAt(0).toUpperCase() + descWords.slice(1)) || 'Optimizaciones exclusivas para la app móvil de JodiFy.',
  };
}

export function extractMobileUpdateHighlights(rawNotes?: string | null, version?: string): ParsedMobileHighlights {
  const title = version ? `Novedades de la Versión v${version}` : 'Novedades de la Actualización';

  const isGeneric = !rawNotes || !rawNotes.trim() || /^mejoras\s+generales/i.test(rawNotes.trim());
  if (isGeneric) {
    return {
      title,
      items: DEFAULT_MOBILE_HIGHLIGHTS.slice(0, 3),
      allItems: DEFAULT_MOBILE_HIGHLIGHTS,
      hasMore: DEFAULT_MOBILE_HIGHLIGHTS.length > 3,
      totalCount: DEFAULT_MOBILE_HIGHLIGHTS.length,
    };
  }

  const lines = rawNotes
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const parsedItems: MobileHighlightItem[] = [];
  const seenTitles = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    if (NOISE_REGEX.test(rawLine)) continue;
    if (/^(changes|changelog|novedades|notas\s+de\s+la\s+versi[oó]n|release\s+notes)$/i.test(rawLine)) continue;

    const { category, tag, iconName, accentColor, bgGlow } = detectMobileCategory(rawLine);
    const cleaned = cleanLine(rawLine);
    if (cleaned.length < 5) continue;
    if (/^mejoras\s+generales\s+y\s+correcciones/i.test(cleaned) && lines.length > 2) continue;

    const { title: itemTitle, description } = splitMobileTitleAndDesc(cleaned);

    const titleKey = itemTitle.toLowerCase();
    if (seenTitles.has(titleKey)) continue;
    seenTitles.add(titleKey);

    parsedItems.push({
      id: `mob-highlight-${i}-${Date.now()}`,
      category,
      title: itemTitle,
      description,
      tag,
      iconName,
      accentColor,
      bgGlow,
    });
  }

  if (parsedItems.length === 0) {
    return {
      title,
      items: DEFAULT_MOBILE_HIGHLIGHTS.slice(0, 3),
      allItems: DEFAULT_MOBILE_HIGHLIGHTS,
      hasMore: DEFAULT_MOBILE_HIGHLIGHTS.length > 3,
      totalCount: DEFAULT_MOBILE_HIGHLIGHTS.length,
    };
  }

  const priorityOrder: Record<MobileHighlightCategory, number> = {
    feature: 1,
    audio: 2,
    performance: 3,
    fix: 4,
  };
  parsedItems.sort((a, b) => priorityOrder[a.category] - priorityOrder[b.category]);

  return {
    title,
    items: parsedItems.slice(0, 3),
    allItems: parsedItems,
    hasMore: parsedItems.length > 3,
    totalCount: parsedItems.length,
  };
}
