export const APP_NAME = 'JodiFy';
export const APP_TAGLINE = 'Free Music For Friends';
export const APP_VERSION = '2.0.0';

export const EQ_BANDS = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
export const EQ_MIN = -12;
export const EQ_MAX = 12;

export const DEFAULT_EQ_PRESETS: Record<string, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
  treble: [0, 0, 0, 0, 0, 0, 2, 4, 6, 8],
  vocal: [0, 0, 0, 3, 4, 4, 3, 1, 0, 0],
  rock: [5, 3, 2, 1, 0, 1, 3, 4, 4, 4],
  electronic: [5, 4, 2, 0, -1, 0, 2, 4, 5, 5],
  podcast: [2, 1, 0, 2, 3, 3, 2, 0, -1, -1],
  dance: [6, 5, 3, 1, 0, 1, 3, 4, 5, 5],
  classical: [3, 2, 1, 0, 0, 0, 1, 2, 3, 3],
  night: [4, 3, 2, 0, -1, 0, 2, 3, 4, 5],
};

export const JAM_CODE_LENGTH = 4;
export const JAM_SESSION_POLL_MS = 4000;
export const JAM_MEMBERS_POLL_MS = 8000;
export const JAM_HEARTBEAT_MS = 30000;
export const HEARTBEAT_MS = 30000;
export const COMMUNITY_REFRESH_MS = 15000;

export const LYRICS_PROVIDER_URL = 'https://api.lyrics.ovh/v1';
export const LANYARD_API_URL = 'https://api.lanyard.rest/v1/users';

export const GUEST_HINT = 'user / user123';

export const Z_INDEX = {
  base: 0,
  sticky: 100,
  drawer: 400,
  overlay: 500,
  modal: 1000,
  toast: 2000,
} as const;
