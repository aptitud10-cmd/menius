export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

type ServiceStatus = 'operational' | 'degraded' | 'outage';

interface ServiceResult {
  id: string;
  name: string;
  nameEn: string;
  status: ServiceStatus;
  latency: number;
}

/**
 * Probes a service URL. Rules:
 * - Any 2xx/3xx/4xx response → service is reachable (operational or degraded by latency)
 * - 5xx or network/timeout error → outage
 * - Env var missing → degraded (config issue, not a service outage)
 */
async function probe(
  fn: () => Promise<Response | 'unconfigured'>,
  timeoutMs = 7000
): Promise<{ status: ServiceStatus; latency: number }> {
  const start = Date.now();
  try {
    const result = await Promise.race<Response | 'unconfigured'>([
      fn(),
      new Promise<Response | 'unconfigured'>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      ),
    ]);

    const latency = Date.now() - start;

    if (result === 'unconfigured') {
      return { status: 'degraded', latency: 0 };
    }

    // 5xx = server error = outage
    if (result.status >= 500) {
      return { status: 'outage', latency };
    }

    // Any 2xx / 3xx / 4xx → service is responding
    if (latency >= 3000) return { status: 'degraded', latency };
    if (latency >= 1500) return { status: 'degraded', latency };
    return { status: 'operational', latency };
  } catch {
    return { status: 'outage', latency: Date.now() - start };
  }
}

export async function GET() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
  const resendKey = process.env.RESEND_API_KEY ?? '';
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://menius.app').replace(/\/$/, '');

  const [database, auth, storage, stripe, email, menu] = await Promise.all([

    // Supabase REST — any HTTP response = DB is reachable
    probe(async () => {
      if (!supabaseUrl || !supabaseKey) return 'unconfigured';
      return fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
    }),

    // Supabase Auth health endpoint (no auth required)
    probe(async () => {
      if (!supabaseUrl) return 'unconfigured';
      return fetch(`${supabaseUrl}/auth/v1/health`);
    }),

    // Supabase Storage health endpoint
    probe(async () => {
      if (!supabaseUrl || !supabaseKey) return 'unconfigured';
      return fetch(`${supabaseUrl}/storage/v1/health`, {
        headers: { apikey: supabaseKey },
      });
    }),

    // Stripe — any response (200 with valid key, 401 invalid) = Stripe is up
    probe(async () => {
      if (!stripeKey) return 'unconfigured';
      return fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
    }),

    // Resend — any response = Resend is up
    probe(async () => {
      if (!resendKey) return 'unconfigured';
      return fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${resendKey}` },
      });
    }),

    // Menu digital — HEAD request to the public domain
    probe(async () => {
      if (!appUrl) return 'unconfigured';
      return fetch(`${appUrl}/r/demo`, { method: 'HEAD' });
    }),
  ]);

  // API itself: if this route responded, the API is operational
  const api: { status: ServiceStatus; latency: number } = { status: 'operational', latency: 1 };

  const services: ServiceResult[] = [
    { id: 'api',      name: 'API & Dashboard',            nameEn: 'API & Dashboard',         ...api },
    { id: 'database', name: 'Base de datos',               nameEn: 'Database',                ...database },
    { id: 'auth',     name: 'Autenticación',               nameEn: 'Authentication',          ...auth },
    { id: 'storage',  name: 'Almacenamiento de imágenes',  nameEn: 'Image Storage',           ...storage },
    { id: 'stripe',   name: 'Pagos (Stripe)',               nameEn: 'Payments (Stripe)',       ...stripe },
    { id: 'email',    name: 'Notificaciones (Email)',       nameEn: 'Email Notifications',     ...email },
    { id: 'menu',     name: 'Menú digital (QR)',            nameEn: 'Digital Menu (QR)',       ...menu },
  ];

  return NextResponse.json({ services, checkedAt: new Date().toISOString() });
}
