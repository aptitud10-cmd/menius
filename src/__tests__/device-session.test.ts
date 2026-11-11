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

// rpc por nombre: current_device_restaurant_id (tienda de la tablet o null) y
// current_session_is_device (respaldo mientras la migración no esté aplicada).
type RpcResult = { data: unknown; error: { message: string; code?: string } | null };
function rpcs(device: RpcResult, isDevice: RpcResult = { data: false, error: null }) {
  rpc.mockImplementation(async (fn: string) => (fn === 'current_device_restaurant_id' ? device : isDevice));
}
const MISSING = { data: null, error: { message: 'not found', code: 'PGRST202' } };

describe('getTenant — tablet sessions only get the Counter', () => {
  it('owner on their own phone/computer: full tenant', async () => {
    owner();
    rpcs({ data: null, error: null });
    expect(await getTenant()).toEqual({ userId: 'u1', restaurantId: 'r1', email: 'o@x.com', isDevice: false });
    expect(rpc).toHaveBeenCalledWith('current_device_restaurant_id');
  });

  it('paired tablet: denied by default (refunds, keys, menu, settings…)', async () => {
    owner();
    rpcs({ data: 'r1', error: null });
    expect(await getTenant()).toBeNull();
  });

  it('paired tablet on a Counter route: allowed, and flagged', async () => {
    owner();
    rpcs({ data: 'r1', error: null });
    expect(await getTenant({ allowDevice: true })).toMatchObject({ restaurantId: 'r1', isDevice: true });
  });

  it('multi-tienda: la tablet sigue a SU tienda, no a la elegida en el panel', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'o@x.com' } } });
    reads.push({ data: { default_restaurant_id: 'r1' } }, { data: { id: 'r2' } });
    rpcs({ data: 'r2', error: null });
    expect(await getTenant({ allowDevice: true })).toMatchObject({ restaurantId: 'r2', isDevice: true });
  });

  it('migración pendiente: cae a current_session_is_device (tablet detectada)', async () => {
    owner();
    rpcs(MISSING, { data: true, error: null });
    expect(await getTenant()).toBeNull();
  });

  it('fails closed: if the check errors, the session is treated as a tablet', async () => {
    owner();
    rpcs({ data: null, error: { message: 'down' } }, { data: null, error: { message: 'down' } });
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
