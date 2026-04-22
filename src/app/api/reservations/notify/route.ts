export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { sendEmail } from '@/lib/notifications/email';

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDate(dateStr: string, locale: string) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { reservationId, status, restaurantId, customerName, customerEmail, customerPhone, date, time, partySize } = await req.json();

    if (restaurantId !== tenant.restaurantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name, locale, slug')
      .eq('id', restaurantId)
      .maybeSingle();

    if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

    const isEn = restaurant.locale === 'en';
    const formattedDate = formatDate(date, restaurant.locale);
    const formattedTime = formatTime(time);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

    const safeName = escHtml(String(customerName ?? ''));
    const safeRestaurant = escHtml(restaurant.name ?? '');
    const safePartySize = Number(partySize) || 1;

    // Send email confirmation if customer email is available
    if (customerEmail) {
      const subject = isEn
        ? `Reservation confirmed at ${restaurant.name}`
        : `Reservación confirmada en ${restaurant.name}`;

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="background:white;border-radius:20px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">✅</div>
        <h1 style="color:white;font-size:22px;font-weight:800;margin:0 0 6px;">
          ${isEn ? 'Reservation Confirmed!' : '¡Reservación Confirmada!'}
        </h1>
        <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">${safeRestaurant}</p>
      </div>
      <div style="padding:28px;">
        <p style="color:#374151;font-size:15px;margin:0 0 20px;">
          ${isEn ? `Hi ${safeName},` : `Hola ${safeName},`}<br><br>
          ${isEn ? 'Your reservation has been confirmed. We look forward to seeing you!' : 'Tu reservación ha sido confirmada. ¡Te esperamos con gusto!'}
        </p>
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #e5e7eb;">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
            <span style="color:#6b7280;font-size:13px;">${isEn ? 'Date' : 'Fecha'}</span>
            <span style="color:#111827;font-size:13px;font-weight:600;">${formattedDate}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
            <span style="color:#6b7280;font-size:13px;">${isEn ? 'Time' : 'Hora'}</span>
            <span style="color:#111827;font-size:13px;font-weight:600;">${formattedTime}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:#6b7280;font-size:13px;">${isEn ? 'Party size' : 'Personas'}</span>
            <span style="color:#111827;font-size:13px;font-weight:600;">${safePartySize}</span>
          </div>
        </div>
        <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">
          ${isEn ? 'If you need to cancel, please contact us directly.' : 'Si necesitas cancelar, contáctanos directamente.'}
        </p>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">
      Powered by MENIUS
    </p>
  </div>
</body>
</html>`;

      await sendEmail({
        to: customerEmail,
        from: `${restaurant.name} <reservaciones@menius.app>`,
        subject,
        html,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
