// Temas de pantalla del Counter. Cada tema define TODOS los tokens del objeto
// `C` de components/orders/counter/ui.ts; se aplican como variables CSS
// (--kds-<token>) en el contenedor del Counter, y `C` las lee con su valor de
// siempre como respaldo (las páginas del repartidor, que no tienen tema, no cambian).
//
// `menius` es EXACTAMENTE la paleta que el Counter usaba antes de los temas
// (copiada de `C`): para los restaurantes que no tocan nada, nada cambia.
// Los ids viven también en el CHECK de counter_settings.screen_theme (20261113g).

import { contrast, luminance, mix, shiftLightnessUntil, isHex } from './color-contrast';

/** Tokens que define cada tema a mano. */
export interface BaseTokens {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  ink: string;
  sub: string;
  faint: string;
  black: string;
  onBlack: string;
  green: string;
  greenInk: string;
  greenDeep: string;
  greenSoft: string;
  blue: string; blueSoft: string;
  violet: string; violetSoft: string;
  orange: string; orangeSoft: string;
  amber: string; amberSoft: string;
  red: string; redSoft: string;
  alert: string;
}

/** Tokens finales: los base + los que se derivan de ellos para que todo se lea. */
export interface ThemeTokens extends BaseTokens {
  /** Texto sobre los rellenos de estado (blue/violet/orange/red sólidos). */
  onStatus: string;
  /** Texto sobre `greenInk` usado como relleno (contador de la alerta). */
  onGreenInk: string;
  /** Panel de productos dentro de la alerta de pedido nuevo (acento diluido). */
  alertPanel: string;
  /** Texto principal sobre `alertPanel` (nombres de productos). */
  alertPanelText: string;
  /** Texto secundario sobre `alertPanel` (líneas y precios). */
  alertPanelInk: string;
}

export type ThemeToken = keyof ThemeTokens;

export type ScreenThemeId =
  | 'menius' | 'midnight' | 'forest' | 'ocean' | 'sunset' | 'royal' | 'espresso' | 'neon'
  | 'daylight' | 'diner' | 'blush' | 'mint';

export interface ScreenTheme {
  id: ScreenThemeId;
  name: { es: string; en: string };
  tagline: { es: string; en: string };
  mode: 'light' | 'dark';
  tokens: ThemeTokens;
}

/** El acento se usa como relleno (columna "Nuevos", "Recibiendo pedidos"): tiene que distinguirse del fondo. */
export const ACCENT_MIN_FILL_CONTRAST = 2;
/** Todo texto del Counter cumple AA. */
export const AA = 4.5;

const WHITE = '#FFFFFF';
const NEAR_BLACK = '#0B0F0E';

/** El que más contraste dé entre blanco y casi negro (siempre ≥ 4.5:1 con uno de los dos). */
export function bestTextOn(...fills: string[]): string {
  const min = (t: string) => Math.min(...fills.map((f) => contrast(t, f)));
  return min(WHITE) >= min(NEAR_BLACK) ? WHITE : NEAR_BLACK;
}

/** Completa los tokens derivados. `fixed` fija valores exactos (solo `menius`). */
export function completeTokens(base: BaseTokens, fixed: Partial<ThemeTokens> = {}): ThemeTokens {
  const dark = luminance(base.bg) < 0.2;
  // Antes era rgba(255,255,255,.62) sobre el verde: aquí, opaco, el fondo al 62 %.
  const alertPanel = mix(base.green, base.bg, 0.62);
  const panelOk = (c: string) => contrast(c, alertPanel) >= AA;
  const alertPanelInk = panelOk(base.greenDeep)
    ? base.greenDeep
    : shiftLightnessUntil(base.green, dark ? 1 : -1, panelOk) ?? base.ink;
  const alertPanelText = contrast(base.greenInk, alertPanel) >= AA ? base.greenInk : bestTextOn(alertPanel);
  return {
    ...base,
    alertPanelText,
    onStatus: bestTextOn(base.blue, base.violet, base.orange, base.red),
    onGreenInk: bestTextOn(base.greenInk),
    alertPanel,
    alertPanelInk,
    ...fixed,
  };
}

