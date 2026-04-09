/**
 * Environment variable validation.
 * validateEnv() logs warnings at build/import time but never throws —
 * throwing during Next.js static page collection breaks builds.
 *
 * Use requireEnv() inside route handlers / server actions to enforce
 * a specific var is present at actual request time.
 */

// Always required (public — used client + server)
const REQUIRED_PUBLIC = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

// Required on server at runtime (not exposed to client)
const REQUIRED_SERVER = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'ORDER_TOKEN_SECRET',
  'CRON_SECRET',
  'ADMIN_EMAIL',
  'NEXT_PUBLIC_APP_URL',
] as const;

// Optional but logged when missing in production
const RECOMMENDED = [
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_DSN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'WHATSAPP_ACCESS_TOKEN',
] as const;

/**
 * Safe to call at module load time — only warns, never throws.
 * Real enforcement happens in requireEnv() at request time.
 */
export function validateEnv() {
  if (typeof window !== 'undefined') return; // skip in browser

  const missing: string[] = [];

  for (const key of REQUIRED_PUBLIC) {
    if (!process.env[key]) missing.push(key);
  }

  if (missing.length > 0) {
    console.warn(
      `[env] Missing public environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}`
    );
  }

  if (process.env.NODE_ENV === 'production') {
    const missingServer = REQUIRED_SERVER.filter((k) => !process.env[k]);
    if (missingServer.length > 0) {
      console.warn(
        `[env] Missing server environment variables (will fail at runtime):\n${missingServer.map((k) => `  - ${k}`).join('\n')}`
      );
    }

    const missingRecommended = RECOMMENDED.filter((k) => !process.env[k]);
    if (missingRecommended.length > 0) {
      console.warn(
        `[env] Recommended env vars not set:\n${missingRecommended.map((k) => `  - ${k}`).join('\n')}`
      );
    }
  }
}

/**
 * Enforce a var is present at request time (inside route handlers / server actions).
 * Throws immediately if missing so the error is clear and fast.
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Required environment variable "${key}" is not set. Check your Vercel environment settings.`
    );
  }
  return value;
}

export function getEnv<T extends string>(key: T, fallback?: string): string {
  const value = process.env[key];
  if (!value && fallback === undefined) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value || fallback || '';
}
