export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { sendEmail } from '@/lib/notifications/email';
import { formatPrice } from '@/lib/utils';
import { checkRateLimit } from '@/lib/rate-limit';

interface CampaignCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  tags: string[];
}

function buildCampaignEmail(params: {
  restaurantName: string;
  subject: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}): string {
  const { restaurantName, body, ctaText, ctaUrl } = params;
  const bodyHtml = body.split('\n').map(line => `<p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${line}</p>`).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:20px;font-weight:800;color:#7c3aed;margin:0;">${restaurantName}</h1>
    </div>
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);padding:32px 24px;">
      ${bodyHtml}
      ${ctaText && ctaUrl ? `
        <a href="${ctaUrl}" style="display:block;margin-top:24px;padding:14px;background:#7c3aed;color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
          ${ctaText}
        </a>
      ` : ''}
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:20px;">
      Enviado por ${restaurantName} a través de MENIUS
    </p>
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { allowed } = checkRateLimit(`campaign:${tenant.userId}`, { limit: 5, windowSec: 3600 });
    if (!allowed) {
      return NextResponse.json({ error: 'Máximo 5 campañas por hora. Intenta más tarde.' }, { status: 429 });
    }

    const body = await request.json();
    const { subject, message, ctaText, ctaUrl, filter } = body;

    if (!subject || !message) {
      return NextResponse.json({ error: 'Asunto y mensaje son requeridos' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name, slug, currency')
      .eq('id', tenant.restaurantId)
      .maybeSingle();

    if (!restaurant) return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });

    let query = supabase
      .from('customers')
      .select('id, name, email, phone, total_orders, total_spent, last_order_at, tags')
      .eq('restaurant_id', tenant.restaurantId)
      .not('email', 'is', null)
      .neq('email', '');

    if (filter === 'vip') {
      query = query.gte('total_orders', 5);
    } else if (filter === 'inactive') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.lt('last_order_at', thirtyDaysAgo);
    } else if (filter === 'recent') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('last_order_at', sevenDaysAgo);
    } else if (filter === 'big_spenders') {
      query = query.gte('total_spent', 100);
    }

    const { data: customers, error: custError } = await query.limit(500);
    if (custError) return NextResponse.json({ error: custError.message }, { status: 500 });

    const recipients = (customers ?? []) as CampaignCustomer[];
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No hay clientes con email que coincidan con el filtro.' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    const menuUrl = `${appUrl}/r/${restaurant.slug}`;

    const html = buildCampaignEmail({
      restaurantName: restaurant.name,
      subject,
      body: message,
      ctaText: ctaText || 'Ver menú',
      ctaUrl: ctaUrl || menuUrl,
    });

    let sent = 0;
    let failed = 0;

    const personalizedSubject = subject.replace('{restaurante}', restaurant.name);

    for (const customer of recipients) {
      try {
        const personalizedHtml = html
          .replace(/\{nombre\}/g, customer.name || 'Cliente')
          .replace(/\{total_gastado\}/g, formatPrice(customer.total_spent, restaurant.currency ?? 'USD'))
          .replace(/\{total_ordenes\}/g, String(customer.total_orders));

        const success = await sendEmail({
          to: customer.email,
          subject: personalizedSubject.replace('{nombre}', customer.name || 'Cliente'),
          html: personalizedHtml,
        });

        if (success) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: recipients.length,
    });
  } catch (err) {
    console.error('[campaigns POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
