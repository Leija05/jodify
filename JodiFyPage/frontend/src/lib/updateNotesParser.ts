/**
 * updateNotesParser.ts - Extractor y formateador inteligente de novedades de actualización.
 * Limpia ruido técnico (commits, chores, hashes) y extrae únicamente las características
 * importantes categorizadas como Novedad, Rendimiento, Corrección o Sistema.
 */

export type HighlightCategory = 'feature' | 'performance' | 'fix' | 'system';

export interface UpdateHighlightItem {
  id: string;
  category: HighlightCategory;
  title: string;
  description: string;
  tag: string;
  badgeTone: 'cyan' | 'purple' | 'green' | 'amber';
}

export interface ParsedUpdateHighlights {
  title: string;
  highlights: UpdateHighlightItem[];
  allHighlights: UpdateHighlightItem[];
  hasMore: boolean;
  totalCount: number;
}

// Características predeterminadas de JodiFy Desktop cuando las notas son genéricas o breves
const DEFAULT_DESKTOP_HIGHLIGHTS: UpdateHighlightItem[] = [
  {
    id: 'desk-feat-bg',
    category: 'feature',
    title: 'Audio en 2do Plano Continuo',
    description: 'Reproducción nativa ininterrumpida sin cortes al minimizar la ventana o cambiar de aplicación.',
    tag: 'NOVEDAD',
    badgeTone: 'cyan',
  },
  {
    id: 'desk-feat-fx',
    category: 'feature',
    title: 'DJ Scratching & Audio FX Lab',
    description: 'Filtro vinilo Lo-Fi, audio 8D envolvente, sub-bass 320k y scratch táctil con atajos de teclado.',
    tag: 'NOVEDAD',
    badgeTone: 'purple',
  },
  {
    id: 'desk-perf-engine',
    category: 'performance',
    title: 'Motor yt-dlp & Caché Local Ultra Rápido',
    description: 'Streaming de alta fidelidad sin latencia y menor tiempo de respuesta al saltar entre pistas.',
    tag: 'RENDIMIENTO',
    badgeTone: 'amber',
  },
  {
    id: 'desk-fix-cola',
    category: 'fix',
    title: 'Cola Interactiva & Atajos Globales',
    description: 'Reorganización fluida de la cola por arrastre y control multimedia desde la barra de tareas.',
    tag: 'ESTABILIDAD',
    badgeTone: 'green',
  },
];

// Palabras clave para categorización inteligente
const FEATURE_REGEX = /\b(feat|feature|nuevo|nueva|añadid|agregad|soporte|interfaz|pantalla|modo|dj|scratch|audio fx|ecualizador|visualizador|lyric|letra|jam|karaoke)\b/i;
const PERF_REGEX = /\b(perf|performance|rendimiento|velocidad|optimiz|fluidez|memoria|consumo|carga|latencia|320k|hifi|audio engine|yt-dlp|cach[eé])\b/i;
const FIX_REGEX = /\b(fix|correcci[oó]n|corregid|repar|solucion|bug|crash|error|fallo|bloqueo|cierre|soluci[oó]n)\b/i;
const SYSTEM_REGEX = /\b(sec|seguridad|auth|token|permiso|sesi[oó]n|offline|red|protocolo|electron)\b/i;

// Expresiones para descartar ruido técnico no relevante para el usuario
const NOISE_REGEX = /^(merge\s+(pull\s+request|branch)|bump\s+version|chore(\(.*\))?:|ci(\(.*\))?:|build(\(.*\))?:|docs(\(.*\))?:|test(\(.*\))?:|style(\(.*\))?:|refactor(\(internal\))?:|version\s+\d+|release\s+v?\d+)/i;

/**
 * Limpia y normaliza una línea de release notes
 */
