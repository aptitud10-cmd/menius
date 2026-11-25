import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  addDomainToProject,
  defaultDnsRecord,
  domainServesStore,
  isApexDomain,
} from '@/lib/vercel-domains';

const ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ENV };
  vi.unstubAllGlobals();
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('apex vs subdomain', () => {
  it('apex gets an A record, subdomain a CNAME', () => {
    expect(isApexDomain('buccaneerdiner.com')).toBe(true);
    expect(isApexDomain('www.buccaneerdiner.com')).toBe(false);
    expect(defaultDnsRecord('buccaneerdiner.com')).toEqual({ type: 'A', name: '@', value: '76.76.21.21' });
    expect(defaultDnsRecord('order.buccaneerdiner.com')).toEqual({
      type: 'CNAME',
      name: 'order',
      value: 'cname.vercel-dns.com',
    });
  });
});

describe('addDomainToProject', () => {
  it('does nothing without the Vercel API configured', async () => {
    delete process.env.VERCEL_API_TOKEN;
    delete process.env.VERCEL_PROJECT_ID;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await addDomainToProject('example.com')).toEqual({ state: 'not_configured' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns the A record Vercel recommends while misconfigured', async () => {
    process.env.VERCEL_API_TOKEN = 't';
    process.env.VERCEL_PROJECT_ID = 'prj_1';
    process.env.VERCEL_TEAM_ID = 'team_1';
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url);
      if (url.includes('/v10/projects/')) return json({ name: 'example.com' });
      if (url.includes('/v9/projects/')) return json({ verified: true });
      return json({ misconfigured: true, recommendedIPv4: [{ rank: 1, value: ['76.76.21.99'] }] });
    }));
    expect(await addDomainToProject('example.com')).toEqual({
      state: 'needs_records',
      records: [{ type: 'A', name: '@', value: '76.76.21.99' }],
    });
    expect(calls.every((u) => u.includes('teamId=team_1'))).toBe(true);
  });

  it('asks for the ownership TXT when the domain is used by another account', async () => {
    process.env.VERCEL_API_TOKEN = 't';
    process.env.VERCEL_PROJECT_ID = 'prj_1';
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/v10/projects/')) return json({}, 400);
      return json({ verified: false, verification: [{ type: 'TXT', domain: '_vercel.example.com', value: 'vc-1' }] });
    }));
    expect(await addDomainToProject('example.com')).toEqual({
      state: 'needs_records',
      records: [{ type: 'TXT', name: '_vercel.example.com', value: 'vc-1' }],
    });
  });

  it('is added once Vercel sees it configured', async () => {
    process.env.VERCEL_API_TOKEN = 't';
    process.env.VERCEL_PROJECT_ID = 'prj_1';
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/v6/domains/')) return json({ misconfigured: false });
      return json({ verified: true });
    }));
    expect(await addDomainToProject('www.example.com')).toEqual({ state: 'added' });
  });
});

describe('domainServesStore', () => {
  it('false on Vercel\'s own "no deployment" page, true when our app answers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response('', { status: 404, headers: { 'x-vercel-id': 'iad1::x', 'x-vercel-error': 'DEPLOYMENT_NOT_FOUND' } }),
    ));
    expect(await domainServesStore('example.com')).toBe(false);

    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html></html>', { status: 200, headers: { 'x-vercel-id': 'iad1::y' } })));
    expect(await domainServesStore('example.com')).toBe(true);

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('certificate'); }));
    expect(await domainServesStore('example.com')).toBe(false);
  });
});
