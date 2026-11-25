export const dynamic = 'force-dynamic';

/**
 * Pestaña "Hoy" del Counter: sopas y especiales del día.
 * GET  → estado del día (biblioteca completa + qué está puesto + qué hubo ayer).
 * POST → { action: 'on'|'off'|'out'|'back'|'swap'|'same', product_id?, replace_id?, restore? } y devuelve el estado.
 *   restore = { [product_id]: 'YYYY-MM-DD' | null }: lo manda "Deshacer" para devolver daily_last_on a como estaba.
 * "Puesto" = products.is_active; agotado = in_stock=false. Antes de cada lectura/acción corre el corte
 * diario (runDailyReset) si cambió el día de trabajo. Funciona en la tablet vinculada sin PIN.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { isSameOriginJson } from '@/lib/device-pairing';
import { revalidatePublicMenuForRestaurant } from '@/lib/revalidate-public-menu';
import { addDays, businessDay, DAILY_LIMITS, type DailyKind } from '@/lib/daily-menu';
import { runDailyReset, syncSpecialCategories } from '@/lib/daily-reset';
import { createLogger } from '@/lib/logger';

const logger = createLogger('counter-today');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ACTIONS = ['on', 'off', 'out', 'back', 'swap', 'same'] as const;
type Action = (typeof ACTIONS)[number];

interface DailyRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string;
  is_active: boolean | null;
  in_stock: boolean | null;
  daily_kind: DailyKind;
  daily_always: boolean;
  daily_label: string | null;
  daily_last_on: string | null;
  sort_order: number | null;
}

/** Corre el corte si hace falta. Devuelve el día de trabajo y si reinició. */
async function ensureDay(supabase: SupabaseClient, restaurantId: string) {
  const { data: rest } = await supabase
    .from('restaurants')
    .select('id, timezone, day_cutoff, daily_reset_on')
    .eq('id', restaurantId)
    .maybeSingle();
  if (!rest) throw new Error('restaurant not found');
  const didReset = await runDailyReset(supabase, rest);
  return {
    day: businessDay(new Date(), rest.timezone, rest.day_cutoff),
    cutoff: (rest.day_cutoff as string | null) ?? '05:00',
    timezone: (rest.timezone as string | null) ?? 'America/New_York',
    didReset,
  };
}

async function loadRows(supabase: SupabaseClient, restaurantId: string): Promise<DailyRow[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price, category_id, is_active, in_stock, daily_kind, daily_always, daily_label, daily_last_on, sort_order')
    .eq('restaurant_id', restaurantId)
    .not('daily_kind', 'is', null)
    .order('sort_order')
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as DailyRow[];
}

function toState(rows: DailyRow[], d: { day: string; cutoff: string; timezone: string }) {
  const yesterday = addDays(d.day, -1);
  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    price: Number(r.price),
    kind: r.daily_kind,
    always: r.daily_always,
    label: r.daily_label,
    on: r.is_active === true,
    out: r.in_stock === false,
    lastOn: r.daily_last_on,
  }));
  return {
    day: d.day,
    cutoff: d.cutoff,
    timezone: d.timezone,
    items,
    yesterday: items.filter((i) => i.lastOn === yesterday && !i.always).map((i) => i.id),
    limits: DAILY_LIMITS,
  };
}

