import { formatTime, resolveArtist, clamp } from '../../lib/utils';

describe('utils', () => {
  describe('formatTime', () => {
    it('should format seconds to mm:ss', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(3661)).toBe('61:01');
    });

    it('should handle negative values', () => {
      expect(formatTime(-10)).toBe('0:00');
    });

    it('should handle NaN', () => {
      expect(formatTime(NaN)).toBe('0:00');
    });
  });

  describe('resolveArtist', () => {
    it('should return artist name', () => {
      const song = { artist: 'Test Artist' };
      expect(resolveArtist(song)).toBe('Test Artist');
    });

    it('should return artist from artists array', () => {
      const song = { artists: [{ name: 'Artist 1' }, { name: 'Artist 2' }] };
      expect(resolveArtist(song)).toBe('Artist 1');
    });

    it('should return undefined for unknown', () => {
      const song = {};
      expect(resolveArtist(song)).toBeNull();
    });
  });

  describe('clamp', () => {
    it('should clamp value between min and max', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should return min when min > max (documented behavior)', () => {
      expect(clamp(5, 10, 0)).toBe(0);
    });
  });
});