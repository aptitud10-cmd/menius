// @vitest-environment node
/**
 * Protocolo CloudPRNT (API impresión §1) con un store en memoria.
 * La atomicidad del reclamo/cierre la prueban los tests SQL
 * (supabase/tests/printing_claim_finish.test.sql).
 */
import { describe, it, expect } from 'vitest';
import {
  handlePoll, handleGet, handleDelete, hashPrinterToken, isPlausiblePrinterToken,
  type CloudPrntStore, type PrinterRow, type ClaimedJob,
} from '@/lib/printing/cloudprnt';

const JOB = '11111111-1111-4111-8111-111111111111';
const JOB2 = '22222222-2222-4222-8222-222222222222';

function printer(over: Partial<PrinterRow> = {}): PrinterRow {
  return {
    id: 'p1', restaurant_id: 'r1', mac_address: '00:11:62:aa:bb:cc',
    last_poll_at: '2026-11-15T12:00:00.000Z', last_asb_status: 'ASB-OK',
    last_client_info: { ClientType: 'mC-Print3' }, ...over,
  };
}

function fakeStore(opts: { queued?: string[]; sent?: string[]; claimable?: string[]; macTaken?: boolean } = {}) {
  const calls = {
    updates: [] as Record<string, unknown>[],
    claims: [] as [string, string, string][],
    finishes: [] as [string, string, string][],
    warns: [] as string[],
  };
  const store: CloudPrntStore = {
    async updatePrinter(_id, patch) { calls.updates.push(patch); },
    async macUsedByOther() { return !!opts.macTaken; },
    async nextQueuedJobId() { return opts.queued?.[0] ?? null; },
    async oldestSentJobId() { return opts.sent?.[0] ?? null; },
    async claimJob(id, p, m) {
      calls.claims.push([id, p, m]);
      return (opts.claimable ?? []).includes(id)
        ? ({ id, restaurant_id: 'r1', order_id: 'o1', kind: 'order', created_at: '2026-11-15T12:00:00Z' } satisfies ClaimedJob)
        : null;
    },
    async finishJob(id, p, code) { calls.finishes.push([id, p, code]); return code.startsWith('2') ? 'printed' : 'queued'; },
    warn(message) { calls.warns.push(message); },
  };
  return { store, calls };
}

const NOW = new Date('2026-11-15T12:00:10.000Z');

describe('POST (poll)', () => {
  it('sin jobs → jobReady false', async () => {
    const { store } = fakeStore();
    expect(await handlePoll(printer(), { status: 'ASB-OK', printerMAC: '00:11:62:AA:BB:CC' }, store, NOW)).toEqual({ jobReady: false });
  });

  it('con un job en cola → jobReady + image/png + jobToken', async () => {
    const { store } = fakeStore({ queued: [JOB] });
    expect(await handlePoll(printer(), {}, store, NOW)).toEqual({ jobReady: true, mediaTypes: ['image/png'], jobToken: JOB });
  });

  it('imprimiendo → no ofrece otro job', async () => {
    const { store } = fakeStore({ queued: [JOB] });
    expect((await handlePoll(printer(), { printingInProgress: true }, store, NOW)).jobReady).toBe(false);
  });

  it('last_poll_at: no escribe en cada poll (30 s), sí si cambió el estado', async () => {
    const a = fakeStore();
    await handlePoll(printer(), { status: 'ASB-OK' }, a.store, NOW);
    expect(a.calls.updates).toEqual([]);

    const b = fakeStore();
    await handlePoll(printer(), { status: 'ASB-PAPER-OUT' }, b.store, NOW);
    expect(b.calls.updates[0]).toMatchObject({ last_poll_at: NOW.toISOString(), last_asb_status: 'ASB-PAPER-OUT' });

    const c = fakeStore();
    await handlePoll(printer(), { status: 'ASB-OK' }, c.store, new Date('2026-11-15T12:00:45.000Z'));
    expect(c.calls.updates[0]).toHaveProperty('last_poll_at');
  });

  it('primer poll: guarda la MAC; si otra impresora la tiene, avisa pero no rompe', async () => {
    const { store, calls } = fakeStore({ macTaken: true, queued: [JOB] });
    const res = await handlePoll(printer({ mac_address: null }), { printerMAC: '00:11:62:AA:BB:CC' }, store, NOW);
    expect(calls.updates[0]).toMatchObject({ mac_address: '00:11:62:aa:bb:cc' });
    expect(calls.warns).toHaveLength(1);
    expect(res.jobReady).toBe(true);
  });

  it('sin info del cliente: la pide con clientAction; al llegar los resultados, la guarda', async () => {
    const first = fakeStore();
    const res = await handlePoll(printer({ last_client_info: null }), {}, first.store, NOW);
    expect(res.clientAction?.map((a) => a.request)).toEqual(['ClientType', 'ClientVersion', 'PageInfo']);

    const second = fakeStore();
    const res2 = await handlePoll(printer({ last_client_info: null }), {
      clientAction: [{ request: 'ClientType', result: 'Star mC-Print3' }, { request: 'ClientVersion', result: '5.1' }],
    }, second.store, NOW);
    expect(res2.clientAction).toBeUndefined();
    expect(second.calls.updates[0].last_client_info).toEqual({ ClientType: 'Star mC-Print3', ClientVersion: '5.1' });
  });

  it('body basura no rompe', async () => {
    const { store } = fakeStore();
    expect(await handlePoll(printer(), 'no-json', store, NOW)).toEqual({ jobReady: false });
    expect(await handlePoll(printer(), null, store, NOW)).toEqual({ jobReady: false });
  });
});

