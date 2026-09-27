import type { LyricsLine, ParsedLyrics } from './types';
export type { LyricsLine, ParsedLyrics };

const LRC_LINE_REGEX = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/g;

export function parseLRC(lrc: string): ParsedLyrics {
  const lines: LyricsLine[] = [];
  let match: RegExpExecArray | null;

  while ((match = LRC_LINE_REGEX.exec(lrc)) !== null) {
    const minStr = match[1] ?? '0';
    const secStr = match[2] ?? '0';
    const minutes = parseInt(minStr, 10);
    const seconds = parseInt(secStr, 10);
    const msPart = match[3] ?? '0';
    const ms = parseInt(msPart.padEnd(3, '0'), 10);
    const time = minutes * 60 + seconds + ms / 1000;
    const text = (match[4] ?? '').trim();
    if (text) lines.push({ time, text });
  }

  return {
    lines: lines.sort((a, b) => a.time - b.time),
    synced: lines.length > 0,
    format: 'lrc',
  };
}

export function parsePlainLyrics(text: string): ParsedLyrics {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((text, index) => ({ time: index * 4, text }));

  return {
    lines,
    synced: false,
    format: 'plain',
  };
}

export function parseLyrics(text: string): ParsedLyrics {
  if (text.includes('[') && text.includes(']') && /\d{2}:\d{2}/.test(text)) {
    return parseLRC(text);
  }
  return parsePlainLyrics(text);
}

export function findActiveLyricIndex(lines: LyricsLine[], currentTime: number): number {
  if (!lines.length) return -1;
  let low = 0;
  let high = lines.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const line = lines[mid];
    if (line && line.time <= currentTime) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}

export function getLyricAtTime(lines: LyricsLine[], time: number): LyricsLine | null {
  const index = findActiveLyricIndex(lines, time);
  return index >= 0 && lines[index] ? lines[index] : null;
}

export function formatLRC(lines: LyricsLine[]): string {
  return lines
    .map((line) => {
      const totalSeconds = Math.floor(line.time);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const ms = Math.round((line.time - totalSeconds) * 100);
      return `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}]${line.text}`;
    })
    .join('\n');
}