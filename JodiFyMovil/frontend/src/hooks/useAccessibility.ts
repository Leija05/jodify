import { useEffect, useState } from 'react';
import { AccessibilityInfo, Dimensions, ScaledSize } from 'react-native';

export interface AccessibilityState {
  reduceMotion: boolean;
  reduceTransparency: boolean;
  highContrast: boolean;
  screenReaderEnabled: boolean;
  fontScale: number;
}

export function useAccessibility(): AccessibilityState {
  const [state, setState] = useState<AccessibilityState>({
    reduceMotion: false,
    reduceTransparency: false,
    highContrast: false,
    screenReaderEnabled: false,
    fontScale: 1,
  });

  useEffect(() => {
    const updateState = async () => {
      const [
        reduceMotion,
        reduceTransparency,
        highContrast,
        screenReaderEnabled,
      ] = await Promise.all([
        AccessibilityInfo.isReduceMotionEnabled(),
        AccessibilityInfo.isReduceTransparencyEnabled?.() ?? Promise.resolve(false),
        AccessibilityInfo.isHighTextContrastEnabled?.() ?? Promise.resolve(false),
        AccessibilityInfo.isScreenReaderEnabled(),
      ]);

      setState((prev) => ({
        ...prev,
        reduceMotion,
        reduceTransparency,
        highContrast,
        screenReaderEnabled,
      }));
    };

    updateState();

    const subscriptions = [
      AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) =>
        setState((prev) => ({ ...prev, reduceMotion: enabled }))
      ),
      AccessibilityInfo.addEventListener('reduceTransparencyChanged', (enabled) =>
        setState((prev) => ({ ...prev, reduceTransparency: enabled }))
      ),
      AccessibilityInfo.addEventListener('highTextContrastChanged', (enabled) =>
        setState((prev) => ({ ...prev, highContrast: enabled }))
      ),
      AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) =>
        setState((prev) => ({ ...prev, screenReaderEnabled: enabled }))
      ),
    ];

    return () => {
      subscriptions.forEach((sub) => sub?.remove?.());
    };
  }, []);

  return state;
}

export function useFontScale(): number {
  const [fontScale, setFontScale] = useState(() => Dimensions.get('window').fontScale);

  useEffect(() => {
    const handler = ({ window }: { window: ScaledSize }) => setFontScale(window.fontScale);
    const subscription = Dimensions.addEventListener('change', handler);
    return () => subscription.remove();
  }, []);

  return fontScale;
}

export function useDynamicType(
  baseSize: number,
  options?: { maxScale?: number; minScale?: number }
): number {
  const fontScale = useFontScale();
  const maxScale = options?.maxScale ?? 1.5;
  const minScale = options?.minScale ?? 0.85;

  return Math.min(Math.max(baseSize * fontScale, baseSize * minScale), baseSize * maxScale);
}

export function useAccessibleColor(
  lightColor: string,
  darkColor: string,
  highContrastLight?: string,
  highContrastDark?: string
): string {
  const { highContrast, reduceTransparency } = useAccessibility();

  if (highContrast) {
    return highContrastLight ?? highContrastDark ?? lightColor;
  }

  if (reduceTransparency) {
    return darkColor;
  }

  return lightColor;
}

export function getAccessibilityProps(
  label: string,
  hint?: string,
  role: 'button' | 'link' | 'header' | 'text' | 'image' | 'adjustable' = 'button',
  state?: { disabled?: boolean; selected?: boolean; checked?: boolean; expanded?: boolean }
) {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: role,
    accessibilityState: state,
  };
}

export function announceForAccessibility(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}

export function setAccessibilityFocus(ref: React.RefObject<any>) {
  if (ref.current?.setNativeProps) {
    ref.current.setNativeProps({ accessibilityState: { focused: true } });
  }
}