import { create } from 'zustand';

export interface AudioFxState {
  spatial8D: boolean;
  lofiFilter: boolean;
  bassHyper: boolean;
  speed: number; // 0.85 | 1.0 | 1.15
  isScratching: boolean;
  scratchAngle: number;
  toggle8D: () => void;
  toggleLofi: () => void;
  toggleBass: () => void;
  setSpeed: (speed: number) => void;
  setIsScratching: (scratching: boolean) => void;
  setScratchAngle: (angle: number) => void;
}

export const useAudioFxStore = create<AudioFxState>((set, get) => ({
  spatial8D: false,
  lofiFilter: false,
  bassHyper: false,
  speed: 1.0,
  isScratching: false,
  scratchAngle: 0,

  toggle8D: () => {
    const next = !get().spatial8D;
    set({ spatial8D: next });
    if (next) {
      import('../services/audioFx.service').then((m) => m.audioFxService.enable8D(true));
    } else {
      import('../services/audioFx.service').then((m) => m.audioFxService.enable8D(false));
    }
  },

  toggleLofi: () => {
    const next = !get().lofiFilter;
    set({ lofiFilter: next });
    import('../services/audioFx.service').then((m) => m.audioFxService.enableLofi(next));
  },

  toggleBass: () => {
    const next = !get().bassHyper;
    set({ bassHyper: next });
    import('../services/audioFx.service').then((m) => m.audioFxService.enableBassHyper(next));
  },

  setSpeed: (speed) => {
    set({ speed });
    import('../services/audioFx.service').then((m) => m.audioFxService.setPlaybackRate(speed));
  },

  setIsScratching: (isScratching) => set({ isScratching }),
  setScratchAngle: (scratchAngle) => set({ scratchAngle }),
}));
