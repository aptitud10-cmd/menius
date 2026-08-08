/**
 * Telegram alerts to the MENIUS operator (William).
 *
 * Internal ops channel — NOT customer-facing. Used to get a phone push the
 * moment something important happens: a new subscription, a failed payment,
 * a critical error.
 *
 * Setup (one-time):
 *   1. Talk to @BotFather → /newbot → get TELEGRAM_BOT_TOKEN
 *   2. Message the new bot once, then ask @userinfobot for your TELEGRAM_CHAT_ID
 *   3. Set both env vars in Vercel.
 *
 * Fire-and-forget: never throws, never blocks the caller. If the env vars are
 * missing it silently no-ops, so the app works fine without Telegram configured.
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('telegram');

export type TelegramLevel = 'info' | 'warn' | 'error';

const ICON: Record<TelegramLevel, string> = {
  info: '🟢',
  warn: '🟡',
  error: '🔴',
};

/**
 * Repeat suppression. captureError() routes to Telegram from 56 call-sites, and
 * the failures worth alerting about are exactly the ones that repeat on every
 * request: a broken cron, a column that doesn't exist, Stripe down. Without this
 * a single such failure means hundreds of identical pushes, and Telegram rate
 * limits the bot (429) — so the flood also costs the alerts that matter.
 *
 * In-memory on purpose: this runs on the failure path, where a DB round-trip to
 * dedupe would add latency exactly when things are already broken. A serverless
 * instance keeps this map while warm, which is the window a burst lives in.
 * Worst case across cold instances is one push each, not hundreds.
 */
const WINDOW_MS = 10 * 60 * 1000;
const lastSent = new Map<string, number>();
const MAX_KEYS = 200;

function shouldSend(key: string, now: number): boolean {
  const previous = lastSent.get(key);
  if (previous !== undefined && now - previous < WINDOW_MS) return false;

  // Drop entries that aged out before checking the cap, so a long-lived instance
  // doesn't evict live keys just because old ones are still sitting there.
  // forEach rather than for..of: the project's TS target predates
  // downlevelIteration, so iterating a Map directly doesn't compile.
  if (lastSent.size >= MAX_KEYS) {
    const stale: string[] = [];
    lastSent.forEach((t, k) => {
      if (now - t >= WINDOW_MS) stale.push(k);
    });
    stale.forEach((k) => lastSent.delete(k));

    // Still full: every key is recent. Evict the oldest to stay bounded.
    if (lastSent.size >= MAX_KEYS) {
      let oldestKey: string | null = null;
      let oldestAt = Infinity;
      lastSent.forEach((t, k) => {
        if (t < oldestAt) { oldestAt = t; oldestKey = k; }
      });
      if (oldestKey !== null) lastSent.delete(oldestKey);
    }
  }

  lastSent.set(key, now);
  return true;
}

/**
 * Send a message to the operator's Telegram. Returns false (without throwing)
 * if Telegram isn't configured, the message was suppressed as a repeat, or the
 * send fails.
 *
 * `dedupeKey` groups messages that mean the same thing. Omit it and the message
 * text is used, which is right when the text is already stable; pass one when the
 * text carries varying detail (an order id, a timestamp) that would otherwise
 * defeat the suppression.
 */
export async function sendTelegramAlert(
  text: string,
  level: TelegramLevel = 'info',
  dedupeKey?: string,
): Promise<boolean> {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID ?? '').trim();

  // Not configured → silent no-op. The app must work without Telegram.
  if (!token || !chatId) return false;

  if (!shouldSend(`${level}:${dedupeKey ?? text}`, Date.now())) return false;

  const body = `${ICON[level]} ${text}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: body,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      // Don't capture this to Sentry — error alerts route through here, so a
      // failure here logging to Sentry that then alerts here would loop.
      logger.warn('Telegram sendMessage failed', { status: res.status });
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('Telegram network error', { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
