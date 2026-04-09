/**
 * Environment variable validation.
 * Groups vars by criticality — server-only secrets are checked at startup
 * only in server context to avoid leaking them to the browser bundle.
 */

// Always required (public — used client + server)
const REQUIRED_PUBLIC = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
] as const;

// Required on server (not exposed to client)
const REQUIRED_SERVER = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'ORDER_TOKEN_SECRET',
  'CRON_SECRET',
  'ADMIN_EMAIL',
] as const;

// Optional but logged when missing in production
const RECOMMENDED = [
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_DSN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'WHATSAPP_ACCESS_TOKEN',
] as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const key of REQUIRED_PUBLIC) {
    if (!process.env[key]) missing.push(key);
  }

  // Only validate server-only vars when running on the server
  if (typeof window === 'undefined') {
    for (const key of REQUIRED_SERVER) {
      if (!process.env[key]) missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nCheck your .env.local file or Vercel environment settings.`
    );
  }

  // Warn about recommended vars in production
  if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
    for (const key of RECOMMENDED) {
      if (!process.env[key]) {
        console.warn(`[env] Recommended env var not set: ${key}`);
      }
    }
  }
}

export function getEnv<T extends string>(key: T, fallback?: string): string {
  const value = process.env[key];
  if (!value && fallback === undefined) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value || fallback || '';
}
