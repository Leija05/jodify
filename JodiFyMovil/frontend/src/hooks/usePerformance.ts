import { useCallback, useRef, useEffect, useState } from 'react';
import { InteractionManager, Platform } from 'react-native';

export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: any[]) => callbackRef.current(...args)) as T,
    []
  );
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const debouncedCallback = useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): T {
  const lastRun = useRef<number>(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: any[]) => {
      const now = Date.now();
      if (now - lastRun.current >= limit) {
        lastRun.current = now;
        callbackRef.current(...args);
      }
    }) as T,
    [limit]
  );
}

export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        setIsIntersecting(entry.isIntersecting);
      });
    }, options);

    const element = elementRef.current;
    if (element) {
      observerRef.current.observe(element);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [options]);

  return { ref: elementRef, isIntersecting };
}

export function useLazyImage(
  src: string,
  placeholder?: string
) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;

    let mounted = true;
    const img = new Image();
    img.src = src;

    img.onload = () => {
      if (mounted) {
        setImageSrc(src);
        setIsLoaded(true);
      }
    };

    img.onerror = () => {
      if (mounted) {
        setError(true);
      }
    };

    return () => {
      mounted = false;
    };
  }, [src]);

  return { imageSrc, isLoaded, error };
}

export function useOnInteraction(
  callback: () => void,
  delay: number = 200
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        callbackRef.current();
      }, delay);
    });

    return () => task.cancel();
  }, [delay]);
}

export function useMemoryMonitor(
  onWarning?: (usage: number) => void,
  interval: number = 5000
) {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const intervalId = setInterval(() => {
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        if (usedMB > 100 && onWarning) {
          onWarning(usedMB);
        }
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, [onWarning, interval]);
}

export function useRenderCount() {
  const count = useRef(0);
  count.current++;
  return count.current;
}

export function useWhyDidYouUpdate(
  name: string,
  props: Record<string, any>
) {
  const previousProps = useRef(props);

  useEffect(() => {
    const allKeys = Object.keys({ ...previousProps.current, ...props });
    const changes: Record<string, { from: any; to: any }> = {};

    allKeys.forEach((key) => {
      if (previousProps.current[key] !== props[key]) {
        changes[key] = {
          from: previousProps.current[key],
          to: props[key],
        };
      }
    });

    if (Object.keys(changes).length > 0) {
      console.log(`[${name}] props changed:`, changes);
    }

    previousProps.current = props;
  });
}

export function useIsMounted() {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}