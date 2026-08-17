import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useSettingsStore } from '../store/settings.store';

const ThemeContext = createContext<{ theme: 'dark' | 'light' }>({ theme: 'dark' });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    root.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#050505' : '#f0f2f5');
    const timer = setTimeout(() => root.classList.remove('theme-transitioning'), 500);
    return () => clearTimeout(timer);
  }, [theme]);

  const value = useMemo(() => ({ theme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): { theme: 'dark' | 'light' } {
  return useContext(ThemeContext);
}
