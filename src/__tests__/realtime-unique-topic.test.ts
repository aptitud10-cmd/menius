import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { uniqueTopic } from '@/lib/supabase/realtime-topic';

/**
 * realtime-js 2.1xx devuelve el canal existente si el nombre se repite y lanza
 * al agregarle `postgres_changes` después de subscribe(). El 2026-11-27 eso tiró
 * abajo el panel (/app) en producción: la campanita está montada dos veces.
 * Todo canal con postgres_changes tiene que usar uniqueTopic().
 */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : files(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

describe('canales realtime', () => {
  it('cada canal postgres_changes usa un nombre único', () => {
    const bad: string[] = [];
    for (const f of files(join(process.cwd(), 'src'))) {
      if (f.endsWith('realtime-topic.ts')) continue;
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/\.channel\(([^\n]*)/g)) {
        const after = src.slice(m.index ?? 0, (m.index ?? 0) + 400);
        if (after.includes('postgres_changes') && !m[1].startsWith('uniqueTopic(')) {
          bad.push(`${f.replace(process.cwd(), '')}: .channel(${m[1].slice(0, 80)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('uniqueTopic da nombres distintos con el mismo prefijo', () => {
    const a = uniqueTopic('dash-notifs:r1');
    const b = uniqueTopic('dash-notifs:r1');
    expect(a).not.toBe(b);
    expect(a.startsWith('dash-notifs:r1:')).toBe(true);
  });
});
