/**
 * Custom domains for restaurant stores.
 *
 * A domain only serves the store once (1) its DNS points at Vercel AND (2) it
 * is added to the Vercel project. The DNS check alone used to mark it "active"
 * while the domain still showed Vercel's 404, so the panel lied.
 *
 * With VERCEL_API_TOKEN + VERCEL_PROJECT_ID (+ VERCEL_TEAM_ID) set, the domain is
 * added to the project automatically. Without them, a person adds it by hand and
 * the live check below confirms it once it works.
 */
import { createLogger } from '@/lib/logger';

const logger = createLogger('vercel-domains');
const API = 'https://api.vercel.com';

export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT';
  name: string;
  value: string;
}

/** Vercel's documented defaults, used when the API is not configured. */
const DEFAULT_A = '76.76.21.21';
const DEFAULT_CNAME = 'cname.vercel-dns.com';

function apiConfig(): { token: string; project: string; team: string } | null {
  const token = (process.env.VERCEL_API_TOKEN ?? '').trim();
  const project = (process.env.VERCEL_PROJECT_ID ?? '').trim();
  const team = (process.env.VERCEL_TEAM_ID ?? '').trim();
  return token && project ? { token, project, team } : null;
}

export function vercelDomainsConfigured(): boolean {
  return apiConfig() !== null;
}

/**
 * example.com is an apex (needs an A record); www.example.com is a subdomain
 * (CNAME). Two-part public suffixes like .co.uk are rare for our customers and
 * fall on the subdomain side, where the API's own recommendation still wins.
 */
export function isApexDomain(domain: string): boolean {
  return domain.split('.').filter(Boolean).length === 2;
}

/** The record the owner must create when we cannot ask Vercel. */
export function defaultDnsRecord(domain: string): DnsRecord {
  return isApexDomain(domain)
    ? { type: 'A', name: '@', value: DEFAULT_A }
    : { type: 'CNAME', name: domain.split('.')[0], value: DEFAULT_CNAME };
}

async function vercel(path: string, init: RequestInit = {}): Promise<Response | null> {
  const cfg = apiConfig();
  if (!cfg) return null;
  const sep = path.includes('?') ? '&' : '?';
  const url = `${API}${path}${cfg.team ? `${sep}teamId=${encodeURIComponent(cfg.team)}` : ''}`;
  try {
    return await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    logger.error('Vercel API request failed', { path, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/** Does the DNS already point at Vercel? Uses Google's public resolver. */
export async function dnsPointsToVercel(domain: string): Promise<boolean> {
  const ask = async (type: 'CNAME' | 'A'): Promise<string[]> => {
    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`, {
        headers: { Accept: 'application/dns-json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { Answer?: { type: number; data: unknown }[] };
      return (data.Answer ?? [])
        .filter((a) => a.type === (type === 'CNAME' ? 5 : 1) && typeof a.data === 'string')
        .map((a) => String(a.data).replace(/\.$/, ''));
    } catch {
      return [];
    }
  };
  const [cnames, ips] = await Promise.all([ask('CNAME'), ask('A')]);
  return cnames.some((c) => c.endsWith('vercel-dns.com')) || ips.some((ip) => ip === DEFAULT_A || ip.startsWith('76.76.21.'));
}

/**
 * The real test: does https://domain answer from our deployment? Vercel marks
 * its own "no deployment for this domain" page with x-vercel-error.
 */
export async function domainServesStore(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${domain}/`, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'MENIUS-domain-check' },
    });
    if (res.headers.get('x-vercel-error')) return false;
    return !!res.headers.get('x-vercel-id') && res.status < 500;
  } catch {
    // TLS not issued yet, DNS not propagated, timeout…
    return false;
  }
}

export type DomainSetup =
  | { state: 'added' }
  | { state: 'needs_records'; records: DnsRecord[] }
  | { state: 'not_configured' }
  | { state: 'error' };

/**
 * Adds the domain to the Vercel project (idempotent) and returns the records
 * the owner still has to create, if any: Vercel's ownership TXT when the domain
 * is used by another Vercel account, then the A/CNAME it recommends.
 */
export async function addDomainToProject(domain: string): Promise<DomainSetup> {
  const cfg = apiConfig();
  if (!cfg) return { state: 'not_configured' };
  const project = encodeURIComponent(cfg.project);
  const name = encodeURIComponent(domain);

  const add = await vercel(`/v10/projects/${project}/domains`, { method: 'POST', body: JSON.stringify({ name: domain }) });
  // 400 also means "already on this project": the GET below settles it.
  if (!add || (!add.ok && add.status !== 400 && add.status !== 409)) {
    logger.error('Add domain failed', { domain, status: add?.status });
    return { state: 'error' };
  }

  const got = await vercel(`/v9/projects/${project}/domains/${name}`);
  if (!got?.ok) {
    logger.error('Domain not on project after add', { domain, status: got?.status, addStatus: add.status });
    return { state: 'error' };
  }
  const info = (await got.json()) as {
    verified?: boolean;
    verification?: { type: string; domain: string; value: string }[];
  };
  if (info.verified === false && info.verification?.length) {
    return {
      state: 'needs_records',
      records: info.verification.map((v) => ({ type: 'TXT' as const, name: v.domain, value: v.value })),
    };
  }

  const conf = await vercel(`/v6/domains/${name}/config`);
  if (conf?.ok) {
    const c = (await conf.json()) as {
      misconfigured?: boolean;
      recommendedIPv4?: { rank: number; value: string[] }[];
      recommendedCNAME?: { rank: number; value: string }[];
    };
    if (c.misconfigured === false) return { state: 'added' };
    const fallback = defaultDnsRecord(domain);
    const record: DnsRecord =
      fallback.type === 'A'
        ? { ...fallback, value: c.recommendedIPv4?.find((r) => r.rank === 1)?.value?.[0] ?? fallback.value }
        : { ...fallback, value: (c.recommendedCNAME?.find((r) => r.rank === 1)?.value ?? fallback.value).replace(/\.$/, '') };
    return { state: 'needs_records', records: [record] };
  }
  return { state: 'added' };
}

/** Best-effort: frees a domain the restaurant stopped using. */
export async function removeDomainFromProject(domain: string): Promise<void> {
  const cfg = apiConfig();
  if (!cfg) return;
  const res = await vercel(`/v9/projects/${encodeURIComponent(cfg.project)}/domains/${encodeURIComponent(domain)}`, {
    method: 'DELETE',
  });
  if (res && !res.ok && res.status !== 404) {
    logger.error('Remove domain failed', { domain, status: res.status });
  }
}
