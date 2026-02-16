import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

  // Compute average
  const reviews = data ?? [];
  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return NextResponse.json({ reviews, average: Math.round(avg * 10) / 10, total: reviews.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, order_id, customer_name, rating, comment } = body;

    if (!restaurant_id || !customer_name || !rating) {
      return NextResponse.json({ error: 'restaurant_id, customer_name y rating requeridos' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating debe ser entre 1 y 5' }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        restaurant_id,
        order_id: order_id || null,
        customer_name,
        rating: Number(rating),
        comment: comment ?? '',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ review: data });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
