import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || '';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const path = request.nextUrl.pathname;

  const isDashboard = path.startsWith('/app');
  const isOnboarding = path.startsWith('/onboarding');
  const isAuthPage = path === '/login' || path === '/signup';
  const isAuthCallback = path.startsWith('/auth/callback');
  const needsAuth = isDashboard || isOnboarding || isAuthPage;

  if (isAuthCallback) return response;

  // Skip auth + DB queries entirely for public routes (menu, blog, landing, etc.)
  if (!needsAuth) {
    const hostname = request.headers.get('host') || '';
    const isMainDomain = !MAIN_DOMAIN || hostname === MAIN_DOMAIN || hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1');
    if (!isMainDomain) {
      const cleanHost = hostname.replace(/:\d+$/, '');
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('slug')
        .eq('custom_domain', cleanHost)
        .maybeSingle();
      if (restaurant?.slug) {
        const url = request.nextUrl.clone();
        url.pathname = `/r/${restaurant.slug}${path === '/' ? '' : path}`;
        return NextResponse.rewrite(url);
      }
    }
    return response;
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (isDashboard || isOnboarding) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return response;
  }

  // Single query: profile + subscription in parallel
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const hasRestaurant = !profileError && !!profile?.default_restaurant_id;

  if (isAuthPage) {
    return NextResponse.redirect(new URL(hasRestaurant ? '/app' : '/onboarding/create-restaurant', request.url));
  }

  if (isDashboard && !hasRestaurant) {
    return NextResponse.redirect(new URL('/onboarding/create-restaurant', request.url));
  }

  if (isOnboarding && hasRestaurant) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  const isBillingPage = path === '/app/billing';
  const isSubscriptionWall = path === '/app/subscription-expired';

  if (isDashboard && hasRestaurant && !isBillingPage && !isSubscriptionWall) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, trial_end')
      .eq('restaurant_id', profile!.default_restaurant_id)
      .maybeSingle();

    if (subscription) {
      const now = new Date();
      const isTrialing = subscription.status === 'trialing';
      const isActive = subscription.status === 'active';
      const isPastDue = subscription.status === 'past_due';
      const trialEnded = subscription.trial_end && new Date(subscription.trial_end) < now;
      const periodEnded = subscription.current_period_end && new Date(subscription.current_period_end) < now;

      if (isTrialing && trialEnded) {
        return NextResponse.redirect(new URL('/app/subscription-expired', request.url));
      }

      if (!isTrialing && !isActive && !isPastDue && periodEnded) {
        return NextResponse.redirect(new URL('/app/subscription-expired', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/app/:path*', '/onboarding/:path*', '/login', '/signup', '/auth/callback',
    '/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
