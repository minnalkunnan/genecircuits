import React, { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Appearance = 'dark' | 'light';

const STORAGE_KEY = 'genecircuits-theme';

type ThemeContextType = {
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
  toggleAppearance: () => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

/** Dark is the default; a saved choice wins. */
function readInitialAppearance(): Appearance {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [appearance, setAppearance] = useState<Appearance>(readInitialAppearance);

  // Mirror the choice onto <html> so plain CSS (and the embedded simulator) can follow it.
  useEffect(() => {
    document.documentElement.dataset.theme = appearance;
    try {
      window.localStorage.setItem(STORAGE_KEY, appearance);
    } catch {
      /* storage can be unavailable; the choice just won't persist */
    }
  }, [appearance]);

  // The embedded Reaction-Diffusion page has its own Settings button and reports changes here.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (data && data.type === 'genecircuits-theme' && (data.theme === 'light' || data.theme === 'dark')) {
        setAppearance(data.theme);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const toggleAppearance = useCallback(() => setAppearance((a) => (a === 'dark' ? 'light' : 'dark')), []);
  const value = useMemo(() => ({ appearance, setAppearance, toggleAppearance }), [appearance, toggleAppearance]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useAppearance(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppearance must be used within a ThemeProvider');
  return ctx;
}
