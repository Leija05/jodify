export interface DesktopUpdaterState {
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  latestVersion: string | null;
  notes: string;
  percent: number;
  error: string | null;
}

export interface DesktopUpdaterInfo {
  version: string;
  state: DesktopUpdaterState;
}

interface DesktopUpdaterApi {
  isDesktop: boolean;
  check: () => Promise<void>;
  install: () => Promise<void>;
  getState: () => Promise<DesktopUpdaterInfo>;
  onEvent: (callback: (payload: { type: string; state?: DesktopUpdaterState }) => void) => () => void;
}

export type TaskbarControlAction = 'prev' | 'toggle' | 'next' | 'like';

interface DesktopPlayerApi {
  setState: (state: { playing: boolean; hasTrack: boolean }) => void;
  onControl: (callback: (payload: { action: TaskbarControlAction }) => void) => () => void;
}

declare global {
  interface Window {
    jodifyUpdater?: DesktopUpdaterApi;
    jodifyPlayer?: DesktopPlayerApi;
  }
}

export {};