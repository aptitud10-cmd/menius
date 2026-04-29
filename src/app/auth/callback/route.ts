export const dynamic = 'force-dynamic';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

const VALID_PUBLIC_PLANS = new Set(['free', 'starter', 'pro', 'business']);

async function resolveRedirect(
  supabase: any,
  origin: string,
  next: string,
  type: string | null,
  intendedPlan: string | null,
  intendedBilling: string | null,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(next, origin));

  // For password recovery, go straight to the reset page — no restaurant check needed.
  if (type === 'recovery') return NextResponse.redirect(new URL(next, origin));

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile?.default_restaurant_id) {
    return NextResponse.redirect(new URL('/app', origin));
  }

  // New restaurant flow — propagate plan intent to onboarding (only if valid)
  const onboardingUrl = new URL('/onboarding/create-restaurant', origin);
  if (intendedPlan && VALID_PUBLIC_PLANS.has(intendedPlan) && intendedPlan !== 'free') {
    onboardingUrl.searchParams.set('plan', intendedPlan);
    if (intendedBilling === 'annual') onboardingUrl.searchParams.set('billing', 'annual');
  }
  return NextResponse.redirect(onboardingUrl);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'magiclink' | 'email' | 'recovery' | null;

  // Only allow relative paths to prevent open redirect attacks.
  // An absolute URL like "https://evil.com" passed as `next` would bypass origin-based resolution.
  const rawNext = searchParams.get('next') ?? '/app';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/app';

  const cookieStore = await cookies();

  // Read plan intent from cookie (set during signup) — propagated to onboarding
  const intendedPlan = cookieStore.get('menius_intended_plan')?.value ?? null;
  const intendedBilling = cookieStore.get('menius_intended_billing')?.value ?? null;
  // Clear cookies after reading (one-shot)
  if (intendedPlan) cookieStore.set({ name: 'menius_intended_plan', value: '', maxAge: 0, path: '/' });
  if (intendedBilling) cookieStore.set({ name: 'menius_intended_billing', value: '', maxAge: 0, path: '/' });
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

  // Flow 1: PKCE code exchange (Google OAuth + magic link same-browser)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return resolveRedirect(supabase, origin, next, type, intendedPlan, intendedBilling);
  }

  // Flow 2: token_hash (magic link opened in a different browser/device)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return resolveRedirect(supabase, origin, next, type, intendedPlan, intendedBilling);
  }

  // Auth error — redirect to login with error indicator
  return NextResponse.redirect(new URL('/login?error=auth', origin));
}