export async function GET() {
  try {
    const tenant = await getTenant({ allowDevice: true });
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const supabase = await createClient();
    const d = await ensureDay(supabase, tenant.restaurantId);
    if (d.didReset) await revalidatePublicMenuForRestaurant(supabase, tenant.restaurantId);
    return NextResponse.json(toState(await loadRows(supabase, tenant.restaurantId), d));
  } catch (err: unknown) {
    logger.error('GET today', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Solo la propia página (JSON + mismo origen): un formulario de otro sitio no
    // puede usar la sesión abierta de la tablet para agotar o cambiar platos.
    if (!isSameOriginJson(req)) return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
    const tenant = await getTenant({ allowDevice: true });
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body: unknown = await req.json().catch(() => null);
    const b = (body ?? {}) as Record<string, unknown>;
    const action = b.action as Action;
    const productId = typeof b.product_id === 'string' ? b.product_id : null;
    const replaceId = typeof b.replace_id === 'string' ? b.replace_id : null;
    if (!ACTIONS.includes(action)) return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    if (action !== 'same' && (!productId || !UUID.test(productId))) {
      return NextResponse.json({ error: 'Plato inválido' }, { status: 400 });
    }
    if (action === 'swap' && (!replaceId || !UUID.test(replaceId))) {
      return NextResponse.json({ error: 'Plato inválido' }, { status: 400 });
    }
    const restore: Array<[string, string | null]> = [];
    if (b.restore !== undefined) {
      if (typeof b.restore !== 'object' || b.restore === null || Array.isArray(b.restore)) {
        return NextResponse.json({ error: 'restore inválido' }, { status: 400 });
      }
      for (const [id, v] of Object.entries(b.restore as Record<string, unknown>)) {
        if (!UUID.test(id) || !(v === null || (typeof v === 'string' && DATE.test(v)))) {
          return NextResponse.json({ error: 'restore inválido' }, { status: 400 });
        }
        restore.push([id, v as string | null]);
      }
      if (restore.length > 10) return NextResponse.json({ error: 'restore inválido' }, { status: 400 });
    }

    const supabase = await createClient();
    const rid = tenant.restaurantId;
    const d = await ensureDay(supabase, rid);
    const rows = await loadRows(supabase, rid);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const target = productId ? byId.get(productId) : undefined;
    if (action !== 'same' && !target) return NextResponse.json({ error: 'No es una sopa ni un especial' }, { status: 404 });
    if (restore.some(([id]) => !byId.has(id))) return NextResponse.json({ error: 'restore inválido' }, { status: 400 });

    const setRow = async (id: string, patch: Record<string, unknown>) => {
      const { error } = await supabase.from('products').update(patch).eq('id', id).eq('restaurant_id', rid);
      if (error) throw new Error(error.message);
    };
    const countOn = async (kind: DailyKind) => {
      const { count, error } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', rid)
        .eq('daily_kind', kind)
        .eq('is_active', true);
      if (error) throw new Error(error.message);
      return count ?? 0;
    };
    /** Enciende respetando el límite; si otra tablet llenó el lugar a la vez, revierte. */
    const turnOn = async (row: DailyRow): Promise<boolean> => {
      if (row.is_active === true) return true;
      if ((await countOn(row.daily_kind)) >= DAILY_LIMITS[row.daily_kind]) return false;
      await setRow(row.id, { is_active: true, in_stock: true, daily_last_on: d.day });
      if ((await countOn(row.daily_kind)) > DAILY_LIMITS[row.daily_kind]) {
        await setRow(row.id, { is_active: false, daily_last_on: row.daily_last_on });
        return false;
      }
      return true;
    };
    const turnOff = async (row: DailyRow) => {
      const patch: Record<string, unknown> = { is_active: false, in_stock: true };
      // Quitado el mismo día: no cuenta para "Igual que ayer" de mañana (Deshacer manda restore con el valor real).
      if (row.daily_last_on === d.day) patch.daily_last_on = null;
      await setRow(row.id, patch);
    };

    let full = false;
    const activated: string[] = [];

    if (action === 'on' && target) {
      full = !(await turnOn(target));
    } else if (action === 'off' && target) {
      if (target.daily_always) return NextResponse.json({ error: 'Es fija' }, { status: 400 });
      await turnOff(target);
    } else if ((action === 'out' || action === 'back') && target) {
      await setRow(target.id, { in_stock: action === 'back' });
    } else if (action === 'swap' && target) {
      const old = byId.get(replaceId as string);
      if (!old || old.daily_kind !== target.daily_kind || old.daily_always) {
        return NextResponse.json({ error: 'No se puede cambiar' }, { status: 400 });
      }
      if (target.is_active !== true) {
        if (old.is_active === true) {
          await turnOff(old);
          await setRow(target.id, { is_active: true, in_stock: true, daily_last_on: d.day });
        } else {
          // Otra tablet ya sacó la vieja: es un "poner" común, con su límite.
          full = !(await turnOn(target));
        }
      }
    } else if (action === 'same') {
      const yesterday = addDays(d.day, -1);
      for (const r of rows) {
        if (r.daily_always || r.is_active === true || r.daily_last_on !== yesterday) continue;
        if (await turnOn(r)) activated.push(r.id);
      }
    }

    for (const [id, v] of restore) await setRow(id, { daily_last_on: v });

    await syncSpecialCategories(supabase, rid);
    await revalidatePublicMenuForRestaurant(supabase, rid);
    const state = toState(await loadRows(supabase, rid), d);
    if (full) return NextResponse.json({ error: 'full', ...state }, { status: 409 });
    return NextResponse.json({ ...state, activated });
  } catch (err: unknown) {
    logger.error('POST today', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
