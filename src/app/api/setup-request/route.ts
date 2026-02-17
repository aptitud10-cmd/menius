import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

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

    // Send notification email via Resend (if configured)
    const resendKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.SETUP_NOTIFY_EMAIL || process.env.RESEND_FROM_EMAIL;

    if (resendKey && notifyEmail) {
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
            subject: `🔔 Nueva solicitud de Setup: ${restaurant_name} — ${package_name}`,
            html: `
              <h2>Nueva solicitud de Setup Profesional</h2>
              <table style="border-collapse:collapse;width:100%;max-width:600px;">
                <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Nombre</td><td style="padding:8px;border-bottom:1px solid #eee;">${name}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${email}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Teléfono</td><td style="padding:8px;border-bottom:1px solid #eee;">${phone || 'No proporcionado'}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Restaurante</td><td style="padding:8px;border-bottom:1px solid #eee;">${restaurant_name}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Plan</td><td style="padding:8px;border-bottom:1px solid #eee;">${package_name} ($${package_price})</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Menú actual</td><td style="padding:8px;border-bottom:1px solid #eee;">${current_menu || 'No especificado'}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Mensaje</td><td style="padding:8px;border-bottom:1px solid #eee;">${message || 'Sin mensaje adicional'}</td></tr>
              </table>
              <p style="margin-top:16px;color:#666;font-size:14px;">Responder a este email para contactar al cliente: <a href="mailto:${email}">${email}</a></p>
            `,
            reply_to: email,
          }),
        });
      } catch (emailErr) {
        console.error('Failed to send setup notification email:', emailErr);
      }
    }

    // Also log to console for development
    console.log('📋 Setup request:', { name, email, phone, restaurant_name, package_name, package_price, current_menu, message });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Setup request error:', err);
    return NextResponse.json(
      { error: 'Error procesando la solicitud' },
      { status: 500 }
    );
  }
}
