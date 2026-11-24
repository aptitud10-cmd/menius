import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Firma de los links de baja. Antes el link era solo el id del cliente: quien
 * lo tuviera podía dar de baja (o, peor, volver a suscribir) a otra persona.
 * Ahora el link lleva id + firma HMAC; solo el servidor la puede generar.
 *
 * Secreto: UNSUBSCRIBE_SECRET si existe; si no, la service role key (nunca
 * sale del servidor). Cambiarla invalida los links ya enviados, que caen en
 * la página de "link no válido" sin tocar nada.
 */
function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function signCustomer(customerId: string): string {
  const key = secret();
  if (!key) return '';
  return createHmac('sha256', key).update(`unsub:${customerId}`).digest('base64url').slice(0, 24);
}

export function verifyCustomerSig(customerId: string, sig: string | null | undefined): boolean {
  if (!sig) return false;
  const expected = signCustomer(customerId);
  if (!expected || expected.length !== sig.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

/** Link de baja firmado (lo usan el pie del email y el header List-Unsubscribe). */
export function unsubscribeUrl(appUrl: string, customerId: string): string {
  return `${appUrl}/api/unsubscribe?c=${encodeURIComponent(customerId)}&s=${encodeURIComponent(signCustomer(customerId))}`;
}

/**
 * Headers RFC 8058 (baja en un toque desde Gmail/Yahoo/Apple Mail). Gmail y
 * Yahoo los exigen a quien manda en volumen; con ellos el botón "Cancelar
 * suscripción" aparece arriba del email en vez del "Marcar como spam".
 */
export function listUnsubscribeHeaders(appUrl: string, customerId: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${unsubscribeUrl(appUrl, customerId)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
