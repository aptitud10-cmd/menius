export const dynamic = 'force-dynamic';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

function getBaseUrl(origin: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (process.env.VERCEL_ENV === 'preview' && appUrl) return appUrl;
  return origin;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const flow = searchParams.get('flow') === 'signup' ? 'signup' : 'login';
  const next = flow === 'signup' ? '/onboarding/create-restaurant' : '/app';
  const baseUrl = getBaseUrl(origin).replace(/\/$/, '');

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data?.url) {
    const fallback = flow === 'signup' ? '/signup?error=google_oauth' : '/login?error=google_oauth';
    return NextResponse.redirect(new URL(fallback, origin));
  }

  return NextResponse.redirect(data.url);
}

