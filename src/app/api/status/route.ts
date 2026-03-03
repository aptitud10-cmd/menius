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

async function measure(
  fn: () => Promise<void>,
  timeoutMs = 5000
): Promise<{ status: ServiceStatus; latency: number }> {
  const start = Date.now();
  try {
    await Promise.race([
      fn(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      ),
    ]);
    const latency = Date.now() - start;
    return { status: latency < 2000 ? 'operational' : 'degraded', latency };
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
    // Supabase DB — ping REST root (returns 200 or 406)
    measure(async () => {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      if (!res.ok && res.status !== 406) throw new Error('DB failed');
    }),

    // Supabase Auth health endpoint
    measure(async () => {
      const res = await fetch(`${supabaseUrl}/auth/v1/health`);
      if (!res.ok) throw new Error('Auth failed');
    }),

    // Supabase Storage health endpoint
    measure(async () => {
      const res = await fetch(`${supabaseUrl}/storage/v1/health`, {
        headers: { apikey: supabaseKey },
      });
      if (!res.ok) throw new Error('Storage failed');
    }),

    // Stripe — balance endpoint (200 if key valid)
    measure(async () => {
      if (!stripeKey) throw new Error('Not configured');
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      if (!res.ok) throw new Error('Stripe failed');
    }),

    // Resend — domains list (200 if key valid)
    measure(async () => {
      if (!resendKey) throw new Error('Not configured');
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${resendKey}` },
      });
      if (!res.ok) throw new Error('Resend failed');
    }),

    // Menu digital — public demo page HEAD request
    measure(async () => {
      const res = await fetch(`${appUrl}/r/demo`, { method: 'HEAD' });
      if (!res.ok) throw new Error('Menu failed');
    }),
  ]);

  // API itself is operational if this route is responding
  const api: { status: ServiceStatus; latency: number } = { status: 'operational', latency: 1 };

  const services: ServiceResult[] = [
    { id: 'api', name: 'API & Dashboard', nameEn: 'API & Dashboard', ...api },
    { id: 'database', name: 'Base de datos', nameEn: 'Database', ...database },
    { id: 'auth', name: 'Autenticación', nameEn: 'Authentication', ...auth },
    { id: 'storage', name: 'Almacenamiento de imágenes', nameEn: 'Image Storage', ...storage },
    { id: 'stripe', name: 'Pagos (Stripe)', nameEn: 'Payments (Stripe)', ...stripe },
    { id: 'email', name: 'Notificaciones (Email)', nameEn: 'Email Notifications', ...email },
    { id: 'menu', name: 'Menú digital (QR)', nameEn: 'Digital Menu (QR)', ...menu },
  ];

  return NextResponse.json({ services, checkedAt: new Date().toISOString() });
}
