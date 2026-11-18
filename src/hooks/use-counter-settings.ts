'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import {
  rowToSettings, COUNTER_SETTINGS_COLUMNS,
  type CounterSettings, type CounterSettingsPatch, type CounterSettingsRow,
} from '@/lib/counter-settings';
import { saveCounterSettings, type SaveCounterSettingsResult } from '@/lib/actions/counter-settings';

/**
 * Sonido / colores / volumen del Counter, sincronizados en vivo entre todas las
 * tablets del restaurante (Realtime sobre counter_settings, que respeta RLS) y
 * releídos al volver a la pestaña por si se perdió un evento.
 * `live = false` (vista previa de desarrollo): todo queda local, sin servidor.
 */
export function useCounterSettings(restaurantId: string, initial: CounterSettings, live = true) {
  const [settings, setSettings] = useState<CounterSettings>(initial);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    if (!live) return;
    const supabase = getSupabaseBrowser();
    const refetch = () => {
      supabase.from('counter_settings').select(COUNTER_SETTINGS_COLUMNS).eq('restaurant_id', restaurantId).maybeSingle()
        .then(({ data, error }) => { if (!error) setSettings(rowToSettings(data as CounterSettingsRow | null)); });
    };
    const channel = supabase
      .channel(`counter-settings:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'counter_settings', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          const row = payload.new as CounterSettingsRow | null;
          if (row && row.restaurant_id) setSettings(rowToSettings(row));
        },
      )
      .subscribe();
    const onVisible = () => { if (document.visibilityState === 'visible') refetch(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, live]);

  /** Guarda (optimista; si el servidor dice que no, vuelve atrás). */
  const save = useCallback(async (patch: CounterSettingsPatch): Promise<SaveCounterSettingsResult> => {
    const before = settingsRef.current;
    const next = { ...before, ...patch } as CounterSettings;
    setSettings(next);
    if (!live) return { ok: true, settings: next };
    try {
      const res = await saveCounterSettings(patch);
      setSettings(res.ok ? res.settings : before);
      return res;
    } catch {
      setSettings(before);
      return { ok: false, error: 'db' };
    }
  }, [live]);

  return { settings, save };
}
