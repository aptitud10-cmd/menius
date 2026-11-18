/**
 * How a restaurant reaches MENIUS support. One place, so the Counter's Help
 * sheet, the dashboard and emails never disagree about the number.
 *
 * `phoneE164` empty → the Help sheet shows email only (no dead call/WhatsApp
 * buttons). Digits only after the "+", e.g. "+17185550123".
 */
export const SUPPORT_CONTACT = {
  email: 'soporte@menius.app',
  phoneE164: '',
  /** How the number is written for people, e.g. "(718) 555-0123". */
  phoneDisplay: '',
} as const;

/** wa.me link with an optional first message already typed. */
export function supportWhatsAppUrl(text?: string): string | null {
  const digits = SUPPORT_CONTACT.phoneE164.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
