import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, restaurant_id, order_total } = await request.json();

    if (!code || !restaurant_id) {
      return NextResponse.json({ error: 'Código y restaurant_id requeridos' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: promo, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !promo) {
      return NextResponse.json({ error: 'Código no válido' }, { status: 404 });
    }

    // Check expiration
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Este código ha expirado' }, { status: 400 });
    }

    // Check max uses
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      return NextResponse.json({ error: 'Este código ya alcanzó su límite de usos' }, { status: 400 });
    }

    // Check minimum order
    const total = Number(order_total) || 0;
    if (promo.min_order && total < Number(promo.min_order)) {
      return NextResponse.json({
        error: `Pedido mínimo de $${Number(promo.min_order).toFixed(2)} para usar este código`,
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
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
