import type { ContentTranslation } from '@/types';

export const SUPPORTED_LOCALES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
] as const;

export function getLocaleLabel(code: string): string {
  return SUPPORTED_LOCALES.find((l) => l.code === code)?.label ?? code;
}

export function getLocaleFlag(code: string): string {
  return SUPPORTED_LOCALES.find((l) => l.code === code)?.flag ?? '🌐';
}

/**
 * Resolve a translated field for a given locale.
 * Falls back to the original field value if no translation exists.
 */
export function t(
  translations: Record<string, ContentTranslation> | undefined,
  field: keyof ContentTranslation,
  locale: string,
  fallback: string,
): string {
  if (!translations || !locale) return fallback;
  const tr = translations[locale];
  if (!tr) return fallback;
  const value = tr[field];
  return value && value.trim() ? value : fallback;
}

/**
 * Resolve translated name for a product or category.
 */
export function tName(
  item: { name: string; translations?: Record<string, ContentTranslation> },
  locale: string,
  defaultLocale: string,
): string {
  if (locale === defaultLocale) return item.name;
  return t(item.translations, 'name', locale, item.name);
}

/**
 * Resolve translated description for a product.
 */
export function tDesc(
  item: { description?: string; translations?: Record<string, ContentTranslation> },
  locale: string,
  defaultLocale: string,
): string {
  const fallback = item.description ?? '';
  if (locale === defaultLocale) return fallback;
  return t(item.translations, 'description', locale, fallback);
}
