import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * PIN del dueño para abrir el panel desde la tablet del Counter (brief sección 7).
 *
 * Se guarda con scrypt + sal aleatoria (función de derivación lenta y con memoria,
 * de la misma familia que bcrypt/argon2, incluida en Node: sin dependencias). Un
 * PIN de 4-6 dígitos tiene pocas combinaciones: lo que lo protege de verdad es que
 * el hash solo lo lee el servidor y que al 5.º error se bloquea 5 min.
 */

export { PANEL_UNLOCK_MINUTES, PIN_MAX_ATTEMPTS, isValidPin, panelUnlockUntil } from './panel-pin-shared';

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;

function scrypt(pin: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(pin, salt, KEYLEN, opts, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** "scrypt$N$r$p$sal$hash" (sal y hash en base64). */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pin, salt, { N, r: R, p: P });
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  if (expected.length !== KEYLEN) return false;
  try {
    const key = await scrypt(pin, Buffer.from(saltB64, 'base64'), { N: Number(n), r: Number(r), p: Number(p) });
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}
