import { describe, it, expect } from 'vitest';
import { extractMobileUpdateHighlights } from '../utils/updateNotesParser';

describe('updateNotesParser (Mobile)', () => {
  it('retorna características específicas de JodiFy Móvil si las notas son genéricas', () => {
    const res = extractMobileUpdateHighlights('Mejoras generales y correcciones de errores.', '1.0.3');
    expect(res.title).toBe('Novedades de la Versión v1.0.3');
    expect(res.items.length).toBe(3);
    expect(res.items[0].title).toBe('Reproducción Continua en Pantalla Bloqueada');
  });

  it('filtra commits y separa título y descripción para móvil', () => {
    const rawNotes = `
      Merge branch 'develop'
      feat: Modo Hifi Bass - Potenciador de bajos optimizado para auriculares
      fix: Arreglado fallo al descargar carátulas en offline
      chore: cleanup assets
    `;

    const res = extractMobileUpdateHighlights(rawNotes, '1.1.0');
    expect(res.totalCount).toBe(2);

    const titles = res.allItems.map((i) => i.title);
    expect(titles.some((t) => t.includes('Modo Hifi Bass'))).toBe(true);
    expect(titles.some((t) => t.includes('Arreglado fallo'))).toBe(true);
  });

  it('prioriza audio y novedades sobre correcciones', () => {
    const rawNotes = `
      * fix: Bug de pausa aleatoria
      * audio: Soporte para Surround 3D espacial
      * feat: Nuevos gestos táctiles
    `;

    const res = extractMobileUpdateHighlights(rawNotes);
    expect(res.allItems[0].category).toBe('feature');
    expect(res.allItems[1].category).toBe('audio');
    expect(res.allItems[2].category).toBe('fix');
  });
});