/** La paleta del Counter antes de los temas (valores de `C`, sin cambios). */
const MENIUS_BASE: BaseTokens = {
  bg: '#FFFFFF',
  surface: '#F2F4F3',
  surface2: '#E8ECEA',
  line: '#E1E6E3',
  ink: '#0E1412',
  sub: '#55605C',
  faint: '#7A8580',
  black: '#111816',
  onBlack: '#FFFFFF',
  green: '#05C8A7',
  greenInk: '#04241E',
  greenDeep: '#047A67',
  greenSoft: '#DFF7F1',
  blue: '#1D4ED8', blueSoft: '#E8EFFF',
  violet: '#6D28D9', violetSoft: '#F1E8FF',
  orange: '#B54708', orangeSoft: '#FFF1E0',
  amber: '#B45309', amberSoft: '#FEF3C7',
  red: '#C81E1E', redSoft: '#FDE8E8',
  alert: '#05C8A7',
};

export const MENIUS_TOKENS: ThemeTokens = completeTokens(MENIUS_BASE, {
  // Los dos colores fijos que tenía la alerta de pedido nuevo.
  alertPanel: '#A0EADE',
  alertPanelInk: '#1B4A41',
});

export const SCREEN_THEMES: ScreenTheme[] = [
  {
    id: 'menius', mode: 'light', tokens: MENIUS_TOKENS,
    name: { es: 'MENIUS', en: 'MENIUS' },
    tagline: { es: 'El verde oficial de MENIUS', en: 'The official MENIUS green' },
  },
  // Los 11 de abajo salen de la investigación de color 2026-11-13 (Toast KDS,
  // NN/g dark mode, Material dark theme, Linear, Apple HIG): bases casi neutras
  // con tinte, un solo acento fuerte, estados aclarados en oscuro. Contraste
  // verificado en src/__tests__/counter-themes.test.ts.
  {
    id: 'midnight', mode: 'dark',
    name: { es: 'Medianoche', en: 'Midnight' },
    tagline: { es: 'Negro profundo, azul eléctrico. Puro foco.', en: 'Deep black, electric blue. Pure focus.' },
    tokens: completeTokens({
      bg: '#06080D', surface: '#121722', surface2: '#1C2333', line: '#263047', ink: '#F1F4FA', sub: '#A4AEC4',
      faint: '#6F7A93', black: '#EAF0FF', onBlack: '#06080D', green: '#2E8BFF', greenInk: '#000814',
      greenDeep: '#6AAEFF', greenSoft: '#0C1F3D', blue: '#A5B4FC', blueSoft: '#1A1D3D', violet: '#D0A6FF',
      violetSoft: '#271840', orange: '#FFAB70', orangeSoft: '#33200F', amber: '#FACC5A', amberSoft: '#2E2507',
      red: '#FF7B7B', redSoft: '#3B1418', alert: '#3D9BFF',
    }),
  },
  {
    id: 'forest', mode: 'dark',
    name: { es: 'Bosque', en: 'Forest' },
    tagline: { es: 'Verde bosque con botones de oro.', en: 'Forest green with golden buttons.' },
    tokens: completeTokens({
      bg: '#07120E', surface: '#0E1D17', surface2: '#172A22', line: '#22392F', ink: '#EEF5EF', sub: '#A3B8AB',
      faint: '#6E8679', black: '#E2C277', onBlack: '#1A1405', green: '#3DDC97', greenInk: '#03251A',
      greenDeep: '#5EE3A8', greenSoft: '#0F2E22', blue: '#93B8FF', blueSoft: '#14223A', violet: '#C9A8FF',
      violetSoft: '#231A38', orange: '#FFAD6E', orangeSoft: '#2F1F10', amber: '#F5C451', amberSoft: '#2A2409',
      red: '#FF8080', redSoft: '#36171A', alert: '#4AF0A8',
    }),
  },
  {
    id: 'ocean', mode: 'dark',
    name: { es: 'Océano', en: 'Ocean' },
    tagline: { es: 'Azul abismo y turquesa que brilla.', en: 'Abyss blue and glowing teal.' },
    tokens: completeTokens({
      bg: '#04111C', surface: '#0A1C2C', surface2: '#12283C', line: '#1D354D', ink: '#EAF6FB', sub: '#9DB7C6',
      faint: '#6A8597', black: '#EAF6FB', onBlack: '#04111C', green: '#2DD4BF', greenInk: '#022622',
      greenDeep: '#4FE0CC', greenSoft: '#0A2E33', blue: '#8FB8FF', blueSoft: '#13233F', violet: '#C6A8FF',
      violetSoft: '#221B3D', orange: '#FFAD70', orangeSoft: '#2E1F12', amber: '#F7C75A', amberSoft: '#2A2410',
      red: '#FF7F86', redSoft: '#351820', alert: '#3BE8D0',
    }),
  },
  {
    id: 'sunset', mode: 'dark',
    name: { es: 'Atardecer', en: 'Sunset' },
    tagline: { es: 'Grafito cálido encendido en coral.', en: 'Warm graphite lit in coral.' },
    tokens: completeTokens({
      bg: '#0F0F11', surface: '#1A1A1E', surface2: '#252529', line: '#313136', ink: '#F7F3F0', sub: '#B4ABA6',
      faint: '#7F7772', black: '#F7F3F0', onBlack: '#0F0F11', green: '#FF7A5C', greenInk: '#2A0B03',
      greenDeep: '#FF9A80', greenSoft: '#3A1B14', blue: '#8EB4FF', blueSoft: '#15213A', violet: '#C8A8FF',
      violetSoft: '#241B38', orange: '#FFB65C', orangeSoft: '#33240F', amber: '#F2CF55', amberSoft: '#2C2709',
      red: '#FF6B81', redSoft: '#3A1520', alert: '#FF8A5C',
    }),
  },
  {
    id: 'royal', mode: 'dark',
    name: { es: 'Real', en: 'Royal' },
    tagline: { es: 'Morado imperial, destellos de champagne.', en: 'Imperial purple, champagne sparkle.' },
    tokens: completeTokens({
      bg: '#0E0A1A', surface: '#1B1530', surface2: '#261D40', line: '#2F2550', ink: '#F5F0FF', sub: '#B5A9D1',
      faint: '#7E7399', black: '#F5F0FF', onBlack: '#0E0A1A', green: '#E6C98F', greenInk: '#2A1D05',
      greenDeep: '#EBD3A1', greenSoft: '#2A2216', blue: '#92B4FF', blueSoft: '#17213F', violet: '#C9A6FF',
      violetSoft: '#2A1C4A', orange: '#FFAC6E', orangeSoft: '#33200F', amber: '#F7C64F', amberSoft: '#2E2509',
      red: '#FF7D8A', redSoft: '#3A1522', alert: '#F2D59A',
    }),
  },
  {
    id: 'espresso', mode: 'dark',
    name: { es: 'Espresso', en: 'Espresso' },
    tagline: { es: 'Café tostado, crema y cobre.', en: 'Roasted coffee, cream and copper.' },
    tokens: completeTokens({
      bg: '#120C09', surface: '#211813', surface2: '#2D221A', line: '#382A20', ink: '#F7EDE2', sub: '#C1AE9C',
      faint: '#8C7867', black: '#D4895A', onBlack: '#1A0E06', green: '#F2DDB8', greenInk: '#2A1A0C',
      greenDeep: '#EBD1A6', greenSoft: '#2E2318', blue: '#98B8FF', blueSoft: '#18213A', violet: '#CBAAFF',
      violetSoft: '#261C36', orange: '#FFAA6B', orangeSoft: '#36210F', amber: '#F4C85A', amberSoft: '#2E260B',
      red: '#FF8282', redSoft: '#3B1715', alert: '#F7E3BF',
    }),
  },
  {
    id: 'neon', mode: 'dark',
    name: { es: 'Neón', en: 'Neon' },
    tagline: { es: 'Noche de Miami: magenta y cian.', en: 'Miami night: magenta and cyan.' },
    tokens: completeTokens({
      bg: '#050308', surface: '#140E1C', surface2: '#1F1629', line: '#2A1D3A', ink: '#F8F2FF', sub: '#B9AACB',
      faint: '#7E7094', black: '#22E4FF', onBlack: '#001A20', green: '#FF3DC0', greenInk: '#2B0020',
      greenDeep: '#FF7AD5', greenSoft: '#33102A', blue: '#7FB7FF', blueSoft: '#10203D', violet: '#C29BFF',
      violetSoft: '#22173F', orange: '#FFA866', orangeSoft: '#33200F', amber: '#FFD24D', amberSoft: '#2E2608',
      red: '#FF6B6B', redSoft: '#3A1216', alert: '#00F0FF',
    }),
  },
  {
    id: 'daylight', mode: 'light',
    name: { es: 'Día', en: 'Daylight' },
    tagline: { es: 'Máximo contraste para pleno sol.', en: 'Maximum contrast for full sun.' },
    tokens: completeTokens({
      bg: '#FFFFFF', surface: '#EEF1F6', surface2: '#E2E7EF', line: '#D5DCE6', ink: '#05080F', sub: '#3C4555',
      faint: '#6A7383', black: '#05080F', onBlack: '#FFFFFF', green: '#0A66FF', greenInk: '#FFFFFF',
      greenDeep: '#0050D6', greenSoft: '#E3EDFF', blue: '#1D3FC4', blueSoft: '#E7ECFF', violet: '#6B21C8',
      violetSoft: '#F2E8FF', orange: '#B54708', orangeSoft: '#FFF0DF', amber: '#B45309', amberSoft: '#FEF3C7',
      red: '#C0141A', redSoft: '#FDE7E7', alert: '#0A66FF',
    }),
  },
  {
    id: 'diner', mode: 'light',
    name: { es: 'Diner', en: 'Diner' },
    tagline: { es: 'Diner clásico: crema, cereza y cromo.', en: 'Classic diner: cream, cherry and chrome.' },
    tokens: completeTokens({
      bg: '#FBF5E9', surface: '#F1E7D3', surface2: '#E7DABF', line: '#D2CCC2', ink: '#1C1412', sub: '#5A4A40',
      faint: '#7F6E62', black: '#B3122E', onBlack: '#FFF8EC', green: '#3CC7B5', greenInk: '#062A26',
      greenDeep: '#0B6E62', greenSoft: '#DCF2EC', blue: '#1D4ED8', blueSoft: '#E6ECFB', violet: '#6D28D9',
      violetSoft: '#EFE6FB', orange: '#B04A08', orangeSoft: '#FCEBD6', amber: '#A0520A', amberSoft: '#FAEBC2',
      red: '#C41A1A', redSoft: '#FADFDB', alert: '#2CC4B0',
    }),
  },
  {
    id: 'blush', mode: 'light',
    name: { es: 'Rosa', en: 'Blush' },
    tagline: { es: 'Blanco cálido con rosa palo elegante.', en: 'Warm white with elegant soft pink.' },
    tokens: completeTokens({
      bg: '#FFFBF9', surface: '#F8ECEA', surface2: '#F0DEDB', line: '#EAD5D1', ink: '#24161A', sub: '#5E4A4F',
      faint: '#85707A', black: '#2A1A1F', onBlack: '#FFF5F3', green: '#E8899F', greenInk: '#3A0C18',
      greenDeep: '#A3304F', greenSoft: '#FBE3E8', blue: '#1D4ED8', blueSoft: '#E8EEFF', violet: '#6D28D9',
      violetSoft: '#F1E8FF', orange: '#B54708', orangeSoft: '#FFEEDD', amber: '#A85208', amberSoft: '#FDF0C7',
      red: '#C21A1A', redSoft: '#FDE4E1', alert: '#E5627F',
    }),
  },
  {
    id: 'mint', mode: 'light',
    name: { es: 'Menta', en: 'Mint' },
    tagline: { es: 'Blanco fresco con verde menta.', en: 'Fresh white with mint green.' },
    tokens: completeTokens({
      bg: '#FCFFFD', surface: '#EBF6F0', surface2: '#DCEEE4', line: '#D2E6DA', ink: '#0B1A14', sub: '#475A51',
      faint: '#6E8279', black: '#0F2A20', onBlack: '#F2FFF8', green: '#4BE0A8', greenInk: '#032A1C',
      greenDeep: '#087A52', greenSoft: '#DDF8EC', blue: '#1D4ED8', blueSoft: '#E8EFFF', violet: '#6D28D9',
      violetSoft: '#F1E8FF', orange: '#B54708', orangeSoft: '#FFF1E0', amber: '#B45309', amberSoft: '#FEF3C7',
      red: '#C81E1E', redSoft: '#FDE8E8', alert: '#2FD99A',
    }),
  },
];

