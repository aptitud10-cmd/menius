import { describe, it, expect, beforeAll } from 'vitest';
import { listUnsubscribeHeaders, signCustomer, unsubscribeUrl, verifyCustomerSig } from '@/lib/marketing/unsubscribe-token';

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

describe('link de baja firmado', () => {
  beforeAll(() => {
    process.env.UNSUBSCRIBE_SECRET = 'secret-for-tests';
  });
  it('la firma valida solo para ese cliente', () => {
    const sig = signCustomer(ID);
    expect(sig).toHaveLength(24);
    expect(verifyCustomerSig(ID, sig)).toBe(true);
    expect(verifyCustomerSig('7c9e6679-7425-40de-944b-e07fc1f90ae7', sig)).toBe(false);
    expect(verifyCustomerSig(ID, sig.slice(0, -1) + (sig.endsWith('A') ? 'B' : 'A'))).toBe(false);
    expect(verifyCustomerSig(ID, null)).toBe(false);
    expect(verifyCustomerSig(ID, '')).toBe(false);
  });
  it('URL y headers RFC 8058', () => {
    const url = unsubscribeUrl('https://menius.app', ID);
    expect(url).toBe(`https://menius.app/api/unsubscribe?c=${ID}&s=${encodeURIComponent(signCustomer(ID))}`);
    expect(listUnsubscribeHeaders('https://menius.app', ID)).toEqual({
      'List-Unsubscribe': `<${url}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });
});
