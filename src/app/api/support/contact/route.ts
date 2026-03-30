export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/notifications/email';

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, email, message } = body;
  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('[support/contact] ADMIN_EMAIL not set');
    return NextResponse.json({ error: 'Support email not configured' }, { status: 500 });
  }

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#111827;">📩 Nuevo mensaje de soporte</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">Recibido desde menius.app/support</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;width:80px;vertical-align:top;">Nombre</td><td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;">${name}</td></tr>
      <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;vertical-align:top;">Email</td><td style="padding:8px 0;font-size:13px;"><a href="mailto:${email}" style="color:#7c3aed;">${email}</a></td></tr>
      <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;vertical-align:top;">Mensaje</td><td style="padding:8px 0;font-size:14px;color:#111827;line-height:1.6;">${message.replace(/\n/g, '<br/>')}</td></tr>
    </table>
    <a href="mailto:${email}?subject=Re: Tu mensaje a MENIUS" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#7c3aed;color:#fff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;">Responder a ${name}</a>
  </div>
</body></html>`;

  const sent = await sendEmail({
    to: adminEmail,
    from: 'Soporte MENIUS <soporte@menius.app>',
    subject: `[MENIUS Support] New message from ${name}`,
    html,
    replyTo: email,
  });

  if (!sent) {
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
