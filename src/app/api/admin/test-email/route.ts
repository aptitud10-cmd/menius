export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const to = body.to ?? 'test@example.com';

  const apiKey = (process.env.RESEND_API_KEY ?? '').trim();

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      reason: 'RESEND_API_KEY is not set or empty',
      env_check: {
        RESEND_API_KEY: 'MISSING',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'not set',
      },
    });
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MENIUS <noreply@menius.app>',
        to: [to],
        subject: '✅ MENIUS email test',
        html: '<p>This is a test email from MENIUS. If you received this, email is working correctly.</p>',
      }),
    });

    const responseBody = await res.json().catch(() => ({}));

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      resend_response: responseBody,
      key_prefix: apiKey.slice(0, 8) + '...',
      sent_to: to,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      key_prefix: apiKey.slice(0, 8) + '...',
    });
  }
}
