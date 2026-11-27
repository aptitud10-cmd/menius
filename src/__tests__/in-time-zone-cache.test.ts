import { describe, expect, it } from 'vitest';
import { inTimeZone } from '@/lib/orders/business-hours';
import { formatCurrency, formatCurrencyByCode } from '@/lib/country-config';
import { compactMenuProducts, expandMenuProducts } from '@/lib/menu-product-wire';
import type { Product } from '@/types';

// La implementaciÃ³n anterior: el resultado nuevo tiene que ser idÃ©ntico.
const legacy = (instant: Date, tz: string) => new Date(instant.toLocaleString('en-US', { timeZone: tz }));

describe('inTimeZone con formateador reutilizado', () => {
  const zones = ['America/New_York', 'America/Bogota', 'America/Mexico_City', 'Europe/Madrid', 'Pacific/Honolulu', 'Asia/Kolkata', 'UTC'];
  it('da lo mismo que toLocaleString en todo el aÃ±o, incluidos los cambios de hora', () => {
    const start = Date.UTC(2026, 0, 1);
    const instants: number[] = [];
    // cada ~4 h durante un aÃ±o (cruza medianoches a distintas horas)...
    for (let t = start; t < start + 366 * 86_400_000; t += 247 * 60_000) instants.push(t + 12_345);
    // ...y cada 5 min alrededor de los cambios de hora de EE.UU. y Europa
    for (const day of [Date.UTC(2026, 2, 8), Date.UTC(2026, 10, 1), Date.UTC(2026, 2, 29), Date.UTC(2026, 9, 25)]) {
      for (let t = day - 6 * 3_600_000; t < day + 12 * 3_600_000; t += 5 * 60_000) instants.push(t);
    }
    for (const tz of zones) {
      for (const t of instants) {
        const d = new Date(t);
        expect(inTimeZone(d, tz).getTime()).toBe(legacy(d, tz).getTime());
      }
    }
  }, 30_000);
  it('fecha invÃ¡lida â†’ Invalid Date, como antes', () => {
    expect(Number.isNaN(inTimeZone(new Date('x'), 'UTC').getTime())).toBe(true);
  });
  it('zona invÃ¡lida tira RangeError, como antes', () => {
    expect(() => inTimeZone(new Date(), 'Nowhere/Nada')).toThrow(RangeError);
  });
});

describe('formatCurrency con formateador reutilizado', () => {
  it('mismo texto que un Intl.NumberFormat nuevo', () => {
    expect(formatCurrency(12.5, 'US')).toBe(formatCurrency(12.5, 'US'));
    expect(formatCurrencyByCode(1234.5, 'USD')).toBe(
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', currencyDisplay: 'symbol' }).format(1234.5),
    );
    expect(formatCurrencyByCode(9, 'USD', { maximumFractionDigits: 0 })).toBe(
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', currencyDisplay: 'symbol', maximumFractionDigits: 0 }).format(9),
    );
  });
});

describe('platos compactos de la tienda', () => {
  const R = 'a1f5af6a-1805-49d2-b494-f074ac657357';
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://x.supabase.co'}/storage/v1/object/public/product-images/`;
  const full = (over: Partial<Product> = {}): Product => ({
    id: 'p1', restaurant_id: R, category_id: 'c1', name: 'Apple Juice', description: 'Crisp',
    price: 4.75, compare_at_price: null, image_url: `${base}opt/${R}/apple-lg.jpg`, is_active: true, in_stock: true,
    is_featured: false, is_new: false, dine_in_only: false, hide_image: false, prep_time_minutes: null,
    available_from: null, available_until: null, dietary_tags: [], translations: null as unknown as undefined,
    sort_order: 3, created_at: '', popularity_rank: null, orders_last_7d: 0, has_modifiers: true,
    daily_kind: null, daily_label: null, daily_always: false, variants: [], extras: [], modifier_groups: [],
    ...over,
  });

  it('compactar y rearmar devuelve el mismo plato', () => {
    const items = [
      full(),
      full({ id: 'p2', compare_at_price: 6, in_stock: false, is_new: true, dietary_tags: ['vegan'], orders_last_7d: null, popularity_rank: 2, available_from: '05:30', available_until: '11:00', daily_kind: 'soup', daily_label: 'Lentil', daily_always: true, hide_image: true }),
      full({ id: 'p3', image_url: 'https://images.unsplash.com/photo-1?w=800' }),
      full({ id: 'p4', image_url: '' }),
    ];
    const wire = compactMenuProducts(items, R);
    expect(JSON.stringify(wire).length).toBeLessThan(JSON.stringify(items).length / 2);
    expect(expandMenuProducts(wire, R)).toEqual(items);
  });

  it('un producto completo (demo) pasa sin cambios', () => {
    const p = full();
    expect(expandMenuProducts([p], R)).toEqual([p]);
  });
});

describe('ids de la base en las validaciones (Zod 4)', () => {
  it('acepta ids que no son UUID RFC 4122 (hay 26 platos asÃ­ en Buccaneer)', async () => {
    const { publicOrderSchema, promotionSchema } = await import('@/lib/validations');
    const r = publicOrderSchema.safeParse({
      customer_name: 'Ana', customer_phone: '+1 347 555 0100', order_type: 'pickup',
      items: [{ product_id: 'c1000001-0000-0000-0000-000000000001', variant_id: '', qty: 1,
        extras: [{ extra_id: 'c1000001-0000-0000-0000-000000000002' }], modifiers: [] }],
    });
    expect(r.success).toBe(true);
    expect(publicOrderSchema.safeParse({ customer_name: 'Ana', customer_phone: '+1 347 555 0100', order_type: 'pickup',
      items: [{ product_id: 'no-es-un-id', qty: 1 }] }).success).toBe(false);
    // el refine de promociones sigue marcando el campo correcto
    const p = promotionSchema.safeParse({ code: 'PROMO', discount_type: 'percentage', discount_value: 150 });
    expect(p.success).toBe(false);
    if (!p.success) expect(p.error.issues.some((i) => i.path[0] === 'discount_value')).toBe(true);
  });
});
