import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashDeviceSecret } from '@/lib/device-pairing';

// ── Supabase admin mock: a tiny chainable query recorder ─────────────────────
type Result = { data: unknown; error: unknown };
const queue: Result[] = [];           // results returned by successive .maybeSingle()
const calls: { op: string; args: unknown[] }[] = [];
let insertResult: { error: unknown } = { error: null };

function chain() {
  const c: Record<string, (...args: unknown[]) => unknown> = {};
  for (const op of ['select', 'update', 'delete', 'eq', 'in', 'gt', 'lt']) {
    c[op] = (...args: unknown[]) => { calls.push({ op, args }); return c; };
  }
  c.insert = (...args: unknown[]) => { calls.push({ op: 'insert', args }); return Promise.resolve(insertResult); };
  c.maybeSingle = async () => queue.shift() ?? { data: null, error: null };
  return c;
}

/** Unsigned JWT-shaped token: the route only reads session_id from a token GoTrue just issued. */
const SESSION_ID = '9b2f4c1e-5d6a-4b7c-8e9f-0a1b2c3d4e5f';
const fakeAccessToken = (claims: Record<string, unknown>) =>
  `x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`;

const getUserById = vi.fn();
const generateLink = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => chain(),
    auth: { admin: { getUserById, generateLink } },
  }),
}));

const verifyOtp = vi.fn();
const signOut = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { verifyOtp, signOut } }),
}));

const getTenant = vi.fn();
vi.mock('@/lib/auth/get-tenant', () => ({ getTenant: () => getTenant() }));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ allowed: true, remaining: 1, resetAt: 0 }),
  getClientIP: () => '1.2.3.4',
}));
vi.mock('@/lib/error-reporting', () => ({ captureError: vi.fn() }));

import { POST as poll } from '@/app/api/devices/pair/poll/route';
import { POST as approve } from '@/app/api/devices/pair/approve/route';

const SECRET = 'S'.repeat(43);
const future = () => new Date(Date.now() + 60_000).toISOString();
const req = (body: unknown, headers: Record<string, string> = { 'content-type': 'application/json', origin: 'https://menius.app' }) =>
  new Request('https://menius.app/x', { method: 'POST', body: JSON.stringify(body), headers });

beforeEach(() => {
  queue.length = 0;
  calls.length = 0;
  insertResult = { error: null };
  vi.clearAllMocks();
});

describe('POST /api/devices/pair/poll', () => {
  it('rejects a malformed code', async () => {
    const res = await poll(req({ code: 'nope', secret: SECRET }));
    expect(res.status).toBe(400);
  });

  it('wrong secret looks exactly like an unknown code — and never mints a session', async () => {
    queue.push({ data: { id: 'p1', status: 'approved', secret_hash: hashDeviceSecret('other'.repeat(10)), expires_at: future(), restaurant_id: 'r1', approved_by: 'u1' }, error: null });
    const res = await poll(req({ code: 'K7M4PX', secret: SECRET }));
    expect(await res.json()).toEqual({ status: 'expired' });
    expect(generateLink).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it('pending stays pending', async () => {
    queue.push({ data: { id: 'p1', status: 'pending', secret_hash: hashDeviceSecret(SECRET), expires_at: future(), restaurant_id: null, approved_by: null }, error: null });
    const res = await poll(req({ code: 'K7M4PX', secret: SECRET }));
    expect(await res.json()).toEqual({ status: 'pending' });
    expect(generateLink).not.toHaveBeenCalled();
  });

  it('expired row → expired', async () => {
    queue.push({ data: { id: 'p1', status: 'approved', secret_hash: hashDeviceSecret(SECRET), expires_at: new Date(Date.now() - 1000).toISOString(), restaurant_id: 'r1', approved_by: 'u1' }, error: null });
    const res = await poll(req({ code: 'K7M4PX', secret: SECRET }));
    expect(await res.json()).toEqual({ status: 'expired' });
    expect(generateLink).not.toHaveBeenCalled();
  });

  it('approved + right secret → consumes the row, mints the session server-side', async () => {
    queue.push({ data: { id: 'p1', status: 'approved', secret_hash: hashDeviceSecret(SECRET), expires_at: future(), restaurant_id: 'r1', approved_by: 'u1' }, error: null });
    queue.push({ data: { id: 'p1' }, error: null });              // consume update
    queue.push({ data: { name: 'Buccaneer Diner' }, error: null }); // restaurant name
    getUserById.mockResolvedValue({ data: { user: { email: 'owner@example.com' } } });
    generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'th_123' } }, error: null });
    verifyOtp.mockResolvedValue({ data: { session: { access_token: fakeAccessToken({ session_id: SESSION_ID }) } }, error: null });

    const res = await poll(req({ code: 'k7m-4px', secret: SECRET }));
    const body = await res.json();
    expect(body).toEqual({ status: 'connected', restaurantName: 'Buccaneer Diner' });
    expect(JSON.stringify(body)).not.toContain('th_123'); // the token never leaves the server
    expect(generateLink).toHaveBeenCalledWith({ type: 'magiclink', email: 'owner@example.com' });
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'th_123', type: 'magiclink' });
    const consume = calls.find((c) => c.op === 'update' && (c.args[0] as { status?: string }).status === 'consumed');
    expect(consume).toBeTruthy();
    // …and the new session is registered as a tablet (Counter-only) before it is handed over
    const mark = calls.find((c) => c.op === 'insert');
    expect(mark?.args[0]).toEqual({ session_id: SESSION_ID, restaurant_id: 'r1', user_id: 'u1', pairing_id: 'p1' });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('if the session cannot be marked as a tablet, it is killed — never handed over as a full owner session', async () => {
    const approved = () => {
      queue.push({ data: { id: 'p1', status: 'approved', secret_hash: hashDeviceSecret(SECRET), expires_at: future(), restaurant_id: 'r1', approved_by: 'u1' }, error: null });
      queue.push({ data: { id: 'p1' }, error: null });
    };
    getUserById.mockResolvedValue({ data: { user: { email: 'owner@example.com' } } });
    generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'th_123' } }, error: null });

    // 1) insert fails
    approved();
    insertResult = { error: { message: 'boom' } };
    verifyOtp.mockResolvedValue({ data: { session: { access_token: fakeAccessToken({ session_id: SESSION_ID }) } }, error: null });
    let res = await poll(req({ code: 'K7M4PX', secret: SECRET }));
    expect(await res.json()).toEqual({ status: 'expired' });
    expect(signOut).toHaveBeenLastCalledWith({ scope: 'local' }); // local: the owner's other devices stay signed in

    // 2) token without session_id
    approved();
    insertResult = { error: null };
    verifyOtp.mockResolvedValue({ data: { session: { access_token: fakeAccessToken({ sub: 'u1' }) } }, error: null });
    res = await poll(req({ code: 'K7M4PX', secret: SECRET }));
    expect(await res.json()).toEqual({ status: 'expired' });
    expect(signOut).toHaveBeenCalledTimes(2);
  });

  it('losing the consume race does not mint a second session', async () => {
    queue.push({ data: { id: 'p1', status: 'approved', secret_hash: hashDeviceSecret(SECRET), expires_at: future(), restaurant_id: 'r1', approved_by: 'u1' }, error: null });
    queue.push({ data: null, error: null }); // another poll consumed it first
    const res = await poll(req({ code: 'K7M4PX', secret: SECRET }));
    expect(await res.json()).toEqual({ status: 'pending' });
    expect(generateLink).not.toHaveBeenCalled();
  });
});

