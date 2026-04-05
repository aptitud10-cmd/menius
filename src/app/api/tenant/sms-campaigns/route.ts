export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';

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
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { allowed } = await checkRateLimitAsync(`sms-campaign:${tenant.userId}`, { limit: 5, windowSec: 3600 });
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit reached. Try again in an hour.' }, { status: 429 });
    }

    const body = await request.json();
    const { smsCampaignSchema } = await import('@/lib/validations');
    const parsed = smsCampaignSchema.safeParse({ message: body.message, recipient_filter: body.filter });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { message, filter } = body;

    // Validate menuUrl — only allow http/https to prevent protocol injection into SMS messages
    let menuUrl = '';
    if (body.menuUrl) {
      try {
        const u = new URL(String(body.menuUrl));
        if (['http:', 'https:'].includes(u.protocol)) menuUrl = u.toString();
      } catch { /* ignore invalid URLs — just don't include them */ }
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
    captureError(err, { route: '/api/tenant/sms-campaigns' });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
