import { describe, expect, it } from 'vitest';
import { formatTime, formatDuration, clamp, sanitizeFileName, initialOf, timeAgo, getSongCoverCandidates } from '../lib/utils';

describe('formatTime', () => {
  it('formatea segundos básicos', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(3600 + 125)).toBe('62:05');
  });

  it('redondea hacia abajo', () => {
    expect(formatTime(89.9)).toBe('1:29');
  });

  it('maneja valores nulos e inválidos', () => {
    expect(formatTime(null)).toBe('0:00');
    expect(formatTime(undefined)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(-3)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
  });
});

describe('formatDuration', () => {
  it('incluye horas cuando hay más de 60 minutos', () => {
    expect(formatDuration(3600 + 125)).toBe('1:02:05');
    expect(formatDuration(125)).toBe('2:05');
  });
});

describe('clamp', () => {
  it('limita entre mínimo y máximo', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('sanitizeFileName', () => {
  it('limpia caracteres peligrosos y espacios', () => {
    expect(sanitizeFileName('mi canción 🎵 2024')).toBe('mi_cancin_2024');
    expect(sanitizeFileName('a/b\\c')).toBe('abc');
    expect(sanitizeFileName('x'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe('initialOf', () => {
  it('toma la primera letra en mayúscula', () => {
    expect(initialOf('ana')).toBe('A');
    expect(initialOf('  zoe ')).toBe('Z');
    expect(initialOf(null)).toBe('?');
    expect(initialOf('')).toBe('?');
  });
});

describe('timeAgo', () => {
  it('devuelve texto relativo en español', () => {
    expect(timeAgo(new Date().toISOString())).toBe('ahora');
    expect(timeAgo(new Date(Date.now() - 5 * 60000).toISOString())).toBe('hace 5 min');
    expect(timeAgo(new Date(Date.now() - 3 * 3600000).toISOString())).toBe('hace 3 h');
    expect(timeAgo(new Date(Date.now() - 3 * 86400000).toISOString())).toBe('hace 3 d');
  });
});

describe('getSongCoverCandidates', () => {
  it('devuelve solo valores string no vacíos en orden de prioridad', () => {
    expect(
      getSongCoverCandidates({ cover_url: 'a.jpg', coverUrl: 'b.jpg', cover: '', image_url: null, picture: undefined }),
    ).toEqual(['a.jpg', 'b.jpg']);
  });
});