describe('GET', () => {
  it('sin type → consulta de configuración del server, no un job', async () => {
    const { store, calls } = fakeStore({ queued: [JOB], claimable: [JOB] });
    expect(await handleGet(printer(), new URLSearchParams(''), null, store)).toEqual({ kind: 'setting' });
    expect(calls.claims).toEqual([]);
  });

  it('con token → reclama ESE job', async () => {
    const { store, calls } = fakeStore({ queued: [JOB2], claimable: [JOB] });
    const r = await handleGet(printer(), new URLSearchParams(`mac=x&type=image/png&token=${JOB}`), null, store);
    expect(r.kind).toBe('job');
    expect(calls.claims).toEqual([[JOB, 'p1', 'image/png']]);
  });

  it('token por header X-Star-Token', async () => {
    const { store, calls } = fakeStore({ claimable: [JOB] });
    await handleGet(printer(), new URLSearchParams('type=image/png'), JOB, store);
    expect(calls.claims[0][0]).toBe(JOB);
  });

  it('sin token (firmware viejo) → el siguiente de la cola', async () => {
    const { store, calls } = fakeStore({ queued: [JOB], claimable: [JOB] });
    expect((await handleGet(printer(), new URLSearchParams('type=image/png'), null, store)).kind).toBe('job');
    expect(calls.claims[0][0]).toBe(JOB);
  });

  it('job no reclamable (cancelado, de otra impresora, ya impreso) → not_found', async () => {
    const { store } = fakeStore({ claimable: [] });
    expect(await handleGet(printer(), new URLSearchParams(`type=image/png&token=${JOB}`), null, store)).toEqual({ kind: 'not_found' });
  });

  it('otro media type → 415; token que no es UUID se ignora', async () => {
    const { store, calls } = fakeStore({ queued: [], claimable: [JOB] });
    expect(await handleGet(printer(), new URLSearchParams(`type=text/plain&token=${JOB}`), null, store)).toEqual({ kind: 'unsupported_media' });
    expect(await handleGet(printer(), new URLSearchParams("type=image/png&token=1' or '1'='1"), null, store)).toEqual({ kind: 'not_found' });
    expect(calls.claims).toEqual([]);
  });
});

describe('DELETE', () => {
  it('cierra el job del token con el código de la impresora', async () => {
    const { store, calls } = fakeStore();
    expect(await handleDelete(printer(), new URLSearchParams(`mac=x&code=200%20OK&token=${JOB}`), null, store)).toBe('printed');
    expect(calls.finishes).toEqual([[JOB, 'p1', '200 OK']]);
  });

  it('sin token → el sent más viejo; sin ninguno → null', async () => {
    const a = fakeStore({ sent: [JOB2] });
    expect(await handleDelete(printer(), new URLSearchParams('code=520'), null, a.store)).toBe('queued');
    expect(a.calls.finishes[0][0]).toBe(JOB2);
    const b = fakeStore();
    expect(await handleDelete(printer(), new URLSearchParams('code=200'), null, b.store)).toBeNull();
  });
});

describe('token de la impresora', () => {
  it('sha256 hex y formato plausible antes de consultar la base', () => {
    expect(hashPrinterToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(isPlausiblePrinterToken('x'.repeat(43))).toBe(true);
    expect(isPlausiblePrinterToken('short')).toBe(false);
    expect(isPlausiblePrinterToken('a/b'.repeat(20))).toBe(false);
  });
});
