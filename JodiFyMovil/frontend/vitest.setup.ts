import { vi } from 'vitest';

(global as any).jest = vi;
(globalThis as any).__DEV__ = true;

(globalThis as any).expo = {
  EventEmitter: class {
    addListener() { return { remove: () => {} }; }
    emit() {}
  },
  modules: {},
};

vi.mock('react-native', () => {
  return {
    Platform: { OS: 'ios', select: (objs: any) => objs.ios ?? objs.default },
    Dimensions: { get: () => ({ width: 375, height: 812 }) },
    StyleSheet: { create: (styles: any) => styles },
    DeviceEventEmitter: { addListener: () => ({ remove: () => {} }) },
    NativeModules: {},
  };
});

vi.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: vi.fn(),
    },
    setAudioModeAsync: vi.fn().mockResolvedValue(undefined),
  },
  InterruptionModeIOS: { DoNotMix: 1 },
  InterruptionModeAndroid: { DoNotMix: 1 },
}));

vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
}));
