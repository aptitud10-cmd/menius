const DAY_MS = 24 * 60 * 60 * 1000;

export type CurrentDriverToken = {
  driver_name?: string | null;
  driver_tracking_token?: string | null;
  driver_token_expires_at?: string | null;
};

/**
 * Qué token de repartidor queda al asignar. El pedido delivery nace con uno y
 * ese es el QR impreso en el ticket: se conserva en la primera asignación y al
 * reasignar al mismo repartidor (si no, el QR deja de funcionar y el repartidor
 * no puede marcar "recogido"). Solo se genera uno nuevo al cambiar de
 * repartidor (revoca el enlace del anterior) o si el actual venció. El
 * vencimiento nunca queda a menos de 24 h desde la asignación.
 */
export function chooseDriverToken(
  newName: string,
  current: CurrentDriverToken | null | undefined,
  makeToken: () => string,
  now = Date.now(),
): { token: string | null; expiresAt: string | null; reused: boolean } {
  const name = newName.trim();
  if (!name) return { token: null, expiresAt: null, reused: false };

  const curExp = current?.driver_token_expires_at ? new Date(current.driver_token_expires_at).getTime() : null;
  const existingValid = !!current?.driver_tracking_token && (curExp == null || curExp > now);
  const sameOrFirstDriver = !current?.driver_name || current.driver_name.trim() === name;
  const minExpiry = now + DAY_MS;

  if (existingValid && sameOrFirstDriver) {
    return {
      token: current!.driver_tracking_token as string,
      expiresAt: new Date(Math.max(curExp ?? 0, minExpiry)).toISOString(),
      reused: true,
    };
  }
  return { token: makeToken(), expiresAt: new Date(minExpiry).toISOString(), reused: false };
}
