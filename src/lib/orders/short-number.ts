/**
 * "ORD-261113-021" → "021": el número que se dice en el mostrador.
 *
 * ÚNICA fuente del "#003" (SPEC impresión F6 / CA-12): ticket impreso, emails,
 * seguimiento, Counter, KDS y repartidor muestran el mismo número porque todos
 * pasan por acá. Prohibido reimplementarlo con split('-') suelto.
 *
 * @param fallback lo que se muestra si el pedido no tiene número ('' por default).
 */
export function shortOrderNumber(orderNumber: string | null | undefined, fallback = ''): string {
  if (!orderNumber) return fallback;
  return orderNumber.split('-').pop() || orderNumber;
}
