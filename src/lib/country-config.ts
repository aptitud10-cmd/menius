/**
 * Single source of truth: country_code (ISO 3166-1 alpha-2) → locale config.
 * country_code on the restaurants table drives currency, timezone, phone prefix,
 * and Intl locale. Never derive these independently from each other.
 */

export interface CountryConfig {
  name: string;
  flag: string;
  currency: string;       // ISO 4217
  locale: string;         // BCP 47 for Intl formatting
  timezone: string;       // IANA tz
  phonePrefix: string;    // E.164 calling code (without +)
  menuLocale: 'es' | 'en'; // default menu language
}

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  MX: { name: 'México',           flag: '🇲🇽', currency: 'MXN', locale: 'es-MX', timezone: 'America/Mexico_City',                   phonePrefix: '52', menuLocale: 'es' },
  CO: { name: 'Colombia',         flag: '🇨🇴', currency: 'COP', locale: 'es-CO', timezone: 'America/Bogota',                         phonePrefix: '57', menuLocale: 'es' },
  PE: { name: 'Perú',             flag: '🇵🇪', currency: 'PEN', locale: 'es-PE', timezone: 'America/Lima',                           phonePrefix: '51', menuLocale: 'es' },
  CL: { name: 'Chile',            flag: '🇨🇱', currency: 'CLP', locale: 'es-CL', timezone: 'America/Santiago',                       phonePrefix: '56', menuLocale: 'es' },
  AR: { name: 'Argentina',        flag: '🇦🇷', currency: 'ARS', locale: 'es-AR', timezone: 'America/Argentina/Buenos_Aires',         phonePrefix: '54', menuLocale: 'es' },
  DO: { name: 'Rep. Dominicana',  flag: '🇩🇴', currency: 'DOP', locale: 'es-DO', timezone: 'America/Santo_Domingo',                  phonePrefix: '1',  menuLocale: 'es' },
  EC: { name: 'Ecuador',          flag: '🇪🇨', currency: 'USD', locale: 'es-EC', timezone: 'America/Guayaquil',                      phonePrefix: '593',menuLocale: 'es' },
  GT: { name: 'Guatemala',        flag: '🇬🇹', currency: 'GTQ', locale: 'es-GT', timezone: 'America/Guatemala',                      phonePrefix: '502',menuLocale: 'es' },
  HN: { name: 'Honduras',         flag: '🇭🇳', currency: 'HNL', locale: 'es-HN', timezone: 'America/Tegucigalpa',                    phonePrefix: '504',menuLocale: 'es' },
  SV: { name: 'El Salvador',      flag: '🇸🇻', currency: 'USD', locale: 'es-SV', timezone: 'America/El_Salvador',                    phonePrefix: '503',menuLocale: 'es' },
  NI: { name: 'Nicaragua',        flag: '🇳🇮', currency: 'NIO', locale: 'es-NI', timezone: 'America/Managua',                        phonePrefix: '505',menuLocale: 'es' },
  CR: { name: 'Costa Rica',       flag: '🇨🇷', currency: 'CRC', locale: 'es-CR', timezone: 'America/Costa_Rica',                     phonePrefix: '506',menuLocale: 'es' },
  PA: { name: 'Panamá',           flag: '🇵🇦', currency: 'PAB', locale: 'es-PA', timezone: 'America/Panama',                         phonePrefix: '507',menuLocale: 'es' },
  VE: { name: 'Venezuela',        flag: '🇻🇪', currency: 'VES', locale: 'es-VE', timezone: 'America/Caracas',                        phonePrefix: '58', menuLocale: 'es' },
  PY: { name: 'Paraguay',         flag: '🇵🇾', currency: 'PYG', locale: 'es-PY', timezone: 'America/Asuncion',                       phonePrefix: '595',menuLocale: 'es' },
  UY: { name: 'Uruguay',          flag: '🇺🇾', currency: 'UYU', locale: 'es-UY', timezone: 'America/Montevideo',                     phonePrefix: '598',menuLocale: 'es' },
  BO: { name: 'Bolivia',          flag: '🇧🇴', currency: 'BOB', locale: 'es-BO', timezone: 'America/La_Paz',                         phonePrefix: '591',menuLocale: 'es' },
  ES: { name: 'España',           flag: '🇪🇸', currency: 'EUR', locale: 'es-ES', timezone: 'Europe/Madrid',                          phonePrefix: '34', menuLocale: 'es' },
  BR: { name: 'Brasil',           flag: '🇧🇷', currency: 'BRL', locale: 'pt-BR', timezone: 'America/Sao_Paulo',                      phonePrefix: '55', menuLocale: 'es' },
  US: { name: 'United States',    flag: '🇺🇸', currency: 'USD', locale: 'en-US', timezone: 'America/New_York',                       phonePrefix: '1',  menuLocale: 'en' },
  CA: { name: 'Canada',           flag: '🇨🇦', currency: 'CAD', locale: 'en-CA', timezone: 'America/Toronto',                        phonePrefix: '1',  menuLocale: 'en' },
  GB: { name: 'United Kingdom',   flag: '🇬🇧', currency: 'GBP', locale: 'en-GB', timezone: 'Europe/London',                          phonePrefix: '44', menuLocale: 'en' },
  DE: { name: 'Deutschland',      flag: '🇩🇪', currency: 'EUR', locale: 'de-DE', timezone: 'Europe/Berlin',                          phonePrefix: '49', menuLocale: 'en' },
  FR: { name: 'France',           flag: '🇫🇷', currency: 'EUR', locale: 'fr-FR', timezone: 'Europe/Paris',                           phonePrefix: '33', menuLocale: 'en' },
  IT: { name: 'Italia',           flag: '🇮🇹', currency: 'EUR', locale: 'it-IT', timezone: 'Europe/Rome',                            phonePrefix: '39', menuLocale: 'en' },
  AU: { name: 'Australia',        flag: '🇦🇺', currency: 'AUD', locale: 'en-AU', timezone: 'Australia/Sydney',                       phonePrefix: '61', menuLocale: 'en' },
};

