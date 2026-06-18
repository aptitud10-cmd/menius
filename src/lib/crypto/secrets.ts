import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { requireEnv } from '@/lib/env';

/**
 * Symmetric encryption for secrets stored at rest in the DB (e.g. per-restaurant
 * Wompi integrity/events secrets — financial credentials that must NEVER be
 * stored in plaintext nor reach the client).
 *
 * Uses AES-256-GCM (authenticated encryption): tampering with the ciphertext is
 * detected on decrypt. The master key comes from SECRETS_ENCRYPTION_KEY (set in
 * Vercel). A random 16-byte salt + 12-byte IV are generated per encryption, so
 * the same plaintext never produces the same ciphertext.
 *
 * Stored format (single string, safe for a text column):
 *   v1:<salt_hex>:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 *
 * Only the SERVER ever calls these — the master key never leaves the backend.
 */

const ALGO = 'aes-256-gcm';
const SALT_LEN = 16;
const IV_LEN = 12;
const KEY_LEN = 32;
const VERSION = 'v1';

function deriveKey(salt: Buffer): Buffer {
  // The master key may be any length; scrypt stretches it to 32 bytes with the
  // per-record salt so two records with the same plaintext differ.
  const master = requireEnv('SECRETS_ENCRYPTION_KEY');
  return scryptSync(master, salt, KEY_LEN);
}

/** Encrypt a plaintext secret. Returns the stored-format string, or '' for empty input. */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(salt);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    VERSION,
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    ciphertext.toString('hex'),
  ].join(':');
}

/**
 * Decrypt a stored-format string back to plaintext. Returns '' for empty input.
 * Throws if the blob is malformed or fails the GCM auth check (tampered / wrong key).
 */
export function decryptSecret(blob: string): string {
  if (!blob) return '';
  const parts = blob.split(':');
  if (parts.length !== 5 || parts[0] !== VERSION) {
    throw new Error('decryptSecret: malformed or unsupported ciphertext');
  }
  const [, saltHex, ivHex, tagHex, dataHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const key = deriveKey(salt);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
