'use client';

import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { cn } from '@/lib/utils';

export function LocaleSwitcher() {
  const { locale, setLocale } = useDashboardLocale();

  return (
    <button
      onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider',
        'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors',
        'border border-gray-200 flex-shrink-0'
      )}
      title={locale === 'es' ? 'Switch to English' : 'Cambiar a Español'}
    >
      {locale === 'es' ? 'EN' : 'ES'}
    </button>
  );
}
