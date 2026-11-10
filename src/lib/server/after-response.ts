/**
 * Ejecuta trabajo DESPUÉS de responder (emails, push), sin hacer esperar al
 * usuario. En Vercel usa el waitUntil del contexto de la request (lo mismo que
 * hace @vercel/functions, sin sumar la dependencia): la función sigue viva
 * hasta que la promesa termina. Fuera de Vercel (local/tests) la promesa
 * simplemente corre sola.
 */
type RequestContext = { waitUntil?: (p: Promise<unknown>) => void };

export function afterResponse(task: () => Promise<unknown>): void {
  const p = Promise.resolve().then(task).catch((err) => {
    console.error('[afterResponse] task failed', err instanceof Error ? err.message : String(err));
  });
  // El runtime de Vercel publica '@vercel/request-context'; Next 14 lee
  // '@next/request-context'. Se usa el primero que exista.
  for (const key of ['@vercel/request-context', '@next/request-context']) {
    try {
      const holder = (globalThis as Record<symbol, unknown>)[Symbol.for(key)] as
        | { get?: () => RequestContext | undefined }
        | undefined;
      const ctx = holder?.get?.();
      if (ctx?.waitUntil) { ctx.waitUntil(p); return; }
    } catch {
      /* sin contexto: probar el siguiente */
    }
  }
  /* sin contexto (local/tests): la promesa corre igual */
}
