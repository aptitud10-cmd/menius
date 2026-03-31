/**
 * GET /api/driver/order?token=xxx
 * Returns minimal order info (delivery address, customer name) for the driver page.
 * No auth required — uses the per-delivery token.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select('delivery_address, customer_name, customer_phone, order_number, driver_token_expires_at')
    .eq('driver_tracking_token', token)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const expired = data.driver_token_expires_at && new Date(data.driver_token_expires_at) < new Date();
  if (expired) return NextResponse.json({ error: 'Token expired' }, { status: 410 });

  return NextResponse.json({
    deliveryAddress: data.delivery_address ?? null,
    customerName: data.customer_name ?? null,
    customerPhone: data.customer_phone ?? null,
    orderNumber: data.order_number ?? null,
  });
}
