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
 * Send a message to the operator's Telegram. Returns false (without throwing)
 * if Telegram isn't configured or the send fails.
 */
export async function sendTelegramAlert(
  text: string,
  level: TelegramLevel = 'info',
): Promise<boolean> {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID ?? '').trim();

  // Not configured → silent no-op. The app must work without Telegram.
  if (!token || !chatId) return false;

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
