/**
 * Server-side HMAC page token for order submission protection.
 *
 * When ORDER_TOKEN_SECRET (or NEXTAUTH_SECRET) is configured:
 *  - The checkout page generates a short-lived token server-side.
 *  - The token is embedded in the page HTML and sent with every order.
 *  - /api/orders verifies the token — direct bot calls without it are rejected.
 *
 * ORDER_TOKEN_SECRET must be set in production. Missing it causes a hard startup
 * error rather than silently bypassing bot protection.
 */

import { createHmac } from 'crypto';

const SECRET = (process.env.ORDER_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET ?? '').trim();

if (!SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('[order-token] ORDER_TOKEN_SECRET is not set. Add it in Vercel → Settings → Environment Variables.');
}

/** 1-hour rolling windows — a token is valid for current and previous window. */
const WINDOW_SEC = 3600;

function win(): number {
  return Math.floor(Date.now() / (WINDOW_SEC * 1000));
}

function sign(restaurantId: string, window: number): string {
  return createHmac('sha256', SECRET || 'menius-internal-v1')
    .update(`menius:order:${restaurantId}:${window}`)
    .digest('hex')
    .slice(0, 40);
}

/** Generate a token to embed in the server-rendered checkout page. */
export function generateOrderToken(restaurantId: string): string {
  if (!SECRET) return '';
  return sign(restaurantId, win());
}

/**
 * Verify a token submitted with an order request.
 * - In development/test without SECRET: returns true (allows local testing).
 * - In production without SECRET: never reached (startup throws above).
 * - Returns true when the token matches the current or previous 1-hour window.
 */
export function verifyOrderToken(
  token: string | undefined | null,
  restaurantId: string,
): boolean {
  if (!SECRET) return process.env.NODE_ENV !== 'production';
  if (!token || typeof token !== 'string' || token.length < 40) return false;
  const w = win();
  return token === sign(restaurantId, w) || token === sign(restaurantId, w - 1);
}
