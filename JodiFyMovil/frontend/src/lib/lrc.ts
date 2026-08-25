import type { LyricsLine } from './types';

const TIME_TAG = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const OFFSET_TAG = /^\[offset:\s*([+-]?\d+)\s*\]$/i;

export function parseLrc(text: string): LyricsLine[] {
  const lines: LyricsLine[] = [];
  let offsetMs = 0;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const offsetMatch = line.match(OFFSET_TAG);
    const offsetValue = offsetMatch?.[1];
    if (offsetMatch && offsetValue != null) {
      offsetMs = parseInt(offsetValue, 10) || 0;
      continue;
    }
    if (/^\[[a-z]{2}:/i.test(line)) continue;

    const tags = [...line.matchAll(TIME_TAG)];
    if (tags.length === 0) continue;
    const text = line.replace(TIME_TAG, '').trim();
    if (!text) continue;

    for (const tag of tags) {
      const minutes = parseInt(tag[1] ?? '0', 10);
      const seconds = parseInt(tag[2] ?? '0', 10);
      const fraction = (tag[3] ?? '').padEnd(3, '0').slice(0, 3);
      const millis = parseInt(fraction || '0', 10);
      const time = Math.max(0, minutes * 60 + seconds + millis / 1000 + offsetMs / 1000);
      lines.push({ time, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function plainLines(text: string): LyricsLine[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ time: -1, text }));
}

export function isSynced(lines: LyricsLine[]): boolean {
  return lines.length > 0 && lines.every((l) => l.time >= 0);
}
