/**
 * Stub de `server-only` para vitest.
 *
 * `server-only` es un paquete centinela que Next resuelve durante el build para
 * romper la compilación si un módulo de servidor se importa desde un client
 * component. No existe como dependencia instalada y vitest no puede resolverlo,
 * así que cualquier test que alcance src/lib/supabase/admin.ts fallaba entero
 * con "Failed to resolve import 'server-only'".
 *
 * Eso tumbaba los 20 tests de payments-webhook — justamente los que cubren
 * Stripe, Wompi y MercadoPago. Estaban en rojo en CI sin proteger nada.
 *
 * El alias vive en vitest.config.ts. En runtime real Next sigue usando el
 * paquete verdadero: este archivo solo existe para los tests.
 */
export {};
