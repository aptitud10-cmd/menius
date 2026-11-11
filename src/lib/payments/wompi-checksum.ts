import { createHash, timingSafeEqual } from 'crypto';

/**
 * Checksum de los eventos de Wompi (docs.wompi.co/docs/colombia/eventos):
 * SHA256( valores de signature.properties —rutas dentro de `data`, en orden—
 *         + timestamp (del evento, raíz del body) + secreto de eventos ).
 *
 * La versión anterior resolvía las rutas desde la raíz del body (quedaban
 * vacías) y no sumaba el timestamp: todo evento real de Wompi fallaba la firma
 * y ningún pago se confirmaba.
 */
export function wompiEventChecksum(body: unknown, eventsSecret: string): string | null {
  const b = body as { data?: unknown; timestamp?: unknown; signature?: { properties?: unknown } };
  const props = b?.signature?.properties;
  if (!Array.isArray(props) || b.timestamp == null) return null;
  const values = props.map((prop) => {
    let val: unknown = b.data;
    for (const p of String(prop).split('.')) val = (val as Record<string, unknown> | undefined)?.[p];
    return val == null ? '' : String(val);
  });
  return createHash('sha256').update(values.join('') + String(b.timestamp) + eventsSecret).digest('hex');
}

/** Compara sin importar mayúsculas (el ejemplo de Wompi viene en mayúsculas). */
export function wompiChecksumMatches(computed: string | null, received: unknown): boolean {
  if (!computed || typeof received !== 'string') return false;
  const a = Buffer.from(computed.toLowerCase());
  const b = Buffer.from(received.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
