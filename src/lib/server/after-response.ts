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
  try {
    const holder = (globalThis as Record<symbol, unknown>)[Symbol.for('@vercel/request-context')] as
      | { get?: () => RequestContext | undefined }
      | undefined;
    holder?.get?.()?.waitUntil?.(p);
  } catch {
    /* sin contexto de Vercel: la promesa corre igual */
  }
}
