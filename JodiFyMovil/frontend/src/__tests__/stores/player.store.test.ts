import { act, renderHook } from '@testing-library/react';

// El motor de audio nativo no existe en entorno de pruebas: se simula.
const mockPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(),
  release: jest.fn(),
  duration: 0,
  currentTime: 0,
};

jest.mock('../../store/audio', () => ({
  ensurePlayerWithSource: jest.fn(() => mockPlayer),
  getPlayer: jest.fn(() => mockPlayer),
  onPlayerStatus: jest.fn(),
}));

import { usePlayerStore } from '../../store/player.store';

describe('player.store', () => {
  beforeEach(() => {
    mockPlayer.play.mockClear();
    mockPlayer.pause.mockClear();
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
      const song = { id: '1', name: 'Test Song', artist: 'Test Artist' };

      act(() => {
        result.current.playSong(song);
      });

      expect(result.current.currentSong).toEqual(song);
      expect(result.current.queueIndex).toBe(0);
    });

    it('should replace queue when new queue provided', () => {
      const { result } = renderHook(() => usePlayerStore());
      const song1 = { id: '1', name: 'Song 1' };
      const song2 = { id: '2', name: 'Song 2' };
      const song3 = { id: '3', name: 'Song 3' };

      act(() => {
        result.current.playSong(song1, [song1, song2, song3]);
      });

      expect(result.current.queue).toEqual([song1, song2, song3]);
      expect(result.current.currentSong).toEqual(song1);
    });

    it('should keep the queue untouched when none is provided', () => {
      const { result } = renderHook(() => usePlayerStore());
      const existing = [{ id: '9', name: 'Existing' }];

      act(() => {
        usePlayerStore.setState({ queue: existing, queueIndex: 0 });
        result.current.playSong({ id: '2', name: 'Other' });
      });

      // Sin queue explicita, la cola actual no cambia (solo salta el indice).
      expect(result.current.queue).toEqual(existing);
    });
  });

  describe('togglePlay', () => {
    it('should toggle isPlaying', () => {
      const { result } = renderHook(() => usePlayerStore());
      const song = { id: '1', name: 'Test' };

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
      const song = { id: '5', name: 'Duplicated?' };

      act(() => {
        result.current.addToQueue(song);
        result.current.addToQueue(song);
      });

      expect(result.current.queue).toEqual([song]);
    });

    it('should clear the queue and stop playback state', () => {
      const { result } = renderHook(() => usePlayerStore());

      act(() => {
        result.current.playQueue([{ id: '1', name: 'A' }, { id: '2', name: 'B' }]);
        result.current.clearQueue();
      });

      expect(result.current.queue).toEqual([]);
      expect(result.current.queueIndex).toBe(-1);
      expect(result.current.currentSong).toBeNull();
      expect(result.current.isPlaying).toBe(false);
    });
  });
});
