/**
 * Clientes problema (Pedro 2026-11-13).
 *
 * Un pedido para llevar o delivery que el cliente no recibió (no estaba en la
 * puerta, no vino a buscarlo) o no pagó se cancela con un `incident`. El
 * cliente queda marcado desde el primer incidente: su próximo pedido llega al
 * Counter con una alerta y, si el restaurante cobra con tarjeta, se le exige
 * pagar online. El restaurante lo desmarca desde Clientes.
 */
export const ORDER_INCIDENTS = ['not_received', 'not_paid'] as const;
export type OrderIncident = (typeof ORDER_INCIDENTS)[number];

export function isOrderIncident(v: unknown): v is OrderIncident {
  return typeof v === 'string' && (ORDER_INCIDENTS as readonly string[]).includes(v);
}

/** What the customer record carries for the Counter's alert. */
export interface CustomerFlag {
  incident_count: number;
  last_incident: OrderIncident | null;
  last_incident_at: string | null;
}

/** "⚠ 1 pedido sin recibir" / "⚠ 2 problem orders · last: not paid". */
export function customerFlagLabel(flag: CustomerFlag, en: boolean): string {
  const n = flag.incident_count;
  const last =
    flag.last_incident === 'not_paid'
      ? en ? "didn't pay" : 'no pagó'
      : en ? "didn't receive it" : 'no lo recibió';
  if (n <= 1) return en ? `Flagged: last order ${last}` : `Ojo: su último pedido ${last}`;
  return en ? `Flagged: ${n} problem orders (last: ${last})` : `Ojo: ${n} pedidos con problemas (último: ${last})`;
}