export const DEFAULT_SCREEN_THEME: ScreenThemeId = 'menius';

/** Fila "Recomendados" (MENIUS va aparte, destacado): el que impresiona en la demo,
 *  el que se lee en cualquier mostrador y el que se siente de restaurante. */
export const RECOMMENDED_SCREEN_THEMES: ScreenThemeId[] = ['midnight', 'daylight', 'forest'];

export const SCREEN_THEME_IDS: [ScreenThemeId, ...ScreenThemeId[]] = [
  'menius', 'midnight', 'forest', 'ocean', 'sunset', 'royal', 'espresso', 'neon',
  'daylight', 'diner', 'blush', 'mint',
];

export function getScreenTheme(id: ScreenThemeId | string | null | undefined): ScreenTheme {
  return SCREEN_THEMES.find((t) => t.id === id) ?? SCREEN_THEMES[0];
}

// ─── Acento personalizado ────────────────────────────────────────────────────


export type AccentResult =
  | { ok: true; tokens: Pick<BaseTokens, 'green' | 'greenInk' | 'greenDeep' | 'greenSoft' | 'alert'> }
  | { ok: false; suggestion: string | null };

/**
 * Deriva del color elegido los tokens del acento sobre un tema base:
 *  - green: el color tal cual (rellenos).
 *  - greenInk: blanco o casi negro, el que más contraste dé (siempre ≥ 4.5:1).
 *  - greenSoft: el color diluido en el fondo (fondos suaves).
 *  - greenDeep: el color movido en luminosidad hasta leerse como texto (≥ 4.5:1)
 *    sobre el fondo, las tarjetas y su propio fondo suave.
 * Si el color casi no se distingue del fondo, se bloquea y se sugiere el más
 * cercano (mismo tono y saturación) que sí.
 */
