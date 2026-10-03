import { Audio, AVPlaybackStatus, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

export interface AudioPlayer {
  addListener: (event: string, listener: (status: any) => void) => void;
  removeAllListeners: (event: string) => void;
  release: () => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setRate: (rate: number) => Promise<void>;
  replace: (source: string) => Promise<void>;
  readonly duration: number;
  readonly currentTime: number;
}

export type StatusListener = (status: any) => void;

interface CachedPlayer {
  player: AudioPlayer;
  source: string;
  lastUsed: number;
  listeners: Set<StatusListener>;
}

const MAX_CACHED_PLAYERS = 3;
const cachedPlayers = new Map<string, CachedPlayer>();
let currentPlayerKey: string | null = null;
const globalListeners = new Set<StatusListener>();
let generation = 0;

function bumpGeneration() {
  generation += 1;
}

function normalizeSource(src: string): string {
  return src
    .replace(/[?&]_t=\d+/g, '')
    .replace(/\/+$/, '');
}

function createRealAudioPlayer(source: string): AudioPlayer {
  let sound: Audio.Sound | null = null;
  let loadPromise: Promise<void> | null = null;
  let desiredPlaying = false;

  const status = {
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    rate: 1,
    playbackState: 1, // 1: idle, 2: paused, 3: playing, 4: buffering, 5: error, 6: finished
    error: null as string | null,
  };
  const listeners = new Set<(s: any) => void>();

  const notify = (customStatus?: any) => {
    const payload = customStatus ?? { ...status };
    listeners.forEach((l) => l(payload));
    globalListeners.forEach((l) => l(payload));
  };

  const onPlaybackStatusUpdate = (playbackStatus: AVPlaybackStatus) => {
    if (!playbackStatus.isLoaded) {
      if (playbackStatus.error) {
        status.playbackState = 5;
        notify({ ...status, error: playbackStatus.error });
      }
      return;
    }

    status.currentTime = playbackStatus.positionMillis / 1000;
    status.duration = (playbackStatus.durationMillis ?? 0) / 1000;
    status.playing = playbackStatus.isPlaying;
    status.volume = playbackStatus.volume;
    status.rate = playbackStatus.rate;

    if (playbackStatus.didJustFinish) {
      status.playbackState = 6;
    } else if (playbackStatus.isBuffering) {
      status.playbackState = 4;
    } else if (playbackStatus.isPlaying) {
      status.playbackState = 3;
    } else {
      status.playbackState = 2;
    }

    notify({
      ...status,
      currentTime: status.currentTime,
      duration: status.duration,
      playbackState: status.playbackState,
    });
  };

  const loadSound = async (src: string) => {
    try {
      if (sound) {
        try {
          await sound.unloadAsync();
        } catch {
          // ignore
        }
        sound = null;
      }
      const initialStatus = {
        shouldPlay: desiredPlaying,
        volume: status.volume,
        rate: status.rate,
        progressUpdateIntervalMillis: 100,
      };
      const soundObject = new Audio.Sound();
      soundObject.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      await soundObject.loadAsync({ uri: src }, initialStatus, false);
      sound = soundObject;
      if (desiredPlaying) {
        await soundObject.playAsync();
      }
    } catch (e: any) {
      console.warn('[Audio] Failed to load audio source:', src, e?.message ?? e);
      status.playbackState = 5;
      notify({ ...status, error: e?.message ?? 'Error al cargar canción' });
    } finally {
      loadPromise = null;
    }
  };

  if (source) {
    loadPromise = loadSound(source);
  }

  const player: AudioPlayer = {
    addListener: (event: string, listener: (s: any) => void) => {
      if (event === 'playbackStatusUpdate') listeners.add(listener);
    },
    removeAllListeners: (event: string) => {
      if (event === 'playbackStatusUpdate') listeners.clear();
    },
    release: () => {
      listeners.clear();
      desiredPlaying = false;
      if (sound) {
        sound.unloadAsync().catch(() => {});
        sound = null;
      }
      loadPromise = null;
    },
    play: async () => {
      desiredPlaying = true;
      status.playing = true;
      status.playbackState = 3;
      notify();
      if (loadPromise) {
        await loadPromise;
      }
      if (sound && desiredPlaying) {
        try {
          await sound.playAsync();
        } catch (e) {
          console.warn('[Audio] Play error:', e);
          throw e;
        }
      } else if (!sound && desiredPlaying) {
        throw new Error(status.error || 'No se pudo cargar la fuente de audio');
      }
    },
    pause: async () => {
      desiredPlaying = false;
      status.playing = false;
      status.playbackState = 2;
      notify();
      if (loadPromise) {
        await loadPromise;
      }
      if (sound) {
        try {
          await sound.pauseAsync();
        } catch (e) {
          console.warn('[Audio] Pause error:', e);
        }
      }
    },
    seekTo: async (position: number) => {
      status.currentTime = position;
      notify();
      if (loadPromise) {
        await loadPromise;
      }
      if (sound) {
        try {
          await sound.setPositionAsync(Math.max(0, position * 1000));
        } catch (e) {
          console.warn('[Audio] Seek error:', e);
        }
      }
    },
    setVolume: async (volume: number) => {
      status.volume = volume;
      notify();
      if (loadPromise) {
        await loadPromise;
      }
      if (sound) {
        try {
          await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
        } catch (e) {
          console.warn('[Audio] Volume error:', e);
        }
      }
    },
    setRate: async (rate: number) => {
      status.rate = rate;
      notify();
      if (loadPromise) {
        await loadPromise;
      }
      if (sound) {
        try {
          await sound.setRateAsync(rate, true);
        } catch (e) {
          console.warn('[Audio] Rate error:', e);
        }
      }
    },
    replace: async (newSource: string) => {
      status.duration = 0;
      status.currentTime = 0;
      loadPromise = loadSound(newSource);
      await loadPromise;
    },
    get duration() {
      return status.duration;
    },
    get currentTime() {
      return status.currentTime;
    },
  };

  return player;
}

function attachListenersToPlayer(cached: CachedPlayer) {
  detachAllListeners(cached);
  const allListeners = new Set([...cached.listeners, ...globalListeners]);
  if (allListeners.size > 0) {
    cached.player.addListener('playbackStatusUpdate', (status) => {
      allListeners.forEach((listener) => listener(status));
    });
  }
}

function detachAllListeners(cached: CachedPlayer) {
  try {
    cached.player.removeAllListeners('playbackStatusUpdate');
  } catch {
    // ignore
  }
}

function evictOldestIfNeeded() {
  if (cachedPlayers.size <= MAX_CACHED_PLAYERS) return;

  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, cached] of cachedPlayers) {
    if (key === currentPlayerKey) continue;
    if (cached.lastUsed < oldestTime) {
      oldestTime = cached.lastUsed;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    const cached = cachedPlayers.get(oldestKey);
    if (cached) {
      detachAllListeners(cached);
      try {
        cached.player.release();
      } catch {
        // ignore
      }
      cachedPlayers.delete(oldestKey);
    }
  }
}

