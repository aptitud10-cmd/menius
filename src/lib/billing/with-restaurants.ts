import type { createAdminClient } from '@/lib/supabase/admin';

type Db = ReturnType<typeof createAdminClient>;

/**
 * Le pega a cada fila de `subscriptions` su restaurante en `restaurants`, igual
 * que hacía el embed `restaurants(...)`. El embed NO sirve acá: subscriptions no
 * tiene FK a restaurants y PostgREST responde "Could not find a relationship"
 * — así fallaban dunning (48/48 desde agosto) y el aviso de fin de prueba
 * (nunca mandó uno: leía el error como "no hay pruebas por vencer").
 */
export async function withRestaurants<R extends { restaurant_id: string | null }>(
  db: Db,
  rows: R[],
  columns: string,
): Promise<{ rows: (R & { restaurants: Record<string, unknown> | null })[]; error: string | null }> {
  const ids = Array.from(new Set(rows.map((r) => r.restaurant_id).filter((id): id is string => !!id)));
  if (ids.length === 0) return { rows: rows.map((r) => ({ ...r, restaurants: null })), error: null };

  const { data, error } = await db.from('restaurants').select(`id, ${columns}`).in('id', ids);
  if (error) return { rows: [], error: error.message };

  const byId = new Map(
    ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => [r.id as string, r]),
  );
  return {
    rows: rows.map((r) => ({ ...r, restaurants: (r.restaurant_id && byId.get(r.restaurant_id)) || null })),
    error: null,
  };
}
