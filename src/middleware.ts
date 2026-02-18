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

  // ---- Custom Domain Routing ----
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
      url.pathname = `/r/${restaurant.slug}${request.nextUrl.pathname === '/' ? '' : request.nextUrl.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // Use getUser() — validates JWT server-side (getSession only reads the cookie)
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const isDashboard = path.startsWith('/app');
  const isOnboarding = path.startsWith('/onboarding');
  const isAuthPage = path === '/login' || path === '/signup';
  const isAuthCallback = path.startsWith('/auth/callback');
  const isBillingPage = path === '/app/billing';
  const isSubscriptionWall = path === '/app/subscription-expired';

  // Never block the auth callback route
  if (isAuthCallback) {
    return response;
  }

  // ---- Not authenticated ----
  if (!user) {
    if (isDashboard || isOnboarding) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return response;
  }

  // ---- Authenticated ----
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const hasRestaurant = !profileError && !!profile?.default_restaurant_id;

  // If on auth pages and already logged in
  if (isAuthPage) {
    if (hasRestaurant) {
      return NextResponse.redirect(new URL('/app', request.url));
    }
    return NextResponse.redirect(new URL('/onboarding/create-restaurant', request.url));
  }

  // If on dashboard but has no restaurant
  if (isDashboard && !hasRestaurant) {
    return NextResponse.redirect(new URL('/onboarding/create-restaurant', request.url));
  }

  // If on onboarding but already has a restaurant
  if (isOnboarding && hasRestaurant) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  // ---- Subscription check for dashboard routes ----
  if (isDashboard && hasRestaurant && !isBillingPage && !isSubscriptionWall) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, trial_end')
      .eq('restaurant_id', profile!.default_restaurant_id)
      .single();

    if (subscription) {
      const now = new Date();
      const isTrialing = subscription.status === 'trialing';
      const isActive = subscription.status === 'active';
      const isPastDue = subscription.status === 'past_due';
      const trialEnded = subscription.trial_end && new Date(subscription.trial_end) < now;
      const periodEnded = subscription.current_period_end && new Date(subscription.current_period_end) < now;

      // Trial expired without subscribing
      if (isTrialing && trialEnded) {
        return NextResponse.redirect(new URL('/app/subscription-expired', request.url));
      }

      // Subscription canceled or unpaid and period ended
      if (!isTrialing && !isActive && !isPastDue && periodEnded) {
        return NextResponse.redirect(new URL('/app/subscription-expired', request.url));
      }

      // Past due -- allow access but they'll see a banner in the dashboard
    }
    // If no subscription record exists, allow access (graceful degradation)
  }

  return response;
}

export const config = {
  matcher: [
    '/app/:path*', '/onboarding/:path*', '/login', '/signup', '/auth/callback',
    '/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
