'use server';

import { getTenant } from '@/lib/auth/get-tenant';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';
import {
  counterSettingsPatchSchema, patchToRow, rowToSettings, loadCounterSettings,
  COUNTER_SETTINGS_COLUMNS, type CounterSettings, type CounterSettingsRow,
} from '@/lib/counter-settings';

const logger = createLogger('counter-settings');

export type SaveCounterSettingsResult =
  | { ok: true; settings: CounterSettings }
  | { ok: false; error: 'invalid' | 'unauthorized' | 'locked' | 'owner_only' | 'db' };

/**
 * Guarda sonido / colores / volumen del Counter.
 * - Tablet vinculada (sesión de dispositivo): solo si el dueño dejó
 *   staff_can_customize encendido, y nunca puede cambiar ese permiso.
 * - Dueño con sesión: todo.
 * Escribe con el cliente del servidor (RLS: solo el dueño de la tienda).
 */
export async function saveCounterSettings(input: unknown): Promise<SaveCounterSettingsResult> {
  const parsed = counterSettingsPatchSchema.safeParse(input);
  if (!parsed.success || Object.keys(parsed.data).length === 0) return { ok: false, error: 'invalid' };
  const patch = parsed.data;

  const tenant = await getTenant({ allowDevice: true });
  if (!tenant) return { ok: false, error: 'unauthorized' };

  const supabase = await createClient();

  if (tenant.isDevice) {
    if (patch.staffCanCustomize !== undefined) return { ok: false, error: 'owner_only' };
    const current = await loadCounterSettings(supabase, tenant.restaurantId);
    if (!current.staffCanCustomize) return { ok: false, error: 'locked' };
  }

  const { data, error } = await supabase
    .from('counter_settings')
    .upsert(
      {
        restaurant_id: tenant.restaurantId,
        ...patchToRow(patch),
        updated_at: new Date().toISOString(),
        updated_by: tenant.userId,
      },
      { onConflict: 'restaurant_id' },
    )
    .select(COUNTER_SETTINGS_COLUMNS)
    .maybeSingle();

  if (error) {
    logger.error('saveCounterSettings failed', { message: error.message, code: error.code });
    return { ok: false, error: 'db' };
  }
  return { ok: true, settings: rowToSettings(data as CounterSettingsRow | null) };
}
