import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DASHBOARD_SECTIONS,
  NON_GUIDE_ROUTES,
  renderDashboardGuide,
} from '@/lib/ai/dashboard-map';

/**
 * Estos tests son el mecanismo que evita el "prompt decay".
 *
 * La guía del dashboard que lee el asistente vivía a mano dentro del system
 * prompt y se desincronizó en silencio: describía features que no existen (SMS,
 * automations de cumpleaños) e ignoraba secciones reales (branches, media,
 * business, ai-insights). Nadie se enteró hasta que un cliente notó que el bot
 * mentía.
 *
 * El filesystem es la fuente de verdad. Si agregás una sección al dashboard y no
 * la describís, este test falla ANTES de que el asistente empiece a ignorarla.
 */

const APP_DIR = join(process.cwd(), 'src/app/(dashboard)/app');

/** Recorre src/app/(dashboard)/app y devuelve toda ruta que tenga page.tsx. */
function realRoutes(dir = APP_DIR, prefix = ''): string[] {
  const out: string[] = [];
  if (existsSync(join(dir, 'page.tsx'))) out.push(prefix);
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    out.push(...realRoutes(full, prefix ? `${prefix}/${entry}` : entry));
  }
  return out;
}

/** Toda ruta que el mapa da por cubierta, incluyendo las hijas de `covers`. */
function describedRoutes(): Set<string> {
  const set = new Set<string>();
  for (const s of DASHBOARD_SECTIONS) {
    set.add(s.path);
    for (const c of s.covers ?? []) set.add(c);
  }
  for (const r of NON_GUIDE_ROUTES) set.add(r);
  return set;
}

describe('el mapa del dashboard no se desincroniza del código', () => {
  it('describe TODA sección real del dashboard', () => {
    const missing = realRoutes().filter((r) => !describedRoutes().has(r));
    expect(
      missing,
      `Estas rutas existen en src/app/(dashboard)/app pero el asistente no las conoce.\n` +
        `Agregalas a DASHBOARD_SECTIONS en src/lib/ai/dashboard-map.ts ` +
        `(o a NON_GUIDE_ROUTES si son estados del sistema, no secciones navegables):\n` +
        missing.map((m) => `  - ${m || '(home)'}`).join('\n'),
    ).toEqual([]);
  });

  it('no describe secciones que ya no existen', () => {
    const real = new Set(realRoutes());
    const ghosts: string[] = [];
    for (const s of DASHBOARD_SECTIONS) {
      if (!real.has(s.path)) ghosts.push(s.path || '(home)');
      for (const c of s.covers ?? []) if (!real.has(c)) ghosts.push(c);
    }
    expect(
      ghosts,
      `El mapa describe rutas que ya no existen. El asistente estaría mandando ` +
        `al cliente a pantallas borradas:\n` + ghosts.map((g) => `  - ${g}`).join('\n'),
    ).toEqual([]);
  });

  it('cada sección tiene una descripción con contenido real', () => {
    for (const s of DASHBOARD_SECTIONS) {
      expect(s.label.trim().length, `${s.path}: label vacío`).toBeGreaterThan(0);
      expect(
        s.what.trim().length,
        `${s.path}: descripción demasiado corta para ser útil`,
      ).toBeGreaterThan(20);
    }
  });

  it('los planes declarados son válidos', () => {
    for (const s of DASHBOARD_SECTIONS) {
      if (s.plan) expect(['starter', 'pro', 'business']).toContain(s.plan);
    }
  });
});

describe('la guía renderizada es apta para el prompt', () => {
  const guide = renderDashboardGuide();

  it('incluye la ruta de cada sección', () => {
    expect(guide).toContain('/app/menu/products');
    expect(guide).toContain('/app/branches');
    expect(guide).toContain('/app/settings');
  });

  it('marca el plan cuando la sección está gateada', () => {
    expect(guide).toMatch(/Kitchen \(KDS\)\*\* \(pro\+\)/);
    expect(guide).toMatch(/Branches\*\* \(business\+\)/);
  });

  it('el system prompt consume la guía generada, no una copia a mano', () => {
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/ai/chat/route.ts'),
      'utf-8',
    );
    // Si alguien vuelve a pegar la guía a mano, este test lo detecta.
    expect(route).toContain('${renderDashboardGuide()}');
    // Y la guía vieja tenía una entrada por sección escrita a mano: si vuelven
    // a aparecer muchas, es que se copió de nuevo.
    const handWritten = (route.match(/^- \*\*[A-Z]/gm) ?? []).length;
    expect(
      handWritten,
      'Hay demasiadas secciones escritas a mano en el prompt: deberían salir de dashboard-map.ts',
    ).toBeLessThanOrEqual(3);
  });

  it('no reintroduce las features que no existen', () => {
    // Las tres mentiras concretas que el prompt viejo le enseñaba al modelo.
    expect(guide).not.toMatch(/SMS/i);
    expect(guide).not.toMatch(/birthday/i);
    expect(guide).not.toMatch(/enable in Settings/i);
  });
});
