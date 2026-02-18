'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getDashboardTranslations, type DashboardLocale, type DashboardTranslations } from '@/lib/dashboard-translations';

interface DashboardLocaleContextType {
  locale: DashboardLocale;
  setLocale: (locale: DashboardLocale) => void;
  t: DashboardTranslations;
}

const DashboardLocaleContext = createContext<DashboardLocaleContextType>({
  locale: 'es',
  setLocale: () => {},
  t: getDashboardTranslations('es'),
});

const STORAGE_KEY = 'menius-dashboard-locale';

export function DashboardLocaleProvider({
  children,
  defaultLocale = 'es',
}: {
  children: ReactNode;
  defaultLocale?: DashboardLocale;
}) {
  const [locale, setLocaleState] = useState<DashboardLocale>(() => {
    if (typeof window === 'undefined') return defaultLocale;
    const stored = localStorage.getItem(STORAGE_KEY) as DashboardLocale | null;
    return stored === 'en' || stored === 'es' ? stored : defaultLocale;
  });

  const setLocale = useCallback((newLocale: DashboardLocale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale);
    }
  }, []);

  const t = getDashboardTranslations(locale);

  return (
    <DashboardLocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </DashboardLocaleContext.Provider>
  );
}

export function useDashboardLocale() {
  return useContext(DashboardLocaleContext);
}
