export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const to = body.to ?? 'test@example.com';
  const subject = body.subject ?? '✅ MENIUS email test';
  const customBody = body.body as string | undefined;

  const apiKey = (process.env.RESEND_API_KEY ?? '').trim();
  const adminEmail = process.env.ADMIN_EMAIL ?? 'no configurado';

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      reason: 'RESEND_API_KEY is not set or empty',
      env_check: {
        RESEND_API_KEY: 'MISSING',
        ADMIN_EMAIL: adminEmail,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'not set',
      },
    });
  }

  const html = customBody
    ? `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><p style="white-space:pre-wrap;">${customBody.replace(/</g, '&lt;')}</p><hr style="margin:20px 0;border:none;border-top:1px solid #eee;"><p style="color:#999;font-size:12px;">Enviado desde MENIUS Admin · soporte@menius.app</p></div>`
    : '<p>This is a test email from MENIUS. If you received this, email is working correctly.</p>';

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
        subject,
        html,
      }),
    });

    const responseBody = await res.json().catch(() => ({}));

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      resend_response: responseBody,
      key_prefix: apiKey.slice(0, 8) + '...',
      sent_to: to,
      admin_email_env: adminEmail,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      key_prefix: apiKey.slice(0, 8) + '...',
    });
  }
}
