import { describe, expect, it } from 'vitest';
import { parseLrc, plainLines, isSynced } from './lrc';

describe('parseLrc', () => {
  it('parsea timestamps estándar [mm:ss.xx]', () => {
    const lrc = '[00:12.50]Primera línea\n[00:30]Segunda línea\n';
    const lines = parseLrc(lrc);
    expect(lines).toEqual([
      { time: 12.5, text: 'Primera línea' },
      { time: 30, text: 'Segunda línea' },
    ]);
  });

  it('ordena cronológicamente aunque lleguen desordenadas', () => {
    const lrc = '[01:00]Tercera\n[00:10]Primera\n[00:40]Segunda';
    const times = parseLrc(lrc).map((l) => l.time);
    expect(times).toEqual([10, 40, 60]);
  });

  it('ignora metadatos [ar:] y [ti:]', () => {
    const lrc = '[ar:Artista]\n[ti:Título]\n[offset:500]\n[00:05.25]Letra real';
    const lines = parseLrc(lrc);
    expect(lines).toHaveLength(1);
  });

  it('aplica [offset:] a todos los timestamps siguientes', () => {
    const lrc = '[offset:+500]\n[00:01.00]A\n[00:05]B';
    const lines = parseLrc(lrc);
    expect(lines.map((l) => l.time)).toEqual([1.5, 5.5]);
  });

  it('aplica [offset:] negativo sin tiempos negativos', () => {
    const lines = parseLrc('[offset:-2000]\n[00:01.00]A\n[00:05]B');
    expect(lines.map((l) => l.time)).toEqual([0, 3]);
  });

  it('soporta múltiples timestamps en una misma línea', () => {
    const lines = parseLrc('[00:10][00:40]Repite');
    expect(lines).toEqual([
      { time: 10, text: 'Repite' },
      { time: 40, text: 'Repite' },
    ]);
  });

  it('soporta fracciones de 1 y 2 dígitos', () => {
    expect(parseLrc('[00:01.2]x')[0]?.time).toBe(1.2);
    expect(parseLrc('[00:01.25]x')[0]?.time).toBe(1.25);
  });

  it('soporta centésimas [mm:ss:xx]', () => {
    expect(parseLrc('[00:01:25]x')[0]?.time).toBe(1.25);
  });

  it('ignora líneas sin timestamp', () => {
    const lines = parseLrc('texto suelto\n[00:01]ok');
    expect(lines).toHaveLength(1);
  });

  it('devuelve vacío para texto sin formato LRC', () => {
    expect(parseLrc('un\nparrafo\ncomun')).toEqual([]);
  });
});

describe('plainLines', () => {
  it('convierte texto plano sin tiempos (no sincronizado)', () => {
    const lines = plainLines('hola\n\nmundo');
    expect(lines).toEqual([
      { time: -1, text: 'hola' },
      { time: -1, text: 'mundo' },
    ]);
    expect(isSynced(lines)).toBe(false);
  });
});

describe('isSynced', () => {
  it('detecta letras sincronizadas', () => {
    expect(isSynced(parseLrc('[00:01]x'))).toBe(true);
    expect(isSynced([])).toBe(false);
  });
});
