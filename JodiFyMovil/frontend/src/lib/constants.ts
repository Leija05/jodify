export const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'https://jodify-backend.onrender.com').replace(/\/+$/, '') + '/api';

/** Host del backend sin la ruta /api (para mostrar en la UI). */
export const API_HOST = API_BASE.replace(/\/api\/?$/, '');

export const STORAGE_KEYS = {
  token: 'jodify_token',
  user: 'jodify_user',
  likedIds: 'jodify_liked_ids',
  downloaded: 'jodify_downloaded_v1',
  skipUpdate: 'jodify_skipped_version',
  sleepTimer: 'jodify_sleep_timer',
  eq: 'jodify_eq_v1',
} as const;

export const REPO = 'Leija05/jodify';

export const SONGS_PER_PAGE = 100;

/** Frecuencias estándar del ecualizador (coinciden con las bandas de Android). */
export const EQ_BANDS = [60, 230, 910, 3600, 14000] as const;
export const EQ_MIN = -12;
export const EQ_MAX = 12;
export const EQ_STEP = 1;

export const DEFAULT_EQ_PRESETS: Record<string, number[]> = {
  flat: [0, 0, 0, 0, 0],
  pop: [2, 4, 2, 0, 1],
  rock: [4, 2, -1, 2, 4],
  jazz: [3, 1, -1, 2, 3],
  classic: [3, 2, 0, 2, 3],
  bass: [6, 4, 0, -1, -1],
  treble: [-2, 0, 1, 4, 6],
  vocals: [-1, 1, 4, 3, 0],
};

export const EQ_PRESET_LABELS: Record<string, string> = {
  flat: 'Plano',
  pop: 'Pop',
  rock: 'Rock',
  jazz: 'Jazz',
  classic: 'Clásica',
  bass: 'Bass',
  treble: 'Agudos',
  vocals: 'Voz',
};
