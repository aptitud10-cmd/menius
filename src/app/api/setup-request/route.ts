export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('setup-request');

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = checkRateLimit(`setup:${ip}`, { limit: 5, windowSec: 3600 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta en 1 hora.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, email, phone, restaurant_name, package_id, package_name, package_price, current_menu, message } = body;

    if (!name || !email || !restaurant_name || !package_id) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.SETUP_NOTIFY_EMAIL || process.env.RESEND_FROM_EMAIL;

    if (resendKey && notifyEmail) {
      const s = {
        name: escapeHtml(String(name)),
        email: escapeHtml(String(email)),
        phone: escapeHtml(String(phone || 'No proporcionado')),
        restaurant: escapeHtml(String(restaurant_name)),
        pkg: escapeHtml(String(package_name)),
        price: escapeHtml(String(package_price)),
        menu: escapeHtml(String(current_menu || 'No especificado')),
        msg: escapeHtml(String(message || 'Sin mensaje adicional')),
      };

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'MENIUS <noreply@menius.app>',
            to: [notifyEmail],
            subject: `Nueva solicitud de Setup: ${s.restaurant} — ${s.pkg}`,
            html: `
              <h2>Nueva solicitud de Setup Profesional</h2>
              <table style="border-collapse:collapse;width:100%;max-width:600px;">
                <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Nombre</td><td style="padding:8px;border-bottom:1px solid #eee;">${s.name}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${s.email}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Teléfono</td><td style="padding:8px;border-bottom:1px solid #eee;">${s.phone}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Restaurante</td><td style="padding:8px;border-bottom:1px solid #eee;">${s.restaurant}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Plan</td><td style="padding:8px;border-bottom:1px solid #eee;">${s.pkg} ($${s.price})</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Menú actual</td><td style="padding:8px;border-bottom:1px solid #eee;">${s.menu}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Mensaje</td><td style="padding:8px;border-bottom:1px solid #eee;">${s.msg}</td></tr>
              </table>
              <p style="margin-top:16px;color:#666;font-size:14px;">Responder a este email para contactar al cliente: <a href="mailto:${s.email}">${s.email}</a></p>
            `,
            reply_to: email,
          }),
        });
      } catch (emailErr) {
        logger.error('Failed to send setup notification email', { error: emailErr instanceof Error ? emailErr.message : String(emailErr) });
      }
    }

    logger.info('Setup request received', { name, email, restaurant_name, package_name });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logger.error('Setup request error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: 'Error procesando la solicitud' },
      { status: 500 }
    );
  }
}