function cleanLine(rawLine: string): string {
  let cleaned = rawLine
    .replace(/^(\s*[-*•#>]+\s*)+/, '') // viñetas y markdown headers
    .replace(/\s*\(#[0-9]+\)/g, '') // PR numbers como (#123)
    .replace(/\b[0-9a-f]{7,40}\b/gi, '') // commit hashes
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links markdown
    .replace(/`([^`]+)`/g, '$1') // code backticks
    .trim();

  // Si tiene prefijo como "feat:", "fix:", "perf:" o "feat(scope):", lo extraemos limpiamente
  const prefixMatch = cleaned.match(/^(feat|fix|perf|chore|sec|audio)(\([^)]*\))?:\s*(.+)$/i);
  if (prefixMatch && prefixMatch[3]) {
    cleaned = prefixMatch[3].trim();
  }

  return cleaned;
}

/**
 * Detecta la categoría de una línea
 */
function detectCategory(text: string): { category: HighlightCategory; tag: string; badgeTone: 'cyan' | 'purple' | 'green' | 'amber' } {
  if (PERF_REGEX.test(text)) {
    return { category: 'performance', tag: 'RENDIMIENTO', badgeTone: 'amber' };
  }
  if (FIX_REGEX.test(text)) {
    return { category: 'fix', tag: 'CORRECCIÓN', badgeTone: 'green' };
  }
  if (SYSTEM_REGEX.test(text)) {
    return { category: 'system', tag: 'SISTEMA', badgeTone: 'purple' };
  }
  if (FEATURE_REGEX.test(text)) {
    return { category: 'feature', tag: 'NOVEDAD', badgeTone: 'cyan' };
  }
  return { category: 'feature', tag: 'MEJORA', badgeTone: 'cyan' };
}

/**
 * Separa una línea en título y descripción concisa
 */
function splitTitleAndDesc(cleanText: string): { title: string; description: string } {
  // Caso 1: Tiene guión o separador explícito, ej: "DJ Mixer - Añadido soporte táctil..."
  const dashMatch = cleanText.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dashMatch && dashMatch[1] && dashMatch[2] && dashMatch[1].length < 50) {
    return {
      title: dashMatch[1].trim(),
      description: dashMatch[2].charAt(0).toUpperCase() + dashMatch[2].slice(1).trim(),
    };
  }

  // Caso 2: Tiene dos puntos internos, ej: "Modo Fiesta: Sincronización en vivo"
  const colonIdx = cleanText.indexOf(':');
  if (colonIdx > 0 && colonIdx < 40) {
    const rawPrefix = cleanText.slice(0, colonIdx).trim();
    const rawRest = cleanText.slice(colonIdx + 1).trim();
    if (rawRest.length > 5) {
      return {
        title: rawPrefix,
        description: rawRest.charAt(0).toUpperCase() + rawRest.slice(1),
      };
    }
  }

  // Caso 3: Frase simple corta
  if (cleanText.length <= 42) {
    return {
      title: cleanText,
      description: 'Optimizaciones clave integradas en esta versión para mayor estabilidad y confort.',
    };
  }

  // Caso 4: Dividir por primera coma, punto o conector clave
  const breakMatch = cleanText.match(/^(.{15,45}?)[,;.]\s*(.+)$/);
  if (breakMatch && breakMatch[1] && breakMatch[2]) {
    return {
      title: breakMatch[1].trim(),
      description: breakMatch[2].charAt(0).toUpperCase() + breakMatch[2].slice(1).trim(),
    };
  }

  // Corte seguro por 4 o 5 palabras para un título limpio
  const words = cleanText.split(' ');
  const titleWords = words.slice(0, 4).join(' ');
  const descWords = words.slice(4).join(' ');

  return {
    title: titleWords,
    description: (descWords.charAt(0).toUpperCase() + descWords.slice(1)) || 'Mejora de experiencia de usuario en JodiFy.',
  };
}

/**
 * Extrae y estructura automáticamente las novedades de la actualización para Desktop
 */
export function extractDesktopUpdateHighlights(rawNotes?: string | null, latestVersion?: string): ParsedUpdateHighlights {
  const versionTitle = latestVersion ? `Novedades de la versión v${latestVersion}` : 'Novedades de la actualización';

  const isGeneric = !rawNotes || !rawNotes.trim() || /^mejoras\s+generales/i.test(rawNotes.trim());
  if (isGeneric) {
    return {
      title: versionTitle,
      highlights: DEFAULT_DESKTOP_HIGHLIGHTS.slice(0, 3),
      allHighlights: DEFAULT_DESKTOP_HIGHLIGHTS,
      hasMore: DEFAULT_DESKTOP_HIGHLIGHTS.length > 3,
      totalCount: DEFAULT_DESKTOP_HIGHLIGHTS.length,
    };
  }

  const lines = rawNotes
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const parsedItems: UpdateHighlightItem[] = [];
  const seenTitles = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Descartar ruido de control de versiones o encabezados genéricos
    if (NOISE_REGEX.test(rawLine)) continue;
    if (/^(changes|changelog|novedades|notas\s+de\s+la\s+versi[oó]n|release\s+notes)$/i.test(rawLine)) continue;

    const cleaned = cleanLine(rawLine);
    if (cleaned.length < 5) continue;

    // Descartar frases genéricas repetitivas
    if (/^mejoras\s+generales\s+y\s+correcciones/i.test(cleaned) && lines.length > 2) continue;

    const { category, tag, badgeTone } = detectCategory(rawLine);
    const { title, description } = splitTitleAndDesc(cleaned);

    const titleKey = title.toLowerCase();
    if (seenTitles.has(titleKey)) continue;
    seenTitles.add(titleKey);

    parsedItems.push({
      id: `highlight-${i}-${Date.now()}`,
      category,
      title,
      description,
      tag,
      badgeTone,
    });
  }

  // Si después de limpiar no quedó nada relevante (o solo una línea genérica), usar los defaults enriquecidos
  if (parsedItems.length === 0) {
    return {
      title: versionTitle,
      highlights: DEFAULT_DESKTOP_HIGHLIGHTS.slice(0, 3),
      allHighlights: DEFAULT_DESKTOP_HIGHLIGHTS,
      hasMore: DEFAULT_DESKTOP_HIGHLIGHTS.length > 3,
      totalCount: DEFAULT_DESKTOP_HIGHLIGHTS.length,
    };
  }

  // Priorizar: Novedades primero, luego Rendimiento, luego Correcciones
  parsedItems.sort((a, b) => {
    const order: Record<HighlightCategory, number> = {
      feature: 1,
      performance: 2,
      fix: 3,
      system: 4,
    };
    return order[a.category] - order[b.category];
  });

  return {
    title: versionTitle,
    highlights: parsedItems.slice(0, 3), // Las 3 principales más importantes
    allHighlights: parsedItems,
    hasMore: parsedItems.length > 3,
    totalCount: parsedItems.length,
  };
}
