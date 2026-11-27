/**
 * Nombre de canal único para suscripciones `postgres_changes`.
 *
 * Desde realtime-js 2.1xx, `supabase.channel(topic)` devuelve el canal que ya
 * existe con ese nombre, y agregarle `.on('postgres_changes')` después de
 * `subscribe()` LANZA un error. Pasa cuando el mismo componente está montado
 * dos veces (la campanita del panel en el encabezado móvil y en el de escritorio)
 * o cuando un efecto se vuelve a ejecutar antes de que el canal anterior termine
 * de cerrarse (removeChannel es asíncrono). El 2026-11-27 eso tiró abajo /app en
 * producción.
 *
 * Para `postgres_changes` el nombre del canal no importa (lo que filtra es la
 * config), así que cada suscripción usa uno propio. NO usar en canales
 * `broadcast`: ahí el nombre es el que usa el servidor para emitir.
 */
export function uniqueTopic(base: string): string {
  return `${base}:${Math.random().toString(36).slice(2, 10)}`;
}
