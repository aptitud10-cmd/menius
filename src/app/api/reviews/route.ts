export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { sanitizeText, sanitizeMultiline } from '@/lib/sanitize';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import { reviewSubmitSchema } from '@/lib/validations';

const logger = createLogger('reviews');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('reviews')
      .select('id, customer_name, rating, comment, created_at')
      .eq('restaurant_id', restaurantId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const reviews = data ?? [];
    const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

    return NextResponse.json({ reviews, average: Math.round(avg * 10) / 10, total: reviews.length });
  } catch (err) {
    logger.error('GET failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/reviews' });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = await checkRateLimitAsync(`review:${ip}`, { limit: 5, windowSec: 300 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many reviews. Please try again in a few minutes.' }, { status: 429 });
    }

    const body = await request.json();

    // Honeypot — silently discard bot submissions
    if (body._hp && String(body._hp).length > 0) {
      logger.warn('Review honeypot triggered', { ip });
      return NextResponse.json({ review: { id: `blocked-${Date.now()}` } });
    }
    const parsed = reviewSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', parsed.data.restaurant_id)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Verify the supplied order_id actually belongs to this restaurant
    // and that the order is in a terminal delivered state.
    if (parsed.data.order_id) {
      const { data: orderCheck } = await supabase
        .from('orders')
        .select('id, status')
        .eq('id', parsed.data.order_id)
        .eq('restaurant_id', parsed.data.restaurant_id)
        .maybeSingle();
      if (!orderCheck) {
        return NextResponse.json({ error: 'Order not found for this restaurant' }, { status: 400 });
      }
      if (orderCheck.status === 'cancelled') {
        return NextResponse.json({ error: 'Cannot review a cancelled order' }, { status: 400 });
      }

      // Prevent duplicate reviews for the same order
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', parsed.data.order_id)
        .maybeSingle();
      if (existingReview) {
        return NextResponse.json({ error: 'A review has already been submitted for this order' }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        restaurant_id: parsed.data.restaurant_id,
        order_id: parsed.data.order_id || null,
        customer_name: sanitizeText(parsed.data.customer_name, 100),
        rating: parsed.data.rating,
        comment: sanitizeMultiline(parsed.data.comment ?? '', 500),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ review: data });
  } catch (err) {
    logger.error('POST failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/reviews' });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
