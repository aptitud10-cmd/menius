export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('inbound-email');

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
    const forwardTo = process.env.FORWARD_TO_EMAIL;
    const apiKey = (process.env.RESEND_API_KEY ?? '').trim();

    if (!apiKey) {
      logger.error('RESEND_API_KEY not configured');
      return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }

    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify Resend webhook signature using svix headers
    if (webhookSecret) {
      const svixId = request.headers.get('svix-id');
      const svixTimestamp = request.headers.get('svix-timestamp');
      const svixSignature = request.headers.get('svix-signature');

      if (!svixId || !svixTimestamp || !svixSignature) {
        logger.warn('Missing svix headers — rejecting request');
        return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
      }

      // Manual HMAC verification (no extra dependency needed)
      const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
      const secret = webhookSecret.startsWith('whsec_')
        ? Buffer.from(webhookSecret.slice(6), 'base64')
        : Buffer.from(webhookSecret, 'base64');

      const { createHmac } = await import('crypto');
      const expectedSig = createHmac('sha256', secret).update(signedContent).digest('base64');
      const signatures = svixSignature.split(' ').map((s) => s.replace(/^v1,/, ''));

      const isValid = signatures.some((sig) => sig === expectedSig);
      if (!isValid) {
        logger.warn('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);
    logger.info('Inbound email event received', { type: event.type });

    if (event.type !== 'email.received') {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const emailId: string = event.data?.email_id;
    const from: string = event.data?.from ?? 'unknown';
    const to: string[] = event.data?.to ?? [];
    const subject: string = event.data?.subject ?? '(sin asunto)';

    const escHtml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    logger.info('Email received', { from, to, subject, emailId });

    if (!forwardTo) {
      logger.warn('FORWARD_TO_EMAIL not set — skipping forward');
      return NextResponse.json({ ok: true, forwarded: false });
    }

    // Forward via Resend API
    const forwardRes = await fetch(`https://api.resend.com/emails/${emailId}/forward`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: forwardTo }),
    });

    if (!forwardRes.ok) {
      // Fallback: send a notification email if forward API fails
      logger.warn('Forward API failed, sending notification email', { status: forwardRes.status });

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'MENIUS Notificaciones <notificaciones@menius.app>',
          to: forwardTo,
          subject: `📬 Nuevo email en MENIUS: ${subject}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
              <h2 style="color:#059669;margin:0 0 16px;">📬 Nuevo mensaje recibido</h2>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr><td style="padding:6px 0;color:#6b7280;width:80px;">De:</td><td style="padding:6px 0;color:#111827;">${escHtml(from)}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;">Para:</td><td style="padding:6px 0;color:#111827;">${escHtml(to.join(', '))}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;">Asunto:</td><td style="padding:6px 0;color:#111827;font-weight:600;">${escHtml(subject)}</td></tr>
              </table>
              <p style="margin:20px 0 8px;font-size:13px;color:#9ca3af;">
                Para ver el contenido completo del email, revisa tu bandeja de entrada en 
                <a href="https://app.resend.com" style="color:#059669;">app.resend.com</a> → Emails → Receiving.
              </p>
              <p style="font-size:11px;color:#d1d5db;margin-top:24px;">MENIUS — Sistema de notificaciones internas</p>
            </div>
          `,
        }),
      });
    } else {
      logger.info('Email forwarded successfully', { to: forwardTo });
    }

    return NextResponse.json({ ok: true, forwarded: true });
  } catch (err) {
    logger.error('Inbound email webhook error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
