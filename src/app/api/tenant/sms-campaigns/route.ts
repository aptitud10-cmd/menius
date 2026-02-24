export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('sms-campaigns');

async function sendSMS(to: string, message: string): Promise<boolean> {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID ?? '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN ?? '').trim();
  const fromPhone = (process.env.TWILIO_PHONE_NUMBER ?? '').trim();

  if (!accountSid || !authToken || !fromPhone) {
    logger.info('Twilio not configured — skipping SMS to:', { to: to.slice(0, 6) + '***' });
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: fromPhone, Body: message }),
    });

    if (!res.ok) {
      logger.error('Twilio error', { status: res.status, body: await res.text() });
      return false;
    }
    return true;
  } catch (err) {
    logger.error('SMS send error', { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { allowed } = checkRateLimit(`sms-campaign:${tenant.userId}`, { limit: 5, windowSec: 3600 });
    if (!allowed) {
      return NextResponse.json({ error: 'Límite de envío alcanzado. Intenta en una hora.' }, { status: 429 });
    }

    const { message, filter, menuUrl } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', tenant.restaurantId)
      .maybeSingle();

    let query = supabase
      .from('customers')
      .select('id, name, phone, total_orders, total_spent')
      .eq('restaurant_id', tenant.restaurantId)
      .not('phone', 'is', null)
      .neq('phone', '');

    if (filter === 'vip') query = query.gte('total_orders', 5);
    else if (filter === 'inactive') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.lt('last_order_at', thirtyDaysAgo);
    } else if (filter === 'recent') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('last_order_at', sevenDaysAgo);
    }

    const { data: customers } = await query.limit(200);

    let sent = 0;
    let failed = 0;
    const restaurantName = restaurant?.name ?? 'Restaurante';

    for (const customer of customers ?? []) {
      const personalizedMsg = message
        .replace(/\{nombre\}/gi, customer.name || 'Cliente')
        .replace(/\{restaurante\}/gi, restaurantName)
        .replace(/\{link\}/gi, menuUrl || '')
        .replace(/\{total_ordenes\}/gi, String(customer.total_orders ?? 0))
        .replace(/\{total_gastado\}/gi, String(customer.total_spent ?? 0));

      const success = await sendSMS(customer.phone, personalizedMsg);
      if (success) sent++;
      else failed++;
    }

    logger.info('SMS campaign sent', { sent, failed, total: (customers ?? []).length, filter });

    return NextResponse.json({
      sent,
      failed,
      total: (customers ?? []).length,
    });
  } catch (err) {
    logger.error('SMS campaign error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
