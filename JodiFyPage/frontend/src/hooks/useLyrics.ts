import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../store/player.store';
import { fetchLyrics } from '../services/lyrics.service';
import { parseLrc, plainLines, isSynced } from '../lib/lrc';
import type { LyricsLine } from '../lib/types';

export function useLyrics(name: string | null, artist?: string): { lines: LyricsLine[]; activeIndex: number; loading: boolean } {
  const [lines, setLines] = useState<LyricsLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const requestIdRef = useRef(0);
  const currentTime = usePlayerStore((s) => s.currentTime);

  useEffect(() => {
    if (!name) {
      setLines([]);
      setActiveIndex(-1);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLines([]);
    setActiveIndex(-1);

    fetchLyrics(name, artist)
      .then((text) => {
        if (requestId !== requestIdRef.current) return;
        if (text) {
          const parsed = /\[\d{1,2}:\d{1,2}/.test(text) ? parseLrc(text) : plainLines(text);
          setLines(parsed);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });

    return () => {
      requestIdRef.current++;
    };
  }, [name, artist]);

  useEffect(() => {
    if (lines.length === 0 || !isSynced(lines)) return;
    let index = -1;
    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].time - 0.35) index = i;
      else break;
    }
    setActiveIndex(index);
  }, [currentTime, lines]);

  return { lines, activeIndex, loading };
}
