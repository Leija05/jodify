import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';

/**
 * Gestor del AudioPlayer de expo-audio con cache inteligente.
 * 
 * Mantiene un cache de players por source para evitar recreaciones costosas.
 * Limpia players antiguos automáticamente (LRU con límite de 3).
 */

type StatusListener = (status: AudioStatus) => void;

interface CachedPlayer {
  player: AudioPlayer;
  source: string;
  lastUsed: number;
  listeners: Set<StatusListener>;
}

const MAX_CACHED_PLAYERS = 3;
const cachedPlayers: Map<string, CachedPlayer> = new Map();
let currentPlayerKey: string | null = null;
let globalListeners: Set<StatusListener> = new Set();

/** Contador global: cambia cada vez que se (re)crea el AudioPlayer nativo. */
let generation = 0;
function bumpGeneration() {
  generation += 1;
}

function normalizeSource(src: string): string {
  return src
    .replace(/[?&]_t=\d+/g, '')
    .replace(/\/+$/, '');
}

function attachListenersToPlayer(cached: CachedPlayer) {
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
  
  // Check cache first
  const cached = cachedPlayers.get(normalized);
  if (cached) {
    cached.lastUsed = Date.now();
    currentPlayerKey = normalized;
    attachListenersToPlayer(cached);
    return cached.player;
  }
  
  // Create new player
  const player = createAudioPlayer(source, { updateInterval: 500 });
  
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
  
  // Attach to current player if exists
  if (currentPlayerKey) {
    const cached = cachedPlayers.get(currentPlayerKey);
    if (cached) attachListenersToPlayer(cached);
  }
  
  return () => {
    globalListeners.delete(listener);
  };
}

export async function configureAudioMode(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  } catch {
    // el modo de audio puede fallar en algunos dispositivos; la app sigue funcionando
  }
}