/** Sorted list for dropdowns — LatAm first, then others */
export const COUNTRY_CONFIG_LIST = [
  ...['MX','CO','PE','CL','AR','DO','EC','GT','HN','SV','NI','CR','PA','VE','PY','UY','BO','ES','BR'].map(
    (c) => ({ code: c, ...COUNTRY_CONFIGS[c] })
  ),
  ...['US','CA','GB','DE','FR','IT','AU'].map(
    (c) => ({ code: c, ...COUNTRY_CONFIGS[c] })
  ),
];

/** O(1) reverse map: currency code → first matching country config (LatAm-first ordering) */
const CURRENCY_TO_CONFIG: Record<string, typeof COUNTRY_CONFIG_LIST[number]> = {};
for (const c of COUNTRY_CONFIG_LIST) {
  if (!CURRENCY_TO_CONFIG[c.currency]) CURRENCY_TO_CONFIG[c.currency] = c;
}

/** Deduplicated currency list for dropdowns (one entry per ISO 4217 code) */
export const UNIQUE_CURRENCIES = Object.values(CURRENCY_TO_CONFIG);

/** Format IANA timezone string as a readable city name: "America/Buenos_Aires" → "Buenos Aires" */
export function formatTimezone(tz: string): string {
  return tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
}

/** Format a monetary amount using the correct locale and symbol for a country code. */
export function formatCurrency(amount: number, countryCode: string): string {
  const config = COUNTRY_CONFIGS[countryCode];
  if (!config) return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    currencyDisplay: 'symbol',
  }).format(amount);
}

/** Format a monetary amount when only the ISO 4217 currency code is known (not the country). */
export function formatCurrencyByCode(amount: number, currencyCode: string): string {
  const entry = CURRENCY_TO_CONFIG[currencyCode];
  return new Intl.NumberFormat(entry?.locale ?? 'en-US', {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'symbol',
  }).format(amount);
}

/** Derive country_code from legacy currency field (best-effort for existing records) */
export function inferCountryFromCurrency(currency: string): string {
  const map: Record<string, string> = {
    MXN: 'MX', COP: 'CO', PEN: 'PE', CLP: 'CL', ARS: 'AR',
    DOP: 'DO', BRL: 'BR', GBP: 'GB', CAD: 'CA', AUD: 'AU',
    EUR: 'ES',
    USD: 'US',
  };
  return map[currency] ?? 'MX';
}
