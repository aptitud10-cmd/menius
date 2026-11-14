import { describe, it, expect } from 'vitest';
import { contrast, mix } from '@/lib/color-contrast';
import {
  SCREEN_THEMES, SCREEN_THEME_IDS, LIGHT_TOKENS, DARK_TOKENS, resolveThemeTokens, themeCssVars,
  getScreenTheme, normalizeScreenThemeId, type ThemeTokens,
} from '@/lib/counter-themes';
import { rowToSettings, counterSettingsPatchSchema } from '@/lib/counter-settings';
import { C, DRIVER_C } from '@/components/orders/counter/ui';

// Cada par texto/fondo que el Counter dibuja de verdad. Si un valor nuevo no
// cumple, este test falla: no se puede dejar una apariencia ilegible.
function checks(t: ThemeTokens): [string, number, number][] {
  return [
    // Texto principal y secundario sobre todas las superficies.
    ...(['bg', 'surface', 'fill', 'thumb'] as const).map((s): [string, number, number] => [`ink/${s}`, contrast(t.ink, t[s]), 4.5]),
    ...(['bg', 'surface', 'fill', 'raised'] as const).map((s): [string, number, number] => [`sub/${s}`, contrast(t.sub, t[s]), 4.5]),
    // Modales y hojas.
    ['ink/raised', contrast(t.ink, t.raised), 4.5],
    ['destructive/raised', contrast(t.destructive, t.raised), 4.5],
    ['accentText/raised', contrast(t.accentText, t.raised), 4.5],
    ['warnText/raised', contrast(t.warnText, t.raised), 4.5],
    ['blue/raised', contrast(t.blue, t.raised), 4.5],
    // "Nuevo": Aceptar, contador de Nuevos, cápsula "N pedidos nuevos".
    ['onAccent/accent', contrast(t.onAccent, t.accent), 4.5],
    ['accentText/surface', contrast(t.accentText, t.surface), 4.5],
    ['accentText/bg', contrast(t.accentText, t.bg), 4.5],
    // Tipo de pedido (tarjeta = surface, alerta = bg) y tiempos.
    ...(['blue', 'violet', 'amber', 'red'] as const).flatMap((k): [string, number, number][] => [
      [`${k}/surface`, contrast(t[k], t.surface), 4.5],
      [`${k}/bg`, contrast(t[k], t.bg), 4.5],
    ]),
    // "El cliente ya llegó": índigo sobre su fondo al 12 %.
    ['violet/violet12', contrast(t.violet, mix(t.surface, t.violet, 0.12)), 4.5],
    // Rechazar / Cancelar / PIN incorrecto.
    ['destructive/fill', contrast(t.destructive, t.fill), 4.5],
    ['destructive/surface', contrast(t.destructive, t.surface), 4.5],
    // Alergia y "Sin conexión": el único relleno rojo.
    ['onCritical/critical', contrast(t.onCritical, t.critical), 4.5],
    // "Ojo: su último pedido…", pausado, ocupado.
    ['warnText/warnBg', contrast(t.warnText, t.warnBg), 4.5],
    // Toast, banner demo, vista activa.
    ['onInverse/inverse', contrast(t.onInverse, t.inverse), 4.5],
  ];
}

