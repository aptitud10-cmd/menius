/**
 * Cron: activates scheduled orders whose scheduled_for time has arrived.
 * Run every 5 minutes via Vercel Cron: "0,5,10,15,20,25,30,35,40,45,50,55 * * * *"
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('activate-scheduled');
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Find pending scheduled orders whose time has come
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, restaurant_id')
    .eq('status', 'pending')
    .not('scheduled_for', 'is', null)
    .lte('scheduled_for', now)
    .limit(100);

  if (error) {
    logger.error('Failed to fetch scheduled orders', { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const activated: string[] = [];
  for (const order of orders ?? []) {
    const { error: updateErr } = await supabase
      .from('orders')
      .update({ scheduled_for: null, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    if (!updateErr) activated.push(order.order_number);
    else logger.warn('Failed to activate order', { id: order.id, error: updateErr.message });
  }

  logger.info('Scheduled orders activated', { count: activated.length });
  return NextResponse.json({ ok: true, activated });
}
