// Apariencia de la pantalla del Counter: solo Claro y Oscuro (rediseño 2026-11-14,
// aprobado por Pedro). Los tokens se aplican como variables CSS (--kds-<token>)
// en el contenedor del Counter y `C` (components/orders/counter/ui.ts) las lee con
// el valor de Claro como respaldo.
//
// Claro = tokens "Apple" (scratchpad r4/apple/spec.md §3). Oscuro = superficies y
// textos del oscuro "Stripe" (canvas #0B0F14, no negro puro) con colores de estado
// aclarados hasta leerse. Contraste verificado en src/__tests__/counter-themes.test.ts.
//
// Los ids siguen siendo los del CHECK de counter_settings.screen_theme (20261113g):
// `menius` = Claro, `midnight` = Oscuro. Así no hace falta migración. Los otros 10
// temas que existieron se mapean por su modo (ver LEGACY_THEME_MODE).

export interface ThemeTokens {
  /** Fondo base (detrás de las tarjetas). */
  bg: string;
  /** Tarjetas, paneles, barra de decisión (superficie elevada). */
  surface: string;
  /** Botones grises y pista del control segmentado. */
  fill: string;
  /** Segmento elegido del control segmentado. */
  thumb: string;
  thumbShadow: string;
  /** Separadores. */
  line: string;
  /** Bordes de inputs y contornos que tienen que verse. */
  lineStrong: string;
  ink: string;
  sub: string;
  /** SOLO decorativo (el "·" entre datos): nunca texto con información. */
  faint: string;
  /** "Nuevo": botón Aceptar, contador de Nuevos, destello de la alerta. */
  accent: string;
  onAccent: string;
  /** Acento como texto. */
  accentText: string;
  /** Punto de "Recibiendo pedidos". */
  status: string;
  /** Delivery, "En camino". */
  blue: string;
  /** Recoger, "El cliente ya llegó". */
  violet: string;
  /** Esperas. */
  amber: string;
  /** "Atrasado". */
  red: string;
  /** Texto de "Rechazar"/"Cancelar" sobre `fill` o `surface`. */
  destructive: string;
  /** Relleno de ALERGIA (el único bloque rojo sólido) y "Sin conexión". */
  critical: string;
  onCritical: string;
  /** "Ojo: su último pedido…", pausado/ocupado. */
  warnBg: string;
  warnText: string;
  /** Barra izquierda del aviso "Ojo" (decorativa). */
  warnBar: string;
  /** Toast, banner demo, vista activa de la barra de arriba. */
  inverse: string;
  onInverse: string;
  /** Superficie de modales y hojas (en Oscuro, un paso más clara que las tarjetas). */
  raised: string;
  /** Borde de 1 px de modales y hojas (en Claro no hace falta: transparente). */
  raisedEdge: string;
  /** Velo detrás de modales y hojas. */
  scrim: string;
}

export type ThemeToken = keyof ThemeTokens;

export type ScreenThemeId = 'menius' | 'midnight';

export interface ScreenTheme {
  id: ScreenThemeId;
  name: { es: string; en: string };
  mode: 'light' | 'dark';
  tokens: ThemeTokens;
}

/** Todo texto del Counter cumple AA. */
export const AA = 4.5;

export const LIGHT_TOKENS: ThemeTokens = {
  bg: '#F2F2F7',
  surface: '#FFFFFF',
  fill: '#EBEBF0',
  thumb: '#FFFFFF',
  thumbShadow: '0 1px 2px rgba(0,0,0,.10), 0 2px 8px rgba(0,0,0,.08)',
  line: '#E5E5EA',
  lineStrong: '#C7C7CC',
  ink: '#000000',
  sub: '#636366',
  faint: '#AEAEB2',
  accent: '#007A6B',
  onAccent: '#FFFFFF',
  accentText: '#007A6B',
  status: '#34C759',
  blue: '#0062E0',
  violet: '#564ADE',
  amber: '#B54D00',
  red: '#D70015',
  destructive: '#C8001A',
  critical: '#D70015',
  onCritical: '#FFFFFF',
  warnBg: '#FFF0E2',
  warnText: '#A84700',
  warnBar: '#D97706',
  inverse: '#1C1C1E',
  onInverse: '#FFFFFF',
  raised: '#FFFFFF',
  raisedEdge: 'rgba(0,0,0,0)',
  scrim: 'rgba(0,0,0,.4)',
};

