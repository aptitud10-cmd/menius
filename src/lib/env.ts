import { z } from 'zod';

/**
 * Environment variable validation schema.
 * Required vars throw at startup; optional vars gracefully default.
 */

const envSchema = z.object({
  // Required — Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  // Required — App
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Optional — Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Optional — Supabase service role (for admin/webhook operations)
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Optional — WhatsApp
  WHATSAPP_API_URL: z.string().url().optional(),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),

  // Optional — AI
  GEMINI_API_KEY: z.string().optional(),

  // Optional — Google Places
  NEXT_PUBLIC_GOOGLE_PLACES_KEY: z.string().optional(),

  // Optional — Email
  RESEND_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');

    console.error(
      `\n❌ Invalid environment variables:\n${formatted}\n\nCheck your .env.local file.\n`
    );

    throw new Error('Invalid environment variables');
  }

  return result.data;
}

export const env = validateEnv();
