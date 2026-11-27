import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Con zustand 5, un selector que devuelve un objeto/array/Set NUEVO en cada
 * lectura (`useCartStore((s) => new Set(...))`, `(s) => ({ ... })`,
 * `(s) => s.items.filter(...)`) entra en un bucle de renders (React #185). En
 * 2026-11-27 eso tiró abajo la tienda entera en producción ("Something went
 * wrong") y en desarrollo no se veía. Devolver un primitivo (número, texto,
 * booleano) o una referencia que ya vive en el store, y derivar con useMemo.
 */
const STORE_HOOK = /use(Cart|Checkout|Favorites|Sound)Store\(/g;
const UNSTABLE = /new (Set|Map|Date|Array)\b|=>\s*\(\{|=>\s*\[|\.filter\(|\.slice\(|\.sort\(|\.\.\.|\?\?\s*\[\]|\?\?\s*\{\}|Object\.(keys|values|entries|assign|fromEntries)|Array\.from/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : files(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

function selectorArgs(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(STORE_HOOK)) {
    let i = (m.index ?? 0) + m[0].length;
    const start = i;
    let depth = 1;
    while (depth > 0 && i < src.length) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') depth--;
      i++;
    }
    const arg = src.slice(start, i - 1).replace(/\s+/g, ' ').trim();
    if (arg) out.push(arg);
  }
  return out;
}

describe('selectores de zustand estables', () => {
  it('ningún selector crea un objeto, array o Set nuevo en cada lectura', () => {
    const bad: string[] = [];
    for (const f of files(join(process.cwd(), 'src'))) {
      for (const arg of selectorArgs(readFileSync(f, 'utf8'))) {
        const mapWithoutJoin = arg.includes('.map(') && !arg.includes('.join(');
        if (UNSTABLE.test(arg) || mapWithoutJoin) bad.push(`${f.replace(process.cwd(), '')}: ${arg.slice(0, 120)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('el detector reconoce el caso que rompió la tienda', () => {
    expect(selectorArgs('useCartStore((s) => new Set(s.items.map((i) => i.product.id)))')
      .some((a) => UNSTABLE.test(a))).toBe(true);
  });
});