export const DARK_TOKENS: ThemeTokens = {
  bg: '#0B0F14',
  surface: '#141A21',
  // Gris que se distingue de la tarjeta (1.5:1 de forma) sin bajar el texto `sub` de 4.5:1.
  fill: '#303A46',
  thumb: '#4A5666',
  thumbShadow: '0 1px 3px rgba(0,0,0,.35)',
  line: '#252E38',
  lineStrong: '#34404D',
  ink: '#F1F4F8',
  sub: '#9AA6B5',
  faint: '#5F6B79',
  // El #00C8B3 de Apple se veía neón sobre el oscuro.
  accent: '#2BB394',
  onAccent: '#04211B',
  accentText: '#3CC4A5',
  status: '#2FBF9F',
  blue: '#6FA8F5',
  violet: '#B693F5',
  amber: '#F0A92E',
  red: '#FF6B7A',
  destructive: '#FF8A8F',
  // La alergia se ve igual en los dos modos.
  critical: '#D70015',
  onCritical: '#FFFFFF',
  warnBg: '#2A2210',
  warnText: '#F6C566',
  warnBar: '#F0A92E',
  inverse: '#E6EBF1',
  onInverse: '#0B0F14',
  // Modales y hojas se despegan de lo de atrás: superficie un paso más clara,
  // borde de 1 px y velo más oscuro que en Claro.
  raised: '#1A222B',
  raisedEdge: '#34404D',
  scrim: 'rgba(0,0,0,.66)',
};

export const SCREEN_THEMES: ScreenTheme[] = [
  { id: 'menius', mode: 'light', name: { es: 'Claro', en: 'Light' }, tokens: LIGHT_TOKENS },
  { id: 'midnight', mode: 'dark', name: { es: 'Oscuro', en: 'Dark' }, tokens: DARK_TOKENS },
];

export const DEFAULT_SCREEN_THEME: ScreenThemeId = 'menius';

/** Los únicos ids que se escriben en la base (counterSettingsPatchSchema). */
export const SCREEN_THEME_IDS: [ScreenThemeId, ...ScreenThemeId[]] = ['menius', 'midnight'];

/** Temas que existieron hasta 2026-11-14 y siguen siendo válidos en el CHECK de la base. */
const LEGACY_THEME_MODE: Record<string, ScreenThemeId> = {
  forest: 'midnight', ocean: 'midnight', sunset: 'midnight', royal: 'midnight', espresso: 'midnight', neon: 'midnight',
  daylight: 'menius', diner: 'menius', blush: 'menius', mint: 'menius',
};

/** Id guardado (actual, viejo o basura) → uno de los dos ids vigentes. */
export function normalizeScreenThemeId(id: string | null | undefined): ScreenThemeId {
  if (id && (SCREEN_THEME_IDS as string[]).includes(id)) return id as ScreenThemeId;
  return (id && LEGACY_THEME_MODE[id]) || DEFAULT_SCREEN_THEME;
}

export function getScreenTheme(id: string | null | undefined): ScreenTheme {
  const norm = normalizeScreenThemeId(id);
  return SCREEN_THEMES.find((t) => t.id === norm) ?? SCREEN_THEMES[0];
}

/** Tokens finales de la pantalla. El acento propio (custom_accent) ya no se usa. */
export function resolveThemeTokens(themeId: string | null | undefined): ThemeTokens {
  return getScreenTheme(themeId).tokens;
}

const kebab = (k: string) => k.replace(/[A-Z0-9]+/g, (m) => `-${m.toLowerCase()}`);

/** Variables CSS para el `style` del contenedor del Counter. */
export function themeCssVars(tokens: ThemeTokens): Record<string, string> {
  const vars: Record<string, string> = {};
  (Object.keys(tokens) as ThemeToken[]).forEach((k) => { vars[`--kds-${kebab(k)}`] = tokens[k]; });
  return vars;
}

export function cssVarName(token: ThemeToken): string {
  return `--kds-${kebab(token)}`;
}
