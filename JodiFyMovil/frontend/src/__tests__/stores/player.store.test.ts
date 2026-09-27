import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlayerStore } from '../../stores/player.store';

const mockPlayer = {
  play: vi.fn(),
  pause: vi.fn(),
  seekTo: vi.fn(),
  release: vi.fn(),
  duration: 200,
  currentTime: 0,
};

vi.mock('../../stores/audio', () => ({
  ensurePlayerWithSource: vi.fn(() => mockPlayer),
  getPlayer: vi.fn(() => mockPlayer),
  onPlayerStatus: vi.fn((cb) => cb({ playbackState: 3, currentTime: 0, duration: 200 })),
}));

vi.mock('../../services/lockscreen.service', () => ({
  activateLockScreenForSong: vi.fn(),
  syncLockScreen: vi.fn(),
}));

vi.mock('../../services/equalizer.service', () => ({
  applyNative: vi.fn(),
}));

vi.mock('../../services/history.service', () => ({
  recordHistory: vi.fn(),
}));

vi.mock('../../stores/settings.store', () => ({
  useSettingsStore: { getState: () => ({ user: null }) },
}));

vi.mock('../../stores/eq.store', () => ({
  useEqStore: { getState: () => ({ enabled: false, values: [] }) },
}));

describe('player.store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerStore.setState({
      queue: [],
      queueIndex: -1,
      currentSong: null,
      isPlaying: false,
      position: 0,
      duration: 0,
      isBuffering: false,
      error: null,
      shuffle: false,
      repeat: 'off',
      order: [],
    });
  });

  describe('playSong', () => {
    it('should set current song and reset progress', () => {
      const { result } = renderHook(() => usePlayerStore());
      const song = { id: '1', name: 'Test Song', artist: 'Test Artist', url: 'https://test.com/song.mp3' };

      act(() => {
        result.current.playSong(song);
      });

      expect(result.current.currentSong).toEqual(song);
      expect(result.current.queueIndex).toBe(0);
      expect(result.current.position).toBe(0);
      expect(result.current.duration).toBe(0);
    });

    it('should replace queue when new queue provided', () => {
      const { result } = renderHook(() => usePlayerStore());
      const song1 = { id: '1', name: 'Song 1', url: 'https://test.com/1.mp3' };
      const song2 = { id: '2', name: 'Song 2', url: 'https://test.com/2.mp3' };
      const song3 = { id: '3', name: 'Song 3', url: 'https://test.com/3.mp3' };

      act(() => {
        result.current.playSong(song1, [song1, song2, song3]);
      });

      expect(result.current.queue).toEqual([song1, song2, song3]);
      expect(result.current.currentSong).toEqual(song1);
    });

    it('should keep the queue untouched when none is provided', () => {
      const { result } = renderHook(() => usePlayerStore());
      const existing = [{ id: '9', name: 'Existing', url: 'https://test.com/9.mp3' }];

      act(() => {
        usePlayerStore.setState({ queue: existing, queueIndex: 0 });
        result.current.playSong({ id: '2', name: 'Other', url: 'https://test.com/2.mp3' });
      });

      expect(result.current.queue).toEqual(existing);
    });
  });

  describe('togglePlay', () => {
    it('should toggle isPlaying', () => {
      const { result } = renderHook(() => usePlayerStore());
      const song = { id: '1', name: 'Test', url: 'https://test.com/test.mp3' };

      act(() => {
        result.current.playSong(song);
        result.current.togglePlay();
      });

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.togglePlay();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should do nothing without a current song', () => {
      const { result } = renderHook(() => usePlayerStore());

      act(() => {
        result.current.togglePlay();
      });

      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('shuffle', () => {
    it('should toggle shuffle', () => {
      const { result } = renderHook(() => usePlayerStore());

      act(() => {
        result.current.toggleShuffle();
      });

      expect(result.current.shuffle).toBe(true);

      act(() => {
        result.current.toggleShuffle();
      });

      expect(result.current.shuffle).toBe(false);
    });
  });

  describe('repeat', () => {
    it('should cycle through repeat modes', () => {
      const { result } = renderHook(() => usePlayerStore());

      expect(result.current.repeat).toBe('off');

      act(() => {
        result.current.cycleRepeat();
      });

      expect(result.current.repeat).toBe('all');

      act(() => {
        result.current.cycleRepeat();
      });

      expect(result.current.repeat).toBe('one');

      act(() => {
        result.current.cycleRepeat();
      });

      expect(result.current.repeat).toBe('off');
    });
  });

  describe('queue management', () => {
    it('should add a song to the queue once', () => {
      const { result } = renderHook(() => usePlayerStore());
      const song = { id: '5', name: 'Duplicated?', url: 'https://test.com/5.mp3' };

      act(() => {
        result.current.addToQueue(song);
        result.current.addToQueue(song);
      });

      expect(result.current.queue).toEqual([song]);
    });

    it('should clear the queue and stop playback state', () => {
      const { result } = renderHook(() => usePlayerStore());

      act(() => {
        result.current.playQueue([{ id: '1', name: 'A', url: 'https://test.com/a.mp3' }, { id: '2', name: 'B', url: 'https://test.com/b.mp3' }]);
        result.current.clearQueue();
      });

      expect(result.current.queue).toEqual([]);
      expect(result.current.queueIndex).toBe(-1);
      expect(result.current.currentSong).toBeNull();
      expect(result.current.isPlaying).toBe(false);
    });
  });
});