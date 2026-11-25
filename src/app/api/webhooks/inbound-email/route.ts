export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createLogger, maskEmail } from '@/lib/logger';

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

    // Sin secreto no se acepta nada: antes cualquiera podía hacerse reenviar
    // emails (falla abierto).
    if (!webhookSecret) {
      logger.error('RESEND_INBOUND_WEBHOOK_SECRET not configured — rejecting');
      return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }

    // Verify Resend webhook signature using svix headers
    {
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

    logger.info('Email received', { emailId, recipients: to.length });

    if (!forwardTo) {
      logger.warn('FORWARD_TO_EMAIL not set — skipping forward');
      return NextResponse.json({ ok: true, forwarded: false });
    }

    // Forward with the content. Resend's "forward" is an SDK helper, not a REST
    // endpoint (the old POST /emails/{id}/forward always failed and only the
    // subject-only notice below went out): fetch the received email and send
    // it on, with Reply-To set to the original sender so a reply goes to them.
    const forwarded = await forwardReceivedEmail({ apiKey, emailId, forwardTo, from, to, subject, escHtml });

    if (!forwarded) {
      // Fallback: send a notification email if the forward fails
      logger.warn('Forward failed, sending notification email', { emailId });

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
      logger.info('Email forwarded successfully', { to: maskEmail(forwardTo) });
    }

    return NextResponse.json({ ok: true, forwarded: true });
  } catch (err) {
    logger.error('Inbound email webhook error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** Email address inside "Name <addr>" (or the string itself). */
function bareAddress(v: string): string {
  const m = v.match(/<([^>]+)>/);
  return (m ? m[1] : v).trim();
}

/**
 * Fetch a received email (GET /emails/receiving/{id}) and send it to `forwardTo`
 * with its body. Attachments stay in Resend (listed by name). Never throws.
 */
async function forwardReceivedEmail(opts: {
  apiKey: string;
  emailId: string;
  forwardTo: string;
  from: string;
  to: string[];
  subject: string;
  escHtml: (s: string) => string;
}): Promise<boolean> {
  const { apiKey, emailId, forwardTo, from, to, subject, escHtml } = opts;
  try {
    if (!emailId) return false;
    const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      logger.warn('Could not fetch received email', { status: res.status });
      return false;
    }
    const mail = (await res.json()) as {
      html?: string | null;
      text?: string | null;
      attachments?: { filename?: string | null }[] | null;
    };
    const files = (mail.attachments ?? []).map((a) => a.filename).filter(Boolean) as string[];
    const body = mail.html
      ? mail.html
      : `<pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;">${escHtml(mail.text ?? '')}</pre>`;
    const header = `
      <div style="font-family:sans-serif;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;padding:0 0 12px;margin:0 0 16px;">
        <div><b>De:</b> ${escHtml(from)}</div>
        <div><b>Para:</b> ${escHtml(to.join(', '))}</div>
        ${files.length ? `<div><b>Adjuntos (en Resend → Receiving):</b> ${escHtml(files.join(', '))}</div>` : ''}
        <div style="color:#9ca3af;margin-top:6px;">Responder a este email le contesta directo al remitente.</div>
      </div>`;
    const replyTo = bareAddress(from);
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MENIUS Soporte <soporte@menius.app>',
        to: forwardTo,
        subject: `Fwd: ${subject}`,
        html: header + body,
        ...(replyTo.includes('@') ? { reply_to: [replyTo] } : {}),
      }),
    });
    if (!sendRes.ok) {
      logger.warn('Forward send failed', { status: sendRes.status });
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('Forward threw', { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
