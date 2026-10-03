import type { LyricsLine, ParsedLyrics } from './types';
export type { LyricsLine, ParsedLyrics };

const TIME_TAG = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const OFFSET_TAG = /^\[offset:\s*([+-]?\d+)\s*\]$/i;

export function parseLRC(lrc: string): ParsedLyrics {
  const lines: LyricsLine[] = [];
  let offsetMs = 0;

  for (const raw of lrc.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const offsetMatch = line.match(OFFSET_TAG);
    if (offsetMatch) {
      offsetMs = parseInt(offsetMatch[1] || '0', 10) || 0;
      continue;
    }
    if (/^\[[a-z]{2}:/i.test(line)) continue;

    const tags = [...line.matchAll(TIME_TAG)];
    if (tags.length === 0) continue;
    const text = line.replace(TIME_TAG, '').trim();
    if (!text) continue;

    for (const tag of tags) {
      const minutes = parseInt(tag[1] || '0', 10);
      const seconds = parseInt(tag[2] || '0', 10);
      const fraction = (tag[3] ?? '').padEnd(3, '0').slice(0, 3);
      const millis = parseInt(fraction || '0', 10);
      const time = Math.max(0, minutes * 60 + seconds + millis / 1000 + offsetMs / 1000);
      lines.push({ time, text });
    }
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