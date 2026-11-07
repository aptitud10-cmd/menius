/**
 * Client-safe pairing constants (no node:crypto) — shared by the server helpers in
 * device-pairing.ts and the owner's code-entry screen.
 * No I/L/1, O/Q/0: they get misread off a tablet across the counter.
 */
export const PAIRING_ALPHABET = 'ABCDEFGHJKMNPRSTUVWXYZ23456789';
export const PAIRING_CODE_LENGTH = 6;