describe('POST /api/devices/pair/approve', () => {
  it('refuses cross-site requests before anything else (CSRF)', async () => {
    getTenant.mockResolvedValue({ userId: 'u1', restaurantId: 'r1' });
    const crossSite = await approve(req({ code: 'K7M4PX' }, { 'content-type': 'application/json', origin: 'https://evil.example' }));
    expect(crossSite.status).toBe(403);
    const textPlain = await approve(req({ code: 'K7M4PX' }, { 'content-type': 'text/plain', origin: 'https://menius.app' }));
    expect(textPlain.status).toBe(403);
    const noOrigin = await approve(req({ code: 'K7M4PX' }, { 'content-type': 'application/json' }));
    expect(noOrigin.status).toBe(403);
    expect(calls.some((c) => c.op === 'update')).toBe(false);
  });

  it('requires an owner session', async () => {
    getTenant.mockResolvedValue(null);
    const res = await approve(req({ code: 'K7M4PX' }));
    expect(res.status).toBe(401);
  });

  it('rejects a malformed code', async () => {
    getTenant.mockResolvedValue({ userId: 'u1', restaurantId: 'r1' });
    const res = await approve(req({ code: 'K0M4PX' }));
    expect(res.status).toBe(400);
  });

  it('unknown/expired code → 404', async () => {
    getTenant.mockResolvedValue({ userId: 'u1', restaurantId: 'r1' });
    queue.push({ data: null, error: null });
    const res = await approve(req({ code: 'K7M4PX' }));
    expect(res.status).toBe(404);
  });

  it('approves only a live pending row, binding it to the approver', async () => {
    getTenant.mockResolvedValue({ userId: 'u1', restaurantId: 'r1' });
    queue.push({ data: { id: 'p1' }, error: null });
    queue.push({ data: { name: 'Buccaneer Diner' }, error: null });
    const res = await approve(req({ code: 'k7m 4px' }));
    expect(await res.json()).toEqual({ ok: true, restaurantName: 'Buccaneer Diner' });
    const upd = calls.find((c) => c.op === 'update');
    expect(upd?.args[0]).toMatchObject({ status: 'approved', restaurant_id: 'r1', approved_by: 'u1' });
    expect(calls).toEqual(expect.arrayContaining([
      { op: 'eq', args: ['code', 'K7M4PX'] },
      { op: 'eq', args: ['status', 'pending'] },
    ]));
    expect(calls.some((c) => c.op === 'gt' && c.args[0] === 'expires_at')).toBe(true);
  });
});
