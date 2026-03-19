export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { captureError } from '@/lib/error-reporting';
import { createHash } from 'crypto';

/**
 * POST /api/payments/wompi
 * Generates a Wompi checkout session data (integrity hash + params).
 * Called when a Colombian restaurant's customer clicks "Pay with Wompi".
 *
 * Required env vars:
 *   WOMPI_PUBLIC_KEY       — pub_prod_xxx  (or pub_test_xxx for sandbox)
 *   WOMPI_INTEGRITY_SECRET — prod_integrity_xxx
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = checkRateLimit(`wompi:${ip}`, { limit: 10, windowSec: 60 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const publicKey = process.env.WOMPI_PUBLIC_KEY?.trim();
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET?.trim();

    if (!publicKey || !integritySecret) {
      return NextResponse.json({ error: 'Wompi not configured' }, { status: 503 });
    }

    const body = await request.json();
    const { order_id, slug } = body;

    if (!order_id || typeof order_id !== 'string' || !/^[0-9a-f-]{36}$/.test(order_id)) {
      return NextResponse.json({ error: 'Valid order_id required' }, { status: 400 });
    }
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    const adminDb = createAdminClient();
    const { data: order, error } = await adminDb
      .from('orders')
      .select('id, order_number, total, customer_name, customer_email, customer_phone, restaurant_id, restaurants ( currency )')
      .eq('id', order_id)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const currency = ((order as any).restaurants?.currency || 'COP').toUpperCase();
    if (currency !== 'COP') {
      return NextResponse.json({ error: 'Wompi only supports COP' }, { status: 400 });
    }

    const amountInCents = Math.round(Number(order.total) * 100);
    const reference = order.order_number;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    const redirectUrl = `${appUrl}/${slug}/orden/${order.order_number}?paid=true`;

    // Generate SHA256 integrity hash: reference + amountInCents + currency + integritySecret
    const toHash = `${reference}${amountInCents}${currency}${integritySecret}`;
    const integrityHash = createHash('sha256').update(toHash).digest('hex');

    return NextResponse.json({
      publicKey,
      currency,
      amountInCents,
      reference,
      integrityHash,
      redirectUrl,
      customerData: {
        email: order.customer_email || undefined,
        fullName: order.customer_name || undefined,
        phoneNumber: order.customer_phone?.replace(/[^0-9]/g, '') || undefined,
        phoneNumberPrefix: '+57',
      },
    });
  } catch (err: any) {
    captureError(err, { route: '/api/payments/wompi' });
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 });
  }
}
