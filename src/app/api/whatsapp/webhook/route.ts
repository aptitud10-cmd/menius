export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { handleIncomingMessage } from '@/lib/whatsapp/agent';
import { createLogger } from '@/lib/logger';

const logger = createLogger('whatsapp-webhook');
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify Meta's X-Hub-Signature-256 header when APP_SECRET is configured.
    // Without this, anyone can forge WhatsApp messages and trigger the AI agent.
    if (APP_SECRET) {
      const signature = request.headers.get('x-hub-signature-256') ?? '';
      const expected = `sha256=${createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')}`;
      const sigBuf = Buffer.from(signature.padEnd(expected.length));
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        logger.warn('WhatsApp webhook signature mismatch — request rejected');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      logger.warn('WHATSAPP_APP_SECRET not set — skipping signature verification (configure in production)');
    }

    const body = JSON.parse(rawBody);

    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.length) {
      return NextResponse.json({ status: 'no_message' });
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];
    const from = message.from as string;
    const text = (message.text?.body ?? '') as string;
    const name = (contact?.profile?.name ?? '') as string;
    const messageId = (message.id ?? '') as string;

    if (!from || !text) {
      return NextResponse.json({ status: 'ignored' });
    }

    // WhatsApp delivers at-least-once — deduplicate by message ID via Redis
    if (messageId) {
      try {
        const { getRedisForWebhook } = await import('@/lib/whatsapp/agent');
        const r = getRedisForWebhook();
        if (r) {
          const dedupeKey = `wa:msg:${messageId}`;
          const already = await r.set(dedupeKey, '1', { ex: 300, nx: true });
          if (already === null) {
            return NextResponse.json({ status: 'duplicate' });
          }
        }
      } catch {
        // Non-blocking — if Redis unavailable, process anyway
      }
    }

    await handleIncomingMessage({ from, text, name, messageId });

    return NextResponse.json({ status: 'processed' });
  } catch (err) {
    logger.error('WhatsApp webhook error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}
