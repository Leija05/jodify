import { describe, it, expect } from 'vitest';
import { shuffleArray, clamp, formatDuration, formatRelativeTime, parseLyrics, findActiveLyricIndex, sortSongs, filterSongsByTab, searchSongs, pickCoverUrl, resolveArtist, calculateMelomanoLevel } from '../../lib/utils';
import type { Song } from '../../lib/types';

describe('utils', () => {
  describe('clamp', () => {
    it('should clamp value between min and max', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('shuffleArray', () => {
    it('should return shuffled array with same elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(arr);
      expect(shuffled).toHaveLength(5);
      expect(shuffled.sort()).toEqual(arr.sort());
    });

    it('should not mutate original array', () => {
      const arr = [1, 2, 3];
      shuffleArray(arr);
      expect(arr).toEqual([1, 2, 3]);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(3661)).toBe('61:01');
    });

    it('should handle invalid input', () => {
      expect(formatDuration(-1)).toBe('0:00');
      expect(formatDuration(NaN)).toBe('0:00');
      expect(formatDuration(Infinity)).toBe('0:00');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format relative time correctly', () => {
      const now = Date.now();
      expect(formatRelativeTime(new Date(now - 30000).toISOString())).toBe('ahora');
      expect(formatRelativeTime(new Date(now - 300000).toISOString())).toBe('5m');
      expect(formatRelativeTime(new Date(now - 7200000).toISOString())).toBe('2h');
      expect(formatRelativeTime(new Date(now - 172800000).toISOString())).toBe('2d');
      expect(formatRelativeTime(null)).toBe('ahora');
      expect(formatRelativeTime(undefined)).toBe('ahora');
      expect(formatRelativeTime('invalid-date')).toBe('ahora');
    });
  });

  describe('parseLyrics', () => {
    it('should parse LRC format', () => {
      const lrc = '[00:00.00]Line 1\n[00:05.00]Line 2\n[00:10.00]Line 3';
      const parsed = parseLyrics(lrc);
      expect(parsed.format).toBe('lrc');
      expect(parsed.synced).toBe(true);
      expect(parsed.lines).toHaveLength(3);
      expect(parsed.lines[0]).toEqual({ time: 0, text: 'Line 1' });
      expect(parsed.lines[1]).toEqual({ time: 5, text: 'Line 2' });
    });

    it('should parse plain text format', () => {
      const text = 'Line 1\nLine 2\n\nLine 3';
      const parsed = parseLyrics(text);
      expect(parsed.format).toBe('plain');
      expect(parsed.synced).toBe(false);
      expect(parsed.lines).toHaveLength(3);
    });

    it('should handle empty input', () => {
      const parsed = parseLyrics('');
      expect(parsed.lines).toHaveLength(0);
    });
  });

  describe('findActiveLyricIndex', () => {
    it('should find correct index for current time', () => {
      const lines = [
        { time: 0, text: 'Line 1' },
        { time: 5, text: 'Line 2' },
        { time: 10, text: 'Line 3' },
      ];
      expect(findActiveLyricIndex(lines, 0)).toBe(0);
      expect(findActiveLyricIndex(lines, 3)).toBe(0);
      expect(findActiveLyricIndex(lines, 5)).toBe(1);
      expect(findActiveLyricIndex(lines, 7)).toBe(1);
      expect(findActiveLyricIndex(lines, 10)).toBe(2);
      expect(findActiveLyricIndex(lines, 15)).toBe(2);
    });

    it('should return -1 for empty lines', () => {
      expect(findActiveLyricIndex([], 5)).toBe(-1);
    });
  });

  describe('sortSongs', () => {
    const songs: Song[] = [
      { id: 1, name: 'A', created_at: '2024-01-01', play_count: 10 },
      { id: 2, name: 'B', created_at: '2024-01-03', play_count: 5 },
      { id: 3, name: 'C', created_at: '2024-01-02', play_count: 15 },
    ];

    it('should sort by recent (default)', () => {
      const sorted = sortSongs(songs, 'recent');
      expect(sorted.map(s => s.id)).toEqual([2, 3, 1]);
    });

    it('should sort by old', () => {
      const sorted = sortSongs(songs, 'old');
      expect(sorted.map(s => s.id)).toEqual([1, 3, 2]);
    });

    it('should sort by popular', () => {
      const sorted = sortSongs(songs, 'popular');
      expect(sorted.map(s => s.id)).toEqual([3, 1, 2]);
    });

    it('should sort by name', () => {
      const sorted = sortSongs(songs, 'name');
      expect(sorted.map(s => s.name)).toEqual(['A', 'B', 'C']);
    });
  });

  describe('filterSongsByTab', () => {
    const songs: Song[] = [
      { id: 1, name: 'Song 1' },
      { id: 2, name: 'Song 2' },
      { id: 3, name: 'Song 3' },
    ];

    it('should filter liked songs', () => {
      const filtered = filterSongsByTab(songs, 'liked', [1], []);
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe(1);
    });

    it('should filter downloaded songs', () => {
      const filtered = filterSongsByTab(songs, 'downloads', [], [2]);
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe(2);
    });

    it('should return all songs for global tab', () => {
      const filtered = filterSongsByTab(songs, 'global', [1], [2]);
      expect(filtered).toHaveLength(3);
    });
  });

  describe('searchSongs', () => {
    const songs: Song[] = [
      { id: 1, name: 'Hello World', artist: 'Artist A' },
      { id: 2, name: 'Goodbye', artist: 'Artist B' },
      { id: 3, name: 'Test Song', artist: 'Artist A' },
    ];

    it('should search by name', () => {
      const results = searchSongs(songs, 'hello');
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(1);
    });

    it('should search by artist', () => {
      const results = searchSongs(songs, 'artist a');
      expect(results).toHaveLength(2);
    });

    it('should return all for empty query', () => {
      const results = searchSongs(songs, '');
      expect(results).toHaveLength(3);
    });

    it('should be case insensitive', () => {
      const results = searchSongs(songs, 'HELLO');
      expect(results).toHaveLength(1);
    });
  });

  describe('pickCoverUrl', () => {
    it('should pick first available cover URL', () => {
      const song: Song = {
        id: 1,
        name: 'Test',
        cover_url: 'https://example.com/cover.jpg',
        coverUrl: 'https://example.com/cover2.jpg',
      };
      expect(pickCoverUrl(song)).toBe('https://example.com/cover.jpg');
    });

    it('should return null if no cover', () => {
      const song: Song = { id: 1, name: 'Test' };
      expect(pickCoverUrl(song)).toBeNull();
    });
  });

  describe('resolveArtist', () => {
    it('should return artist if available', () => {
      const song: Song = { id: 1, name: 'Test', artist: 'Artist Name' };
      expect(resolveArtist(song)).toBe('Artist Name');
    });

    it('should return album if no artist', () => {
      const song: Song = { id: 1, name: 'Test', album: 'Album Name' };
      expect(resolveArtist(song)).toBe('Album Name');
    });

    it('should return null if neither', () => {
      const song: Song = { id: 1, name: 'Test' };
      expect(resolveArtist(song)).toBeNull();
    });
  });

  describe('calculateMelomanoLevel', () => {
    it('should calculate accurate hours from listening_seconds without false inflation', () => {
      const res = calculateMelomanoLevel({
        listening_seconds: 7200, // 2 hours exactly
        played: 5,
        liked: 3,
        downloaded: 1,
      });
      expect(res.listenedMinutes).toBe(120);
      expect(res.listenedHours).toBe(2);
      expect(res.level).toBeGreaterThanOrEqual(1);
    });

    it('should handle 0 seconds without inflating played as hours when sec=0', () => {
      const res = calculateMelomanoLevel({
        listening_seconds: 0,
        played: 0,
        liked: 0,
        downloaded: 0,
      });
      expect(res.listenedMinutes).toBe(0);
      expect(res.listenedHours).toBe(0);
      expect(res.level).toBe(1);
      expect(res.title).toBe('Iniciado del Ritmo');
    });

    it('should accurately calculate fraction hours', () => {
      const res = calculateMelomanoLevel({
        listening_seconds: 1800, // 30 minutes = 0.5 hours
        played: 1,
      });
      expect(res.listenedMinutes).toBe(30);
      expect(res.listenedHours).toBe(0.5);
    });
  });
});