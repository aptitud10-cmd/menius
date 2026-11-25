export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { hasPlanAccess } from '@/lib/auth/check-plan';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import { revalidatePublicMenuForRestaurant } from '@/lib/revalidate-public-menu';
import { normalizeBrandColor } from '@/lib/tracker-brand';
import { getDeviceSession } from '@/lib/auth/device-session';
import { OWNER_ONLY_FIELDS, ownerOnlyChanges, stripRestaurantSecrets } from '@/lib/restaurant-owner-fields';

const logger = createLogger('tenant-restaurant');

export async function GET() {
  try {
    const supabase = await createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', tenant.restaurantId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Sin llaves: el token de Mercado Pago y los secretos de Wompi no salen al navegador.
    return NextResponse.json({ restaurant: restaurant ? stripRestaurantSecrets(restaurant) : null });
  } catch (err) {
    logger.error('GET failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/tenant/restaurant' });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Only allow specific fields to be updated
    const allowed = ['name', 'description', 'address', 'phone', 'email', 'website', 'timezone', 'currency', 'locale', 'available_locales', 'logo_url', 'cover_image_url', 'operating_hours', 'notification_whatsapp', 'notification_email', 'notifications_enabled', 'order_types_enabled', 'payment_methods_enabled', 'custom_domain', 'fiscal_rfc', 'fiscal_razon_social', 'fiscal_regimen_fiscal', 'fiscal_lugar_expedicion', 'delivery_fee', 'estimated_delivery_minutes', 'latitude', 'longitude', 'google_business_url', 'country_code', 'state_code', 'tax_rate', 'tax_included', 'tax_label', 'delivery_radius_km', 'delivery_min_order', 'mp_access_token', 'mp_enabled', 'instagram_url', 'brand_color'] as const;
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (updates.custom_domain !== undefined) {
      const d = String(updates.custom_domain ?? '').trim().toLowerCase();
      updates.custom_domain = d || null;
      if (d && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)) {
        return NextResponse.json({ error: 'DOMAIN_INVALID' }, { status: 400 });
      }
      // El dominio propio es del plan Pro (antes no tenía ningún control de plan).
      if (d && !(await hasPlanAccess(tenant.restaurantId, 'pro'))) {
        return NextResponse.json({ error: 'DOMAIN_REQUIRES_PRO' }, { status: 403 });
      }
    }

    // Color del seguimiento: solo #RRGGBB o nada.
    if (updates.brand_color !== undefined) {
      if (updates.brand_color === null || updates.brand_color === '') updates.brand_color = null;
      else {
        const c = normalizeBrandColor(updates.brand_color);
        if (!c) return NextResponse.json({ error: 'BRAND_COLOR_INVALID' }, { status: 400 });
        updates.brand_color = c;
      }
    }

    // "Powered by MENIUS" en la tienda: Pro puede ocultarlo. Se guarda dentro de
    // config_overrides (jsonb) sin pisar las otras claves que haya.
    if (body.hide_menius_branding !== undefined) {
      if (typeof body.hide_menius_branding !== 'boolean') {
        return NextResponse.json({ error: 'INVALID_VALUE' }, { status: 400 });
      }
      if (body.hide_menius_branding && !(await hasPlanAccess(tenant.restaurantId, 'pro'))) {
        return NextResponse.json({ error: 'BRANDING_REQUIRES_PRO' }, { status: 403 });
      }
      const { data: current, error: readError } = await supabase
        .from('restaurants')
        .select('config_overrides')
        .eq('id', tenant.restaurantId)
        .maybeSingle();
      if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
      const prev = current?.config_overrides;
      const base =
        prev && typeof prev === 'object' && !Array.isArray(prev) ? (prev as Record<string, unknown>) : {};
      updates.config_overrides = { ...base, hide_menius_branding: body.hide_menius_branding };
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'NO_CHANGES' }, { status: 400 });
    }

    // Validate tax_rate — clamp to 0-100 to prevent nonsensical values
    if (updates.tax_rate !== undefined) {
      const rate = Number(updates.tax_rate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return NextResponse.json({ error: 'TAX_RATE_INVALID' }, { status: 400 });
      }
      updates.tax_rate = Math.round(rate * 1000) / 1000; // keep up to 3 decimal places
    }

    // Validate notification_email format if provided
    if (updates.notification_email !== undefined && updates.notification_email !== '') {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(String(updates.notification_email))) {
        return NextResponse.json({ error: 'EMAIL_INVALID' }, { status: 400 });
      }
    }

    // Tablet con el panel abierto por PIN: puede guardar horarios, fotos, etc.,
    // pero no cambiar cobros, impuesto, moneda, país, dominio ni datos fiscales.
    if (OWNER_ONLY_FIELDS.some((f) => updates[f] !== undefined)) {
      const device = await getDeviceSession(supabase);
      if (device.isTablet) {
        const { data: current, error: curError } = await supabase
          .from('restaurants')
          .select(OWNER_ONLY_FIELDS.join(', '))
          .eq('id', tenant.restaurantId)
          .maybeSingle();
        if (curError || !current) return NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 });
        const changed = ownerOnlyChanges(current as unknown as Record<string, unknown>, updates);
        if (changed.length > 0) {
          return NextResponse.json({ error: 'OWNER_ONLY', fields: changed }, { status: 403 });
        }
        // Lo que no cambió no se reescribe desde la tablet.
        for (const f of OWNER_ONLY_FIELDS) delete updates[f];
        if (Object.keys(updates).length === 0) {
          return NextResponse.json({ error: 'NO_CHANGES' }, { status: 400 });
        }
      }
    }

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', tenant.restaurantId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (restaurant?.slug) await revalidatePublicMenuForRestaurant(supabase, tenant.restaurantId);
    return NextResponse.json({ restaurant: restaurant ? stripRestaurantSecrets(restaurant) : null });
  } catch (err) {
    logger.error('PATCH failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/tenant/restaurant' });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
