export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = await checkRateLimitAsync(`validate-promo:${ip}`, { limit: 10, windowSec: 60 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' } }
      );
    }

    const { code, restaurant_id, order_total, locale = 'es' } = await request.json();
    const en = locale === 'en';

    if (!code || !restaurant_id) {
      return NextResponse.json({ error: en ? 'Code and restaurant_id required' : 'Código y restaurant_id requeridos' }, { status: 400 });
    }
    if (!UUID_RE.test(String(restaurant_id))) {
      return NextResponse.json({ error: en ? 'Invalid restaurant_id' : 'restaurant_id inválido' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: promo, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !promo) {
      return NextResponse.json({ error: en ? 'Invalid code' : 'Código no válido' }, { status: 404 });
    }

    // Check expiration
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return NextResponse.json({ error: en ? 'This code has expired' : 'Este código ha expirado' }, { status: 400 });
    }

    // Check max uses
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      return NextResponse.json({ error: en ? 'This code has reached its usage limit' : 'Este código ya alcanzó su límite de usos' }, { status: 400 });
    }

    // Check minimum order
    const total = Number(order_total) || 0;
    if (promo.min_order && total < Number(promo.min_order)) {
      return NextResponse.json({
        error: en
          ? `Minimum order of $${Number(promo.min_order).toFixed(2)} required to use this code`
          : `Pedido mínimo de $${Number(promo.min_order).toFixed(2)} para usar este código`,
      }, { status: 400 });
    }

    // Calculate discount
    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = total * (Number(promo.discount_value) / 100);
    } else {
      discount = Number(promo.discount_value);
    }
    discount = Math.min(discount, total);

    return NextResponse.json({
      valid: true,
      discount,
      description: promo.description,
      discount_type: promo.discount_type,
      discount_value: Number(promo.discount_value),
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