describe('apariencias del Counter (Claro / Oscuro)', () => {
  it('solo dos apariencias, con los ids del CHECK de la base', () => {
    expect(SCREEN_THEMES.map((t) => t.id)).toEqual(['menius', 'midnight']);
    expect([...SCREEN_THEME_IDS]).toEqual(['menius', 'midnight']);
    expect(getScreenTheme('menius')).toMatchObject({ mode: 'light', name: { es: 'Claro', en: 'Light' } });
    expect(getScreenTheme('midnight')).toMatchObject({ mode: 'dark', name: { es: 'Oscuro', en: 'Dark' } });
  });

  for (const theme of SCREEN_THEMES) {
    it(`${theme.name.es}: todo el texto cumple AA`, () => {
      const fails = checks(theme.tokens).filter(([, r, min]) => r < min).map(([k, r, min]) => `${k} ${r.toFixed(2)} < ${min}`);
      expect(fails).toEqual([]);
    });
  }

  it('la alergia es el mismo rojo sólido con texto blanco en los dos modos', () => {
    expect(LIGHT_TOKENS.critical).toBe(DARK_TOKENS.critical);
    expect(LIGHT_TOKENS.onCritical).toBe('#FFFFFF');
    expect(DARK_TOKENS.onCritical).toBe('#FFFFFF');
  });

  it('Oscuro: los botones grises se distinguen de la tarjeta y del fondo', () => {
    expect(contrast(DARK_TOKENS.fill, DARK_TOKENS.surface)).toBeGreaterThanOrEqual(1.5);
    expect(contrast(DARK_TOKENS.fill, DARK_TOKENS.bg)).toBeGreaterThanOrEqual(1.5);
    // Los modales se despegan de las tarjetas: superficie más clara y borde visible.
    expect(contrast(DARK_TOKENS.raised, DARK_TOKENS.surface)).toBeGreaterThan(1.05);
    expect(contrast(DARK_TOKENS.raisedEdge, DARK_TOKENS.raised)).toBeGreaterThanOrEqual(1.5);
    // El segmento elegido se despega de la pista.
    expect(contrast(DARK_TOKENS.thumb, DARK_TOKENS.fill)).toBeGreaterThanOrEqual(1.5);
  });

  it('los temas viejos se leen como Claro u Oscuro según su modo', () => {
    for (const id of ['forest', 'ocean', 'sunset', 'royal', 'espresso', 'neon']) expect(normalizeScreenThemeId(id)).toBe('midnight');
    for (const id of ['daylight', 'diner', 'blush', 'mint']) expect(normalizeScreenThemeId(id)).toBe('menius');
    expect(normalizeScreenThemeId('nope')).toBe('menius');
    expect(normalizeScreenThemeId(null)).toBe('menius');
    expect(getScreenTheme('neon').id).toBe('midnight');
    expect(rowToSettings({ screen_theme: 'forest' }).screenTheme).toBe('midnight');
    expect(rowToSettings({ screen_theme: 'diner' }).screenTheme).toBe('menius');
  });

  it('solo se pueden guardar los dos ids nuevos', () => {
    expect(counterSettingsPatchSchema.safeParse({ screenTheme: 'midnight' }).success).toBe(true);
    expect(counterSettingsPatchSchema.safeParse({ screenTheme: 'forest' }).success).toBe(false);
  });

  it('el acento propio guardado ya no cambia la pantalla', () => {
    expect(resolveThemeTokens('menius')).toBe(LIGHT_TOKENS);
    expect(resolveThemeTokens('midnight')).toBe(DARK_TOKENS);
  });

  it('C usa variables de la apariencia con Claro como respaldo', () => {
    expect(C.bg).toBe('var(--kds-bg, #F2F2F7)');
    expect(C.accent).toBe('var(--kds-accent, #007A6B)');
    expect(C.onCritical).toBe('var(--kds-on-critical, #FFFFFF)');
    expect(themeCssVars(DARK_TOKENS)['--kds-on-accent']).toBe('#04211B');
    expect(themeCssVars(DARK_TOKENS)['--kds-thumb-shadow']).toBe(DARK_TOKENS.thumbShadow);
  });
});

describe('páginas del repartidor', () => {
  it('siguen con EXACTAMENTE los colores de antes del rediseño', () => {
    expect(DRIVER_C).toEqual({
      bg: '#FFFFFF', surface: '#F2F4F3', surface2: '#E8ECEA', line: '#E1E6E3', ink: '#0E1412',
      sub: '#55605C', faint: '#7A8580', black: '#111816', onBlack: '#FFFFFF', green: '#05C8A7',
      greenInk: '#04241E', greenDeep: '#047A67', greenSoft: '#DFF7F1', blue: '#1D4ED8', blueSoft: '#E8EFFF',
      violet: '#6D28D9', violetSoft: '#F1E8FF', orange: '#B54708', orangeSoft: '#FFF1E0', amber: '#B45309',
      amberSoft: '#FEF3C7', red: '#C81E1E', redSoft: '#FDE8E8',
    });
  });
});
