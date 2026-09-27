export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://jodify-backend.onrender.com';
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'wss://jodify-backend.onrender.com';
export const API_HOST = process.env.EXPO_PUBLIC_API_BASE || 'https://jodify-backend.onrender.com';

export const STORAGE_KEYS = {
  token: 'auth.token',
  authToken: 'auth.token',
  user: 'auth.user',
  authUser: 'auth.user',
  refreshToken: 'auth.refreshToken',
  authRefreshToken: 'auth.refreshToken',
  userVolume: 'user.volume',
  userMuted: 'user.muted',
  eqEnabled: 'eq.enabled',
  eqPreset: 'eq.preset',
  eqBands: 'eq.bands',
  libraryTab: 'library.tab',
  librarySort: 'library.sort',
  librarySearch: 'library.search',
  downloads: 'downloads.index',
  sleepTimer: 'sleep.timer',
  jamClientId: 'jam.clientId',
  jamState: 'jam.state',
  onboardingComplete: 'app.onboardingComplete',
  lastVersionCheck: 'app.lastVersionCheck',
  pushToken: 'push.token',
  theme: 'app.theme',
  hapticsEnabled: 'app.hapticsEnabled',
  reducedMotion: 'app.reducedMotion',
} as const;

export const GUEST_HINT = 'guest / guest';

export const JAM_CODE_LENGTH = 4;
export const MAX_QUEUE_LENGTH = 500;
export const MAX_DOWNLOADS = 1000;

export const HAPTIC_PATTERNS = {
  light: 'light',
  medium: 'medium',
  heavy: 'heavy',
  selection: 'selection',
  success: 'success',
  warning: 'warning',
  error: 'error',
} as const;

export const QUERY_KEYS = {
  songs: ['songs'] as const,
  song: (id: string | number) => ['songs', id] as const,
  likedIds: (username: string) => ['likes', username] as const,
  downloadedIds: (username: string) => ['downloads', username] as const,
  userProfile: (username: string) => ['users', username] as const,
  communityUsers: ['community', 'users'] as const,
  jamSession: (code: string) => ['jam', code] as const,
  jamHistory: (username: string) => ['jam', 'history', username] as const,
  lyrics: (songName: string, artist?: string) => ['lyrics', songName, artist] as const,
  topSongs: (limit: number) => ['songs', 'top', limit] as const,
  listeningHistory: (username: string, limit: number) => ['history', username, limit] as const,
  listeningStats: (username: string) => ['stats', username] as const,
  topSongsUser: (username: string, limit: number) => ['stats', username, 'top', limit] as const,
  updates: ['updates'] as const,
} as const;

export const MUTATION_KEYS = {
  login: ['auth', 'login'] as const,
  register: ['auth', 'register'] as const,
  validateToken: ['auth', 'validateToken'] as const,
  like: ['likes', 'toggle'] as const,
  download: ['downloads', 'toggle'] as const,
  history: ['history', 'add'] as const,
  createJam: ['jam', 'create'] as const,
  joinJam: ['jam', 'join'] as const,
  leaveJam: ['jam', 'leave'] as const,
  updateJamPermissions: ['jam', 'permissions'] as const,
  recommendSong: ['jam', 'recommend'] as const,
  uploadSong: ['songs', 'upload'] as const,
  updateSong: ['songs', 'update'] as const,
  deleteSongs: ['songs', 'delete'] as const,
  updateProfile: ['users', 'update'] as const,
  setDiscord: ['users', 'discord'] as const,
  heartbeat: ['users', 'heartbeat'] as const,
  nowPlaying: ['users', 'nowPlaying'] as const,
} as const;

export const WS_EVENTS = {
  connect: 'connect',
  disconnect: 'disconnect',
  join: 'jam-join',
  leave: 'jam-leave',
  userJoined: 'jam-user-joined',
  userLeft: 'jam-user-left',
  queueAdd: 'jam-queue-add',
  queueRemove: 'jam-queue-remove',
  play: 'jam-play',
  pause: 'jam-pause',
  seek: 'jam-seek',
  config: 'jam-config',
  recommend: 'jam-recommend',
  hostRecommendations: 'jam-host-recommendations',
  sessionEnded: 'jam-session-ended',
} as const;