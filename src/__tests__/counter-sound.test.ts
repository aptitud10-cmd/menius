import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import path from 'path';
import { loopIntervalMs, ringKind, pickAcceptedIndex, RING_EVERY_MS } from '@/components/orders/counter/audio';
import { SOUND_THEMES, SOUND_THEME_IDS, soundUrls, FALLBACK_SOUNDS, RECOMMENDED_SOUND_THEMES } from '@/lib/sound-themes';
import { rowToSettings, counterSettingsPatchSchema, patchToRow, DEFAULT_COUNTER_SETTINGS } from '@/lib/counter-settings';
import { demoScript, isDemoId } from '@/components/orders/counter/demo';

describe('motor de audio del Counter', () => {
  it('la alerta se repite cada 3.5 s, o al terminar el clip si dura más', () => {
    expect(loopIntervalMs(1.7)).toBe(RING_EVERY_MS);
    expect(loopIntervalMs(4.7)).toBe(5100); // guillermo-tell: no se pisa
    expect(loopIntervalMs(0)).toBe(RING_EVERY_MS);
    expect(loopIntervalMs(NaN)).toBe(RING_EVERY_MS);
  });

  it('pasa a urgente cuando el pendiente más viejo supera el umbral', () => {
    expect(ringKind(null, 30)).toBe('alert');
    expect(ringKind(29_999, 30)).toBe('alert');
    expect(ringKind(30_000, 30)).toBe('urgent');
    expect(ringKind(10_000, 10)).toBe('urgent'); // demo
  });

  it('la aceptada nunca repite la anterior', () => {
    let prev: number | null = null;
    for (let i = 0; i < 200; i++) {
      const next = pickAcceptedIndex([0, 1, 2], prev);
      expect(next).not.toBe(prev);
      prev = next;
    }
  });

  it('con una sola aceptada cargada, la repite; sin ninguna, null', () => {
    expect(pickAcceptedIndex([2], 2)).toBe(2);
    expect(pickAcceptedIndex([], null)).toBeNull();
  });

  it('cada tema tiene sus 5 archivos en public/sounds, y los 2 de respaldo existen', () => {
    const pub = path.resolve(__dirname, '../../public');
    for (const t of SOUND_THEMES) {
      const u = soundUrls(t.id);
      for (const f of [u.alert, u.urgent, ...u.accepted]) expect(existsSync(path.join(pub, f)), f).toBe(true);
    }
    expect(existsSync(path.join(pub, FALLBACK_SOUNDS.alert))).toBe(true);
    expect(existsSync(path.join(pub, FALLBACK_SOUNDS.accepted))).toBe(true);
  });

  it('firma es el default y los recomendados existen', () => {
    expect(SOUND_THEMES[0].id).toBe('firma');
    expect(DEFAULT_COUNTER_SETTINGS.soundTheme).toBe('firma');
    for (const id of RECOMMENDED_SOUND_THEMES) expect(SOUND_THEME_IDS).toContain(id);
  });
});

describe('counter_settings', () => {
  it('sin fila → defaults (firma + menius)', () => {
    expect(rowToSettings(null)).toEqual(DEFAULT_COUNTER_SETTINGS);
    expect(DEFAULT_COUNTER_SETTINGS.screenTheme).toBe('menius');
  });

  it('valores raros en la fila caen al default en vez de romper', () => {
    const s = rowToSettings({ sound_theme: 'nope', screen_theme: 'x', sound_volume: 500, custom_accent: 'red', urgent_after_seconds: 1 });
    expect(s).toMatchObject({ soundTheme: 'firma', screenTheme: 'menius', soundVolume: 80, customAccent: null, urgentAfterSeconds: 30 });
  });

  it('el esquema rechaza ids, volúmenes y colores inválidos, y campos extra', () => {
    expect(counterSettingsPatchSchema.safeParse({ soundTheme: 'aurora' }).success).toBe(true);
    expect(counterSettingsPatchSchema.safeParse({ soundTheme: 'hack' }).success).toBe(false);
    expect(counterSettingsPatchSchema.safeParse({ soundVolume: 101 }).success).toBe(false);
    expect(counterSettingsPatchSchema.safeParse({ customAccent: '#12345' }).success).toBe(false);
    expect(counterSettingsPatchSchema.safeParse({ restaurantId: 'x' }).success).toBe(false);
  });

  it('patchToRow solo escribe lo que cambió', () => {
    expect(patchToRow({ soundVolume: 40 })).toEqual({ sound_volume: 40 });
    expect(patchToRow({ customAccent: null })).toEqual({ custom_accent: null });
  });
});

describe('modo demo', () => {
  it('3 órdenes (mesa, recoger, delivery) que suman $112, todas con id demo-*', () => {
    const o = demoScript(false);
    expect(o.map((x) => x.order_type)).toEqual(['dine_in', 'pickup', 'delivery']);
    expect(o.reduce((s, x) => s + Number(x.total), 0)).toBeCloseTo(112, 2);
    expect(o.every((x) => isDemoId(x.id))).toBe(true);
    // El total de cada una coincide con sus productos.
    for (const x of o) {
      const items = (x.items ?? []) as unknown as { line_total: number }[];
      expect(items.reduce((s, i) => s + i.line_total, 0)).toBeCloseTo(Number(x.total), 2);
    }
  });

  it('un id real nunca se toma por demo', () => {
    expect(isDemoId('8f1c2a4e-0000-4000-8000-000000000000')).toBe(false);
    expect(isDemoId(null)).toBe(false);
  });
});
