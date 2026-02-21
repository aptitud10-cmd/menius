export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { sanitizeText, sanitizeMultiline } from '@/lib/sanitize';
import { createLogger } from '@/lib/logger';

const logger = createLogger('reviews');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id requerido' }, { status: 400 });
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
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = checkRateLimit(`review:${ip}`, { limit: 5, windowSec: 300 });
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiadas reseñas. Intenta en unos minutos.' }, { status: 429 });
    }

    const body = await request.json();
    const { restaurant_id, order_id, customer_name, rating, comment } = body;

    if (!restaurant_id || !customer_name || !rating) {
      return NextResponse.json({ error: 'restaurant_id, customer_name y rating requeridos' }, { status: 400 });
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json({ error: 'Rating debe ser un entero entre 1 y 5' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurant_id)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        restaurant_id,
        order_id: order_id || null,
        customer_name: sanitizeText(customer_name, 100),
        rating: numRating,
        comment: sanitizeMultiline(comment ?? '', 500),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ review: data });
  } catch (err) {
    logger.error('POST failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
