export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import { revalidatePublicMenuForRestaurant } from '@/lib/revalidate-public-menu';

const logger = createLogger('tenant-restaurant');

export async function GET() {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', tenant.restaurantId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ restaurant });
  } catch (err) {
    logger.error('GET failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/tenant/restaurant' });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Only allow specific fields to be updated
    const allowed = ['name', 'description', 'address', 'phone', 'email', 'website', 'timezone', 'currency', 'locale', 'available_locales', 'logo_url', 'cover_image_url', 'operating_hours', 'notification_whatsapp', 'notification_email', 'notifications_enabled', 'order_types_enabled', 'payment_methods_enabled', 'custom_domain', 'fiscal_rfc', 'fiscal_razon_social', 'fiscal_regimen_fiscal', 'fiscal_lugar_expedicion', 'delivery_fee', 'estimated_delivery_minutes', 'latitude', 'longitude', 'google_business_url', 'country_code', 'state_code', 'tax_rate', 'tax_included', 'tax_label', 'delivery_radius_km', 'mp_access_token', 'mp_enabled'] as const;
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (updates.custom_domain !== undefined) {
      const d = (updates.custom_domain as string).trim().toLowerCase();
      updates.custom_domain = d || null;
      if (d && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)) {
        return NextResponse.json({ error: 'DOMAIN_INVALID' }, { status: 400 });
      }
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

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', tenant.restaurantId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (restaurant?.slug) await revalidatePublicMenuForRestaurant(supabase, tenant.restaurantId);
    return NextResponse.json({ restaurant });
  } catch (err) {
    logger.error('PATCH failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/tenant/restaurant' });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
