import { act, renderHook } from '@testing-library/react';
import { useSpring, useFadeIn, useSlideUp, useScale } from '../../hooks/animations';
import { Animated } from 'react-native';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn((options: { ios?: unknown }) => options.ios) },
  Dimensions: { get: jest.fn(() => ({ width: 390, height: 844, scale: 3, fontScale: 1 })) },
  AccessibilityInfo: {
    isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
  Animated: {
    Value: jest.fn().mockImplementation((initial: number) => ({
      _value: initial,
      setValue: jest.fn(function (this: { _value: number }, v: number) {
        this._value = v;
      }),
      interpolate: jest.fn().mockReturnThis(),
      extractOffset: jest.fn(),
      flattenOffset: jest.fn(),
    })),
    spring: jest.fn((value: { _value: number }, config: { toValue: number }) => ({
      start: jest.fn((callback?: () => void) => {
        value._value = config.toValue;
        callback?.();
      }),
    })),
    timing: jest.fn((value: { _value: number }, config: { toValue: number }) => ({
      start: jest.fn((callback?: () => void) => {
        value._value = config.toValue;
        callback?.();
      }),
    })),
    parallel: jest.fn((animations: Array<{ start?: (cb?: () => void) => void }>) => ({
      start: jest.fn((callback?: () => void) => {
        animations.forEach((a) => a?.start?.());
        callback?.();
      }),
    })),
    loop: jest.fn().mockReturnValue({ start: jest.fn() }),
    sequence: jest.fn().mockReturnValue({ start: jest.fn() }),
    delay: jest.fn().mockReturnValue({ start: jest.fn() }),
    Easing: {
      linear: (t: number) => t,
      out: (fn: number) => fn,
      inOut: (fn: number) => fn,
      cubic: (t: number) => t * t * t,
    },
  }
}));

describe('animation hooks', () => {
  describe('useSpring', () => {
    it('should return spring function', () => {
      const { result } = renderHook(() => useSpring());
      expect(typeof result.current.spring).toBe('function');
    });

    it('should animate value to target', async () => {
      const { result } = renderHook(() => useSpring());
      const value = new Animated.Value(0);

      await act(async () => {
        await result.current.spring(value as unknown as Animated.Value, 100);
      });

      expect((value as unknown as { _value: number })._value).toBe(100);
    });
  });

  describe('useFadeIn', () => {
    it('should return opacity and fade functions', () => {
      const { result } = renderHook(() => useFadeIn());
      expect(result.current.opacity).toBeDefined();
      expect(typeof result.current.fadeIn).toBe('function');
      expect(typeof result.current.fadeOut).toBe('function');
    });
  });

  describe('useSlideUp', () => {
    it('should return translateY and slide functions', () => {
      const { result } = renderHook(() => useSlideUp());
      expect(result.current.translateY).toBeDefined();
      expect(typeof result.current.slideUp).toBe('function');
      expect(typeof result.current.slideDown).toBe('function');
    });
  });

  describe('useScale', () => {
    it('should return scale and scaleTo functions', () => {
      const { result } = renderHook(() => useScale());
      expect(result.current.scale).toBeDefined();
      expect(typeof result.current.scaleTo).toBe('function');
    });
  });
});
