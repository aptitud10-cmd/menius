import { describe, it, expect } from 'vitest';
import { contrast } from '@/lib/color-contrast';
import {
  SCREEN_THEMES, SCREEN_THEME_IDS, MENIUS_TOKENS, deriveAccent, resolveThemeTokens, themeCssVars,
  getScreenTheme, ACCENT_MIN_FILL_CONTRAST, type ThemeTokens,
} from '@/lib/counter-themes';
import { C } from '@/components/orders/counter/ui';

// Lo que el Counter dibuja de verdad con cada par de tokens. Si un tema nuevo no
// cumple, este test falla: no se puede agregar un tema ilegible.
function checks(t: ThemeTokens): [string, number, number][] {
  const states = ['blue', 'violet', 'orange', 'amber', 'red'] as const;
  return [
    ['ink/bg', contrast(t.ink, t.bg), 7],
    ['ink/surface', contrast(t.ink, t.surface), 7],
    ['ink/surface2', contrast(t.ink, t.surface2), 7],
    ['sub/bg', contrast(t.sub, t.bg), 4.5],
    ['sub/surface', contrast(t.sub, t.surface), 4.5],
    ['faint/bg', contrast(t.faint, t.bg), 3],
    ['onBlack/black', contrast(t.onBlack, t.black), 4.5],
    ['greenInk/green', contrast(t.greenInk, t.green), 4.5],
    ['greenDeep/bg', contrast(t.greenDeep, t.bg), 4.5],
    ['greenDeep/surface', contrast(t.greenDeep, t.surface), 4.5],
    ['greenDeep/greenSoft', contrast(t.greenDeep, t.greenSoft), 4.5],
    ['onGreenInk/greenInk', contrast(t.onGreenInk, t.greenInk), 4.5],
    ['alertPanelInk/alertPanel', contrast(t.alertPanelInk, t.alertPanel), 4.5],
    ['alertPanelText/alertPanel', contrast(t.alertPanelText, t.alertPanel), 4.5],
    ['red/bg (alergia en la alerta)', contrast(t.red, t.bg), 4.5],
    ...states.flatMap((s): [string, number, number][] => [
      [`${s}/${s}Soft`, contrast(t[s], t[`${s}Soft`]), 4.5],
      [`${s}/surface`, contrast(t[s], t.surface), 3],
    ]),
    // Rellenos sólidos con texto encima: tag de tipo, chip "moviendo", toast de error.
    ...(['blue', 'violet', 'red'] as const).map((s): [string, number, number] => [`onStatus/${s}`, contrast(t.onStatus, t[s]), 4.5]),
  ];
}

describe('temas de pantalla del Counter', () => {
  it('hay un tema por cada id del CHECK de la base, sin repetidos', () => {
    expect(SCREEN_THEMES.map((t) => t.id).sort()).toEqual([...SCREEN_THEME_IDS].sort());
  });

  it('menius es exactamente la paleta que el Counter usaba antes', () => {
    expect(MENIUS_TOKENS).toMatchObject({
      bg: '#FFFFFF', surface: '#F2F4F3', surface2: '#E8ECEA', line: '#E1E6E3', ink: '#0E1412',
      sub: '#55605C', faint: '#7A8580', black: '#111816', onBlack: '#FFFFFF', green: '#05C8A7',
      greenInk: '#04241E', greenDeep: '#047A67', greenSoft: '#DFF7F1', blue: '#1D4ED8', blueSoft: '#E8EFFF',
      violet: '#6D28D9', violetSoft: '#F1E8FF', orange: '#B54708', orangeSoft: '#FFF1E0', amber: '#B45309',
      amberSoft: '#FEF3C7', red: '#C81E1E', redSoft: '#FDE8E8',
      // Los fijos de antes: texto blanco sobre estados/botón, panel de la alerta.
      onStatus: '#FFFFFF', onGreenInk: '#FFFFFF', alertPanel: '#A0EADE', alertPanelInk: '#1B4A41',
      alertPanelText: '#04241E',
    });
  });

  it('C usa variables del tema con el valor de menius como respaldo', () => {
    expect(C.bg).toBe('var(--kds-bg, #FFFFFF)');
    expect(C.surface2).toBe('var(--kds-surface-2, #E8ECEA)');
    expect(C.greenDeep).toBe('var(--kds-green-deep, #047A67)');
    expect(themeCssVars(MENIUS_TOKENS)['--kds-surface-2']).toBe('#E8ECEA');
  });

  for (const theme of SCREEN_THEMES.filter((t) => t.id !== 'menius')) {
    it(`${theme.id}: todo el texto cumple su mínimo de contraste`, () => {
      const fails = checks(theme.tokens).filter(([, r, min]) => r < min).map(([k, r, min]) => `${k} ${r.toFixed(2)} < ${min}`);
      expect(fails).toEqual([]);
    });
  }

  it('el tema desconocido cae a menius', () => {
    expect(getScreenTheme('nope').id).toBe('menius');
  });
});

describe('acento personalizado', () => {
  const samples = ['#E11D48', '#7C3AED', '#0EA5E9', '#F59E0B', '#22C55E', '#111111', '#FFD700', '#8B4513'];

  for (const theme of SCREEN_THEMES) {
    it(`${theme.id}: cualquier acento aceptado deja todo legible`, () => {
      for (const hex of samples) {
        const r = deriveAccent(hex, theme);
        if (!r.ok) {
          // Bloqueado: hay sugerencia y la sugerencia sí se acepta.
          expect(r.suggestion).not.toBeNull();
          expect(deriveAccent(r.suggestion!, theme).ok).toBe(true);
          continue;
        }
        const t = resolveThemeTokens(theme.id, hex);
        expect(contrast(t.green, t.bg)).toBeGreaterThanOrEqual(ACCENT_MIN_FILL_CONTRAST);
        expect(contrast(t.greenInk, t.green)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.greenDeep, t.bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.greenDeep, t.surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.greenDeep, t.greenSoft)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.alertPanelInk, t.alertPanel)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.alertPanelText, t.alertPanel)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.onGreenInk, t.greenInk)).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it('bloquea un acento que se pierde en el fondo y sugiere uno cercano', () => {
    const r = deriveAccent('#FFF4F4', getScreenTheme('menius'));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.suggestion).toMatch(/^#[0-9A-F]{6}$/);
      expect(contrast(r.suggestion!, '#FFFFFF')).toBeGreaterThanOrEqual(ACCENT_MIN_FILL_CONTRAST);
    }
  });

  it('un acento inválido no rompe: se usa el tema tal cual', () => {
    expect(resolveThemeTokens('menius', 'rojo')).toEqual(MENIUS_TOKENS);
  });
});
