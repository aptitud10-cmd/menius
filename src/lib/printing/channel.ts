/**
 * Por dónde entró el pedido, para la franja invertida del ticket (SPEC §6).
 * En v3 todo pedido de MENIUS es 'website'. Cuando exista orders.source
 * (fase 2: teléfono, etc.) solo cambia esta función.
 */
export type TicketChannel = 'website';

export function channelOf(_order: object): TicketChannel {
  return 'website';
}
