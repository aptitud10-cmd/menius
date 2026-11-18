// Configuración del Counter por restaurante (tabla counter_settings, migración
// 20261113g). Sin fila = valores por defecto: Firma + Claro.
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_SOUND_THEME, SOUND_THEME_IDS, type SoundThemeId } from './sound-themes';
import { DEFAULT_SCREEN_THEME, SCREEN_THEME_IDS, normalizeScreenThemeId, type ScreenThemeId } from './counter-themes';

export interface CounterSettings {
  soundTheme: SoundThemeId;
  soundVolume: number;
  screenTheme: ScreenThemeId;
  /** Columna custom_accent: se lee y se acepta (tablets con JS viejo), pero la pantalla ya no la usa. */
  customAccent: string | null;
  staffCanCustomize: boolean;
  urgentAfterSeconds: number;
}

export const DEFAULT_COUNTER_SETTINGS: CounterSettings = {
  soundTheme: DEFAULT_SOUND_THEME,
  soundVolume: 80,
  screenTheme: DEFAULT_SCREEN_THEME,
  customAccent: null,
  staffCanCustomize: true,
  urgentAfterSeconds: 30,
};

/** Opciones de "urgente después de" que ofrece el panel. */
export const URGENT_CHOICES = [15, 30, 45, 60] as const;

/** Lo que el Counter puede cambiar (todo opcional; se valida antes de tocar la base). */
export const counterSettingsPatchSchema = z.object({
  soundTheme: z.enum(SOUND_THEME_IDS),
  soundVolume: z.number().int().min(0).max(100),
  screenTheme: z.enum(SCREEN_THEME_IDS),
  customAccent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
  staffCanCustomize: z.boolean(),
  urgentAfterSeconds: z.number().int().min(10).max(600),
}).partial().strict();

export type CounterSettingsPatch = z.infer<typeof counterSettingsPatchSchema>;

export const COUNTER_SETTINGS_COLUMNS =
  'restaurant_id, sound_theme, sound_volume, screen_theme, custom_accent, staff_can_customize, urgent_after_seconds';

export interface CounterSettingsRow {
  restaurant_id?: string;
  sound_theme?: string | null;
  sound_volume?: number | null;
  screen_theme?: string | null;
  custom_accent?: string | null;
  staff_can_customize?: boolean | null;
  urgent_after_seconds?: number | null;
}

/** Fila → configuración. Cualquier valor raro cae al default (nunca rompe el Counter). */
export function rowToSettings(row: CounterSettingsRow | null | undefined): CounterSettings {
  if (!row) return DEFAULT_COUNTER_SETTINGS;
  const d = DEFAULT_COUNTER_SETTINGS;
  const sound = SOUND_THEME_IDS.includes(row.sound_theme as SoundThemeId) ? (row.sound_theme as SoundThemeId) : d.soundTheme;
  // Los 10 temas que ya no existen se leen como Claro u Oscuro según su modo.
  const screen = normalizeScreenThemeId(row.screen_theme);
  const vol = typeof row.sound_volume === 'number' && row.sound_volume >= 0 && row.sound_volume <= 100 ? row.sound_volume : d.soundVolume;
  const urgent = typeof row.urgent_after_seconds === 'number' && row.urgent_after_seconds >= 10 ? row.urgent_after_seconds : d.urgentAfterSeconds;
  return {
    soundTheme: sound,
    soundVolume: vol,
    screenTheme: screen,
    customAccent: row.custom_accent && /^#[0-9A-Fa-f]{6}$/.test(row.custom_accent) ? row.custom_accent : null,
    staffCanCustomize: row.staff_can_customize ?? d.staffCanCustomize,
    urgentAfterSeconds: urgent,
  };
}

export function patchToRow(patch: CounterSettingsPatch): CounterSettingsRow {
  const row: CounterSettingsRow = {};
  if (patch.soundTheme !== undefined) row.sound_theme = patch.soundTheme;
  if (patch.soundVolume !== undefined) row.sound_volume = patch.soundVolume;
  if (patch.screenTheme !== undefined) row.screen_theme = patch.screenTheme;
  if (patch.customAccent !== undefined) row.custom_accent = patch.customAccent;
  if (patch.staffCanCustomize !== undefined) row.staff_can_customize = patch.staffCanCustomize;
  if (patch.urgentAfterSeconds !== undefined) row.urgent_after_seconds = patch.urgentAfterSeconds;
  return row;
}

/**
 * Lee la configuración del Counter. Tolerante: si la consulta falla (tabla aún
 * sin migrar, red), devuelve los defaults — el Counter nunca deja de cargar por esto.
 */
export async function loadCounterSettings(supabase: SupabaseClient, restaurantId: string): Promise<CounterSettings> {
  try {
    const { data, error } = await supabase
      .from('counter_settings')
      .select(COUNTER_SETTINGS_COLUMNS)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();
    if (error) return DEFAULT_COUNTER_SETTINGS;
    return rowToSettings(data as CounterSettingsRow | null);
  } catch {
    return DEFAULT_COUNTER_SETTINGS;
  }
}