export function playerGeneration(): number {
  return generation;
}

export function getPlayer(): AudioPlayer | null {
  if (!currentPlayerKey) return null;
  const cached = cachedPlayers.get(currentPlayerKey);
  return cached?.player ?? null;
}

export function ensurePlayerWithSource(source: string): AudioPlayer {
  const normalized = normalizeSource(source);

  if (currentPlayerKey && currentPlayerKey !== normalized) {
    const prevCached = cachedPlayers.get(currentPlayerKey);
    if (prevCached) {
      void prevCached.player.pause();
    }
  }

  const cached = cachedPlayers.get(normalized);
  if (cached) {
    cached.lastUsed = Date.now();
    currentPlayerKey = normalized;
    attachListenersToPlayer(cached);
    return cached.player;
  }

  const player = createRealAudioPlayer(source);

  const newCached: CachedPlayer = {
    player,
    source: normalized,
    lastUsed: Date.now(),
    listeners: new Set(),
  };

  cachedPlayers.set(normalized, newCached);
  currentPlayerKey = normalized;
  bumpGeneration();
  evictOldestIfNeeded();

  attachListenersToPlayer(newCached);
  return player;
}

export function currentPlayerSource(): string | null {
  return currentPlayerKey;
}

export function releasePlayer(source: string): void {
  const normalized = normalizeSource(source);
  const cached = cachedPlayers.get(normalized);
  if (cached) {
    detachAllListeners(cached);
    try {
      cached.player.release();
    } catch {
      // ignore
    }
    cachedPlayers.delete(normalized);
    if (currentPlayerKey === normalized) {
      currentPlayerKey = null;
    }
  }
}

export function clearPlayerCache(): void {
  for (const cached of cachedPlayers.values()) {
    detachAllListeners(cached);
    try {
      cached.player.release();
    } catch {
      // ignore
    }
  }
  cachedPlayers.clear();
  currentPlayerKey = null;
}

export function onPlayerStatus(listener: StatusListener): () => void {
  globalListeners.add(listener);

  if (currentPlayerKey) {
    const cached = cachedPlayers.get(currentPlayerKey);
    if (cached) attachListenersToPlayer(cached);
  }

  return () => {
    globalListeners.delete(listener);
  };
}

let audioModeConfigured = false;
export async function configureAudioMode(): Promise<void> {
  if (audioModeConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      playThroughEarpieceAndroid: false,
    });
    audioModeConfigured = true;
    console.log('[Audio] Audio session successfully configured for background playback');
  } catch (e) {
    console.warn('[Audio] Failed to configure audio mode:', e);
  }
}