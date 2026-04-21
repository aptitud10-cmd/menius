export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:branches');

export async function GET() {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const supabase = createClient();

    // Get all restaurants owned by this user
    const { data: branches, error } = await supabase
      .from('restaurants')
      .select('id, name, slug, address, phone, is_active, logo_url, currency, locale, created_at, business_id')
      .eq('owner_user_id', tenant.userId)
      .order('created_at', { ascending: true });

    if (error?.code === '42703') {
      // business_id column doesn't exist yet — return without it
      const { data: branchesBasic } = await supabase
        .from('restaurants')
        .select('id, name, slug, address, phone, is_active, logo_url, currency, locale, created_at')
        .eq('owner_user_id', tenant.userId)
        .order('created_at', { ascending: true });
      return NextResponse.json({ branches: branchesBasic ?? [], needsMigration: true });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ branches: branches ?? [] });
  } catch (err) {
    logger.error('branches error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { name, slug, address, phone } = await req.json();
    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: 'Nombre y slug requeridos' }, { status: 400 });
    }
    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'Nombre demasiado largo (máx 100)' }, { status: 400 });
    }
    const normalizedSlug = slug.trim().toLowerCase();
    if (!/^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$/.test(normalizedSlug)) {
      return NextResponse.json({ error: 'Slug inválido (solo letras, números y guiones, 2–60 caracteres)' }, { status: 400 });
    }

    const supabase = createClient();

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', normalizedSlug)
      .maybeSingle();

    if (existing) return NextResponse.json({ error: 'El slug ya está en uso' }, { status: 409 });

    // Get currency/locale from current restaurant
    const { data: currentRestaurant } = await supabase
      .from('restaurants')
      .select('currency, locale, available_locales')
      .eq('id', tenant.restaurantId)
      .maybeSingle();

    const { data: newBranch, error } = await supabase
      .from('restaurants')
      .insert({
        owner_user_id: tenant.userId,
        name: name.trim(),
        slug: normalizedSlug,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        is_active: true,
        currency: currentRestaurant?.currency ?? 'MXN',
        locale: currentRestaurant?.locale ?? 'es',
        available_locales: currentRestaurant?.available_locales ?? ['es'],
      })
      .select('id, name, slug, address, phone, is_active, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ branch: newBranch });
  } catch (err) {
    logger.error('branches error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
