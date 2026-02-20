export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/agent';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';

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
    const body = await request.json();

    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.length) {
      return NextResponse.json({ status: 'no_message' });
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];
    const from = message.from;
    const text = message.text?.body ?? '';
    const name = contact?.profile?.name ?? '';

    if (!from || !text) {
      return NextResponse.json({ status: 'ignored' });
    }

    await handleIncomingMessage({ from, text, name });

    return NextResponse.json({ status: 'processed' });
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}
