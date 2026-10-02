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
  onPlayerStatus: vi.fn(() => () => {}),
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

vi.mock('../../services/jam.service', () => ({
  emitBroadcast: vi.fn(),
  jamService: {
    persistPlaybackState: vi.fn(),
  },
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
      const song = { id: '1', name: 'Test Song', artist: 'Test Artist', url: 'https://test.com/song.mp3' };
      usePlayerStore.getState().playSong(song);

      const state = usePlayerStore.getState();
      expect(state.currentSong).toEqual(song);
      expect(state.queueIndex).toBe(0);
      expect(state.position).toBe(0);
      expect(state.duration).toBe(0);
    });

    it('should replace queue when new queue provided', () => {
      const song1 = { id: '1', name: 'Song 1', url: 'https://test.com/1.mp3' };
      const song2 = { id: '2', name: 'Song 2', url: 'https://test.com/2.mp3' };
      const song3 = { id: '3', name: 'Song 3', url: 'https://test.com/3.mp3' };

      usePlayerStore.getState().playSong(song1, [song1, song2, song3]);

      const state = usePlayerStore.getState();
      expect(state.queue).toEqual([song1, song2, song3]);
      expect(state.currentSong).toEqual(song1);
    });

    it('should keep the queue untouched when none is provided', () => {
      const existing = [{ id: '9', name: 'Existing', url: 'https://test.com/9.mp3' }];
      usePlayerStore.setState({ queue: existing, queueIndex: 0 });
      usePlayerStore.getState().playSong({ id: '2', name: 'Other', url: 'https://test.com/2.mp3' });

      expect(usePlayerStore.getState().queue).toEqual(existing);
    });
  });

  describe('togglePlay', () => {
    it('should toggle isPlaying', () => {
      const song = { id: '1', name: 'Test', url: 'https://test.com/test.mp3' };
      usePlayerStore.getState().playSong(song);
      usePlayerStore.getState().togglePlay();

      expect(usePlayerStore.getState().isPlaying).toBe(true);

      usePlayerStore.getState().togglePlay();
      expect(usePlayerStore.getState().isPlaying).toBe(false);
    });

    it('should do nothing without a current song', () => {
      usePlayerStore.getState().togglePlay();
      expect(usePlayerStore.getState().isPlaying).toBe(false);
    });
  });

  describe('shuffle', () => {
    it('should toggle shuffle', () => {
      usePlayerStore.getState().toggleShuffle();
      expect(usePlayerStore.getState().shuffle).toBe(true);

      usePlayerStore.getState().toggleShuffle();
      expect(usePlayerStore.getState().shuffle).toBe(false);
    });
  });

  describe('repeat', () => {
    it('should cycle through repeat modes', () => {
      expect(usePlayerStore.getState().repeat).toBe('off');

      usePlayerStore.getState().cycleRepeat();
      expect(usePlayerStore.getState().repeat).toBe('all');

      usePlayerStore.getState().cycleRepeat();
      expect(usePlayerStore.getState().repeat).toBe('one');

      usePlayerStore.getState().cycleRepeat();
      expect(usePlayerStore.getState().repeat).toBe('off');
    });
  });

  describe('queue management', () => {
    it('should add a song to the queue once', () => {
      const song = { id: '5', name: 'Duplicated?', url: 'https://test.com/5.mp3' };
      usePlayerStore.getState().addToQueue(song);
      usePlayerStore.getState().addToQueue(song);

      expect(usePlayerStore.getState().queue).toEqual([song]);
    });

    it('should clear the queue and stop playback state', () => {
      usePlayerStore.getState().playQueue([
        { id: '1', name: 'A', url: 'https://test.com/a.mp3' },
        { id: '2', name: 'B', url: 'https://test.com/b.mp3' },
      ]);
      usePlayerStore.getState().clearQueue();

      const state = usePlayerStore.getState();
      expect(state.queue).toEqual([]);
      expect(state.queueIndex).toBe(-1);
      expect(state.currentSong).toBeNull();
      expect(state.isPlaying).toBe(false);
    });
  });
});