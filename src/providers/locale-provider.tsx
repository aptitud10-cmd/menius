'use client';

import { createContext, useContext } from 'react';
import type { LandingLocale } from '@/lib/landing-translations';

const LocaleContext = createContext<LandingLocale>('es');

export const useLocale = () => useContext(LocaleContext);

export function LocaleProvider({ locale, children }: { locale: LandingLocale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