export function deriveAccent(accent: string, base: ScreenTheme): AccentResult {
  if (!isHex(accent)) return { ok: false, suggestion: null };
  const { bg, surface } = base.tokens;
  const darkBg = base.mode === 'dark';
  if (contrast(accent, bg) < ACCENT_MIN_FILL_CONTRAST) {
    const suggestion = shiftLightnessUntil(accent, darkBg ? 1 : -1, (c) => contrast(c, bg) >= ACCENT_MIN_FILL_CONTRAST);
    return { ok: false, suggestion };
  }
  const green = accent.toUpperCase();
  const greenInk = bestTextOn(green);
  const greenSoft = mix(green, bg, darkBg ? 0.8 : 0.86);
  const readable = (c: string) => contrast(c, bg) >= AA && contrast(c, surface) >= AA && contrast(c, greenSoft) >= AA;
  const greenDeep = readable(green)
    ? green
    : shiftLightnessUntil(green, darkBg ? 1 : -1, readable) ?? base.tokens.ink;
  return { ok: true, tokens: { green, greenInk, greenDeep, greenSoft, alert: green } };
}

/** Tokens finales: tema + acento propio (si es válido). */
export function resolveThemeTokens(themeId: string | null | undefined, customAccent: string | null | undefined): ThemeTokens {
  const theme = getScreenTheme(themeId);
  if (!customAccent) return theme.tokens;
  const r = deriveAccent(customAccent, theme);
  if (!r.ok) return theme.tokens;
  // Los derivados (panel de la alerta, etc.) se recalculan con el acento nuevo.
  const { onStatus: _a, onGreenInk: _b, alertPanel: _c, alertPanelInk: _d, alertPanelText: _e, ...base } = theme.tokens;
  return completeTokens({ ...base, ...r.tokens });
}

const kebab = (k: string) => k.replace(/[A-Z0-9]+/g, (m) => `-${m.toLowerCase()}`);

/** Variables CSS para el `style` del contenedor del Counter. */
export function themeCssVars(tokens: ThemeTokens): Record<string, string> {
  const vars: Record<string, string> = {};
  (Object.keys(tokens) as ThemeToken[]).forEach((k) => { vars[`--kds-${kebab(k)}`] = tokens[k]; });
  // Alias con los nombres del brief.
  vars['--kds-text'] = tokens.ink;
  vars['--kds-muted'] = tokens.sub;
  vars['--kds-accent'] = tokens.green;
  vars['--kds-success'] = tokens.green;
  return vars;
}

export function cssVarName(token: ThemeToken): string {
  return `--kds-${kebab(token)}`;
}
