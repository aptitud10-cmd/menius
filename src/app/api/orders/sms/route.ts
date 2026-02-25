import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

export async function POST(req: NextRequest) {
  try {
    if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
      return NextResponse.json({ error: 'SMS no configurado' }, { status: 503 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { to, message } = body;

    if (!to || !message) {
      return NextResponse.json({ error: 'Teléfono y mensaje requeridos' }, { status: 400 });
    }

    if (typeof message !== 'string' || message.length > 320) {
      return NextResponse.json({ error: 'Mensaje demasiado largo (max 320 chars)' }, { status: 400 });
    }

    const cleanPhone = to.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: 'Teléfono no válido' }, { status: 400 });
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`,
        From: TWILIO_FROM,
        Body: message,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[SMS API] Twilio error:', err);
      return NextResponse.json({ error: 'Error al enviar SMS' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[SMS API] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
