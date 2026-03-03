export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ServiceStatus = 'operational' | 'degraded' | 'outage';

interface ServiceResult {
  id: string;
  name: string;
  nameEn: string;
  status: ServiceStatus;
  latency: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

function toStatus(latency: number): ServiceStatus {
  if (latency >= 3000) return 'degraded';
  if (latency >= 1500) return 'degraded';
  return 'operational';
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
  const resendKey = process.env.RESEND_API_KEY ?? '';
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://menius.app').replace(/\/$/, '');

  // Single Supabase client — no cookies needed for health checks
  const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

  const [database, auth, storage, stripe, email, menu] = await Promise.all([

    // DB — real lightweight query; RLS returns [] but no error if DB is up
    (async (): Promise<{ status: ServiceStatus; latency: number }> => {
      if (!supabase) return { status: 'degraded', latency: 0 };
      const start = Date.now();
      try {
        await withTimeout(
          supabase.from('restaurants').select('id').limit(1),
          6000
        );
        const latency = Date.now() - start;
        return { status: toStatus(latency), latency };
      } catch {
        return { status: 'outage', latency: Date.now() - start };
      }
    })(),

    // Auth — getSession confirms GoTrue is reachable (returns null session, not an error)
    (async (): Promise<{ status: ServiceStatus; latency: number }> => {
      if (!supabase) return { status: 'degraded', latency: 0 };
      const start = Date.now();
      try {
        const result = await withTimeout(supabase.auth.getSession(), 6000);
        const latency = Date.now() - start;
        if (result.error) return { status: 'outage', latency };
        return { status: toStatus(latency), latency };
      } catch {
        return { status: 'outage', latency: Date.now() - start };
      }
    })(),

    // Storage — listBuckets confirms storage service is reachable
    (async (): Promise<{ status: ServiceStatus; latency: number }> => {
      if (!supabase) return { status: 'degraded', latency: 0 };
      const start = Date.now();
      try {
        await withTimeout(supabase.storage.listBuckets(), 6000);
        const latency = Date.now() - start;
        return { status: toStatus(latency), latency };
      } catch {
        return { status: 'outage', latency: Date.now() - start };
      }
    })(),

    // Stripe — balance endpoint; any HTTP response = Stripe is reachable
    (async (): Promise<{ status: ServiceStatus; latency: number }> => {
      if (!stripeKey) return { status: 'degraded', latency: 0 };
      const start = Date.now();
      try {
        const res = await withTimeout(
          fetch('https://api.stripe.com/v1/balance', {
            headers: { Authorization: `Bearer ${stripeKey}` },
          }),
          6000
        );
        const latency = Date.now() - start;
        if (res.status >= 500) return { status: 'outage', latency };
        return { status: toStatus(latency), latency };
      } catch {
        return { status: 'outage', latency: Date.now() - start };
      }
    })(),

    // Resend — any response = service is reachable
    (async (): Promise<{ status: ServiceStatus; latency: number }> => {
      if (!resendKey) return { status: 'degraded', latency: 0 };
      const start = Date.now();
      try {
        const res = await withTimeout(
          fetch('https://api.resend.com/domains', {
            headers: { Authorization: `Bearer ${resendKey}` },
          }),
          6000
        );
        const latency = Date.now() - start;
        if (res.status >= 500) return { status: 'outage', latency };
        return { status: toStatus(latency), latency };
      } catch {
        return { status: 'outage', latency: Date.now() - start };
      }
    })(),

    // Menu digital — HEAD request to public demo page
    (async (): Promise<{ status: ServiceStatus; latency: number }> => {
      const start = Date.now();
      try {
        const res = await withTimeout(
          fetch(`${appUrl}/r/demo`, { method: 'HEAD' }),
          6000
        );
        const latency = Date.now() - start;
        if (res.status >= 500) return { status: 'outage', latency };
        return { status: toStatus(latency), latency };
      } catch {
        return { status: 'outage', latency: Date.now() - start };
      }
    })(),
  ]);

  const api: { status: ServiceStatus; latency: number } = { status: 'operational', latency: 1 };

  const services: ServiceResult[] = [
    { id: 'api',      name: 'API & Dashboard',           nameEn: 'API & Dashboard',        ...api },
    { id: 'database', name: 'Base de datos',              nameEn: 'Database',               ...database },
    { id: 'auth',     name: 'Autenticación',              nameEn: 'Authentication',         ...auth },
    { id: 'storage',  name: 'Almacenamiento de imágenes', nameEn: 'Image Storage',          ...storage },
    { id: 'stripe',   name: 'Pagos (Stripe)',              nameEn: 'Payments (Stripe)',      ...stripe },
    { id: 'email',    name: 'Notificaciones (Email)',      nameEn: 'Email Notifications',   ...email },
    { id: 'menu',     name: 'Menú digital (QR)',           nameEn: 'Digital Menu (QR)',      ...menu },
  ];

  return NextResponse.json({ services, checkedAt: new Date().toISOString() });
}
