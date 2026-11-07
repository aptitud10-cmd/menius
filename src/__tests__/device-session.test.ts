import { describe, it, expect, vi, beforeEach } from 'vitest';

// Server Supabase client mock: getUser + two maybeSingle() reads + the rpc.
const getUser = vi.fn();
const rpc = vi.fn();
const reads: { data: unknown }[] = [];
function chain() {
  const c: Record<string, (...a: unknown[]) => unknown> = {};
  for (const op of ['select', 'eq']) c[op] = () => c;
  c.maybeSingle = async () => reads.shift() ?? { data: null };
  return c;
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser }, from: () => chain(), rpc }),
}));

import { getTenant } from '@/lib/auth/get-tenant';
import { isDeviceSession, sessionIdFromAccessToken } from '@/lib/auth/device-session';

const owner = () => {
  getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'o@x.com' } } });
  reads.push({ data: { default_restaurant_id: 'r1' } }, { data: { id: 'r1' } });
};

beforeEach(() => {
  reads.length = 0;
  vi.clearAllMocks();
});

describe('getTenant — tablet sessions only get the Counter', () => {
  it('owner on their own phone/computer: full tenant', async () => {
    owner();
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await getTenant()).toEqual({ userId: 'u1', restaurantId: 'r1', email: 'o@x.com', isDevice: false });
    expect(rpc).toHaveBeenCalledWith('current_session_is_device');
  });

  it('paired tablet: denied by default (refunds, keys, menu, settings…)', async () => {
    owner();
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await getTenant()).toBeNull();
  });

  it('paired tablet on a Counter route: allowed, and flagged', async () => {
    owner();
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await getTenant({ allowDevice: true })).toMatchObject({ restaurantId: 'r1', isDevice: true });
  });

  it('fails closed: if the check errors, the session is treated as a tablet', async () => {
    owner();
    rpc.mockResolvedValue({ data: null, error: { message: 'down' } });
    expect(await getTenant()).toBeNull();
  });
});

describe('isDeviceSession', () => {
  it('only an explicit true counts as "not a tablet = false"', async () => {
    const client = { rpc } as unknown as Parameters<typeof isDeviceSession>[0];
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await isDeviceSession(client)).toBe(false);
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await isDeviceSession(client)).toBe(true);
  });
});

describe('sessionIdFromAccessToken', () => {
  const tok = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;

  it('reads session_id from a Supabase access token', () => {
    expect(sessionIdFromAccessToken(tok({ session_id: '9b2f4c1e-5d6a-4b7c-8e9f-0a1b2c3d4e5f' })))
      .toBe('9b2f4c1e-5d6a-4b7c-8e9f-0a1b2c3d4e5f');
  });

  it('rejects anything else', () => {
    expect(sessionIdFromAccessToken(tok({ sub: 'u1' }))).toBeNull();
    expect(sessionIdFromAccessToken(tok({ session_id: "x' or 1=1" }))).toBeNull();
    expect(sessionIdFromAccessToken('garbage')).toBeNull();
    expect(sessionIdFromAccessToken(undefined)).toBeNull();
  });
});
