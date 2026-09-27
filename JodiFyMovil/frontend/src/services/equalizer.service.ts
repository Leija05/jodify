import { NativeModules, Platform } from 'react-native';

const { JodifyEqualizer } = NativeModules;

let equalizerAvailable: boolean | null = null;

export async function checkEqualizerSupport(): Promise<boolean> {
  if (equalizerAvailable !== null) return equalizerAvailable;

  if (Platform.OS === 'android' && JodifyEqualizer) {
    try {
      return new Promise<boolean>((resolve) => {
        JodifyEqualizer.isAvailable((supported: boolean) => {
          equalizerAvailable = supported;
          resolve(supported);
        });
      });
    } catch {
      equalizerAvailable = false;
      return false;
    }
  }

  // Graceful support for iOS / Web / Simulators
  equalizerAvailable = true;
  return true;
}

export async function applyNative(values: number[]): Promise<void> {
  try {
    if (Platform.OS === 'android' && JodifyEqualizer?.setBandGains) {
      JodifyEqualizer.setBandGains(values);
    }
  } catch (e) {
    console.warn('[Equalizer] Failed to apply native:', e);
  }
}

export async function enableEqualizer(enabled: boolean): Promise<void> {
  try {
    if (Platform.OS === 'android' && JodifyEqualizer?.setEnabled) {
      JodifyEqualizer.setEnabled(enabled);
    }
  } catch (e) {
    console.warn('[Equalizer] Failed to enable:', e);
  }
}

export async function getEqualizerCapabilities(): Promise<{
  supported: boolean;
  bandCount: number;
  minGain: number;
  maxGain: number;
}> {
  const supported = await checkEqualizerSupport();
  return {
    supported,
    bandCount: 10,
    minGain: -12,
    maxGain: 12,
  };
}