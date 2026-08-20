import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';

/**
 * Gestor del AudioPlayer de expo-audio.
 *
 * expo-audio (Android) tiene un bug conocido: `player.replace()` falla en
 * silencio cuando el player se creó sin fuente inicial (#35670). Para
 * evitarlo, el player se (re)crea SIEMPRE con la fuente adjunta al cambiar
 * de canción, y los listeners se re-adjuntan automáticamente al nuevo
 * player mediante un registro de suscriptores.
 */

type StatusListener = (status: AudioStatus) => void;

let player: AudioPlayer | null = null;
let currentSource: string | null = null;
let listeners: Set<StatusListener> = new Set();
let subscription: { remove: () => void } | null = null;

/** Contador global: cambia cada vez que se (re)crea el AudioPlayer nativo. */
let generation = 0;
function bumpGeneration() {
  generation += 1;
}

export function playerGeneration(): number {
  return generation;
}

function attachAll() {
  subscription?.remove();
  subscription = null;
  if (player && listeners.size > 0) {
    subscription = player.addListener('playbackStatusUpdate', (status) => {
      listeners.forEach((listener) => listener(status));
    });
  }
}

export function getPlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 500 });
    bumpGeneration();
    attachAll();
  }
  return player;
}

/**
 * Devuelve un player con la fuente indicada adjunta desde su creación.
 * Si el player existía con otra fuente, se libera y se crea uno nuevo
 * (vía fiable en todas las plataformas, evita el bug de `replace()`).
 */
export function ensurePlayerWithSource(source: string): AudioPlayer {
  if (player && currentSource === source) return player;
  if (player) {
    try {
      player.release();
    } catch {
      // el player ya estaba liberado
    }
    player = null;
    currentSource = null;
  }
  player = createAudioPlayer(source, { updateInterval: 500 });
  currentSource = source;
  bumpGeneration();
  attachAll();
  return player;
}

export function currentPlayerSource(): string | null {
  return currentSource;
}

/** Registra un listener de estado y lo re-adjunta si el player se recrea. */
export function onPlayerStatus(listener: StatusListener): () => void {
  listeners.add(listener);
  attachAll();
  return () => {
    listeners.delete(listener);
    attachAll();
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