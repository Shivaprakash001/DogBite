'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCopy, isLocale, type Copy, type Locale } from '@/content/copy';
import { track } from '@/lib/events';

interface LocaleApi {
  locale: Locale;
  setLocale: (l: Locale) => void;
  copy: Copy;
}

const LocaleContext = createContext<LocaleApi | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sq_locale');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate a per-device preference after mount
      if (isLocale(saved)) setLocaleState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.documentElement.lang = l;
    try {
      localStorage.setItem('sq_locale', l);
      document.cookie = `sq_locale=${l}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {
      /* ignore */
    }
    track('locale_change', { locale: l });
  }, []);

  const api = useMemo(() => ({ locale, setLocale, copy: getCopy(locale) }), [locale, setLocale]);
  return <LocaleContext.Provider value={api}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleApi {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}

export function useCopy(): Copy {
  return useLocale().copy;
}
