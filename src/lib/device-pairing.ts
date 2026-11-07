import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';

/**
 * Device pairing for the Counter tablet — see migration 20261107_device_pairings.sql.
 *
 * Alphabet: no I/L/1, O/Q/0 — they get misread off a tablet across the counter
 * (the Bricolage "Q" reads as an underlined "O"). 30 symbols ^ 6 ≈ 729M codes; with
 * a 5-minute life and a per-user approve rate limit, guessing a live code is not a
 * practical attack — and even a correct guess only lets you APPROVE someone else's
 * tablet into YOUR restaurant, never take a session.
 */
import { PAIRING_ALPHABET, PAIRING_CODE_LENGTH } from './device-pairing-alphabet';

export { PAIRING_ALPHABET, PAIRING_CODE_LENGTH };
/** How long a fresh code can wait for the owner to approve it. */
export const PAIRING_TTL_MS = 5 * 60 * 1000;
/** After approval, how long the tablet has to come and claim the session. */
export const CLAIM_TTL_MS = 2 * 60 * 1000;

export function generatePairingCode(): string {
  let out = '';
  for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
    out += PAIRING_ALPHABET[randomInt(PAIRING_ALPHABET.length)];
  }
  return out;
}

/**
 * Accepts what a human types: "k7m-4px", "K7M 4PX", "k7m4px". Returns the canonical
 * 6-char code, or null when it can't possibly be one (wrong length or a symbol that
 * is not in the alphabet — e.g. an O typed for a 0 is rejected, not silently fixed,
 * because neither exists in the alphabet).
 */
export function normalizePairingCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== PAIRING_CODE_LENGTH) return null;
  for (const ch of code) {
    if (!PAIRING_ALPHABET.includes(ch)) return null;
  }
  return code;
}

/** The secret only the tablet holds. 32 bytes, base64url (43 chars). */
export function generateDeviceSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function hashDeviceSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

/** Constant-time compare of a presented secret against the stored hash. */
export function deviceSecretMatches(secret: unknown, storedHash: string): boolean {
  if (typeof secret !== 'string' || secret.length < 32 || secret.length > 128) return false;
  const a = Buffer.from(hashDeviceSecret(secret), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** "K7M4PX" → "K7M-4PX" for display and for the dashboard input. */
export function formatPairingCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}
