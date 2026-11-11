import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { wompiEventChecksum, wompiChecksumMatches } from '@/lib/payments/wompi-checksum';

// Ejemplo oficial de docs.wompi.co/docs/colombia/eventos
const body = {
  event: 'transaction.updated',
  data: { transaction: { id: '1234-1610641025-49201', status: 'APPROVED', amount_in_cents: 4490000 } },
  environment: 'prod',
  signature: {
    properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
    checksum: '3476DDA50F64CD7CBD160689640506FEBEA93239BC524FC0469B2C68A3CC8BD0',
  },
  timestamp: 1530291411,
  sent_at: '2018-07-20T16:45:05.000Z',
};
const SECRET = 'prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z';

describe('checksum de eventos Wompi', () => {
  // OJO: el checksum impreso en la doc (3476DDA5…) NO es el SHA256 de su propia
  // cadena de ejemplo (es ilustrativo). Se verifica la fórmula paso a paso.
  it('sigue la fórmula de la documentación (propiedades de data + timestamp + secreto)', () => {
    const expected = createHash('sha256')
      .update('1234-1610641025-49201APPROVED44900001530291411prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z')
      .digest('hex');
    const c = wompiEventChecksum(body, SECRET);
    expect(c).toBe(expected);
    expect(wompiChecksumMatches(c, expected.toUpperCase())).toBe(true);
  });
  it('rechaza un monto o secreto alterado y bodies sin firma', () => {
    const tampered = { ...body, data: { transaction: { ...body.data.transaction, amount_in_cents: 100 } } };
    const good = wompiEventChecksum(body, SECRET);
    expect(wompiChecksumMatches(wompiEventChecksum(tampered, SECRET), good)).toBe(false);
    expect(wompiChecksumMatches(wompiEventChecksum(body, 'otro'), good)).toBe(false);
    expect(wompiEventChecksum({ data: {} }, SECRET)).toBeNull();
    expect(wompiChecksumMatches(null, 'x')).toBe(false);
  });
});
