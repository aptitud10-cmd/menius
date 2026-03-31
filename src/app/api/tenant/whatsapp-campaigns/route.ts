export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { sendWhatsApp } from '@/lib/notifications/whatsapp';

type Audience = 'all' | 'inactive_30' | 'inactive_60' | 'vip';

async function getCustomers(supabase: ReturnType<typeof createClient>, restaurantId: string, audience: Audience) {
  const now = new Date();

  if (audience === 'inactive_30' || audience === 'inactive_60') {
    const days = audience === 'inactive_30' ? 30 : 60;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, last_order_at')
      .eq('restaurant_id', restaurantId)
      .not('phone', 'is', null)
      .or(`last_order_at.lt.${cutoff},last_order_at.is.null`);
    return data ?? [];
  }

  if (audience === 'vip') {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, total_orders')
      .eq('restaurant_id', restaurantId)
      .not('phone', 'is', null)
      .gte('total_orders', 5);
    return data ?? [];
  }

  // 'all'
  const { data } = await supabase
    .from('customers')
    .select('id, name, phone')
    .eq('restaurant_id', restaurantId)
    .not('phone', 'is', null);
  return data ?? [];
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, audience = 'all' } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    // Check Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json({ error: 'WhatsApp not configured. Add Twilio credentials in settings.' }, { status: 400 });
    }

    const supabase = createClient();
    const customers = await getCustomers(supabase, tenant.restaurantId, audience as Audience);

    if (customers.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: 'No customers with phone numbers found' });
    }

    // Rate-limit: max 500 per campaign, with 100ms delay between sends
    const batchSize = Math.min(customers.length, 500);
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < batchSize; i++) {
      const c = customers[i];
      if (!c.phone) continue;
      const result = await sendWhatsApp({ to: c.phone, text: message });
      if (result.success) sent++; else failed++;
      // Small delay to avoid Twilio rate limits
      if (i < batchSize - 1) await new Promise(r => setTimeout(r, 100));
    }

    // Log campaign
    try {
      await supabase.from('campaigns').insert({
        restaurant_id: tenant.restaurantId,
        type: 'whatsapp',
        audience,
        message_preview: message.slice(0, 200),
        sent_count: sent,
        failed_count: failed,
        created_at: new Date().toISOString(),
      });
    } catch { /* campaigns table may not have all fields */ }

    return NextResponse.json({ sent, failed });
  } catch (err) {
    console.error('[whatsapp-campaigns]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
