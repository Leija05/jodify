import { describe, it, expect } from 'vitest';
import { extractDesktopUpdateHighlights } from './updateNotesParser';

describe('updateNotesParser (Desktop)', () => {
  it('devuelve las características por defecto de Desktop si las notas están vacías', () => {
    const res = extractDesktopUpdateHighlights(null, '2.1.0');
    expect(res.title).toBe('Novedades de la versión v2.1.0');
    expect(res.highlights.length).toBeGreaterThanOrEqual(3);
    expect(res.highlights[0].title).toBe('Audio en 2do Plano Continuo');
  });

  it('filtra automáticamente ruido de commits y chores', () => {
    const rawNotes = `
      Merge pull request #42 from main
      chore(deps): bump vite to 6.3.5
      feat: Nuevo Ecualizador Paramétrico - Control total de 10 bandas con presets
      ci: update workflow
      fix: Corregido corte de audio al minimizar ventana en Windows
      perf: Optimización de Búfer - Latencia ultrabaja en streaming
    `;

    const res = extractDesktopUpdateHighlights(rawNotes, '2.2.0');
    expect(res.totalCount).toBe(3);

    const titles = res.allHighlights.map((h) => h.title);
    expect(titles).toContain('Nuevo Ecualizador Paramétrico');
    expect(titles).toContain('Corregido corte de audio');
    expect(titles).toContain('Optimización de Búfer');

    // Verifica que se descartó el ruido
    expect(titles).not.toContain('Merge pull request');
    expect(titles).not.toContain('bump vite');
  });

  it('categoriza correctamente novedades, rendimiento y correcciones', () => {
    const rawNotes = `
      * feat: Modo DJ Scratch en vivo
      * perf: Mayor velocidad de búsqueda
      * fix: Solucionado error en favoritos
    `;

    const res = extractDesktopUpdateHighlights(rawNotes);
    const featItem = res.allHighlights.find((h) => h.category === 'feature');
    const perfItem = res.allHighlights.find((h) => h.category === 'performance');
    const fixItem = res.allHighlights.find((h) => h.category === 'fix');

    expect(featItem).toBeDefined();
    expect(featItem?.tag).toBe('NOVEDAD');
    expect(perfItem).toBeDefined();
    expect(perfItem?.tag).toBe('RENDIMIENTO');
    expect(fixItem).toBeDefined();
    expect(fixItem?.tag).toBe('CORRECCIÓN');
  });
});
