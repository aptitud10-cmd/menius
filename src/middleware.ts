import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || '';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  let detectedLocale: string | null = null;
  if (!request.cookies.get('menius_locale')?.value) {
    const acceptLang = request.headers.get('accept-language') || '';
    const primaryLang = acceptLang.split(',')[0]?.split(';')[0]?.split('-')[0]?.trim().toLowerCase();
    detectedLocale = primaryLang === 'en' ? 'en' : 'es';
    request.cookies.set({ name: 'menius_locale', value: detectedLocale });
    response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set('menius_locale', detectedLocale, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
    });
  }

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
          if (detectedLocale) {
            response.cookies.set('menius_locale', detectedLocale, {
              path: '/',
              maxAge: 365 * 24 * 60 * 60,
              sameSite: 'lax',
            });
          }
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

  if (path.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host) {
      let originHost: string;
      try {
        originHost = new URL(origin).host;
      } catch {
        return new NextResponse(JSON.stringify({ error: 'Invalid origin' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (originHost !== host) {
        return new NextResponse(JSON.stringify({ error: 'Invalid origin' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  const isDashboard = path.startsWith('/app') || path.startsWith('/kds') || path.startsWith('/counter');
  const isAdmin = path.startsWith('/admin');
  const isOnboarding = path.startsWith('/onboarding');
  const isAuthPage = path === '/login' || path === '/signup';
  const isAuthCallback = path.startsWith('/auth/callback');
  const needsAuth = isDashboard || isAdmin || isOnboarding || isAuthPage;

  if (isAuthCallback) return response;

  // Skip auth + DB queries entirely for public routes (menu, blog, landing, etc.)
  if (!needsAuth) {
    // API routes should never be rewritten — they need to stay as /api/...
    if (path.startsWith('/api/')) {
      return response;
    }

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
        url.pathname = `/${restaurant.slug}${path === '/' ? '' : path}`;
        return NextResponse.rewrite(url);
      }
    }
    return response;
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (isDashboard || isAdmin || isOnboarding) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return response;
  }

  // Admin routes: require auth + must be a recognised admin email
  if (isAdmin) {
    const adminEmails = (process.env.ADMIN_EMAIL ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!adminEmails.length || !adminEmails.includes((user.email ?? '').toLowerCase())) {
      return NextResponse.redirect(new URL('/app', request.url));
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
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdminUser = adminEmail && user.email === adminEmail;

  if (isAuthPage) {
    if (hasRestaurant) {
      return NextResponse.redirect(new URL('/app', request.url));
    }
    if (isAdminUser) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/onboarding/create-restaurant', request.url));
  }

  if (isDashboard && !hasRestaurant) {
    return NextResponse.redirect(new URL('/onboarding/create-restaurant', request.url));
  }

  if (isOnboarding && hasRestaurant) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  const isBillingPage = path === '/app/billing';
  const isSubscriptionWall = path === '/app/subscription-expired';
  const isVerifyEmailWall = path === '/app/verify-email';

  // Enforce email verification before dashboard access
  if (isDashboard && !isBillingPage && !isSubscriptionWall && !isVerifyEmailWall) {
    if (user && !user.email_confirmed_at) {
      return NextResponse.redirect(new URL('/app/verify-email', request.url));
    }
  }

  if (isDashboard && hasRestaurant && profile?.default_restaurant_id && !isBillingPage && !isSubscriptionWall && !isVerifyEmailWall) {
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, current_period_end, trial_end, created_at')
        .eq('restaurant_id', profile.default_restaurant_id)
        .maybeSingle();

      const now = new Date();

      if (!subscription) {
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('created_at')
          .eq('id', profile.default_restaurant_id)
          .maybeSingle();
        const createdAt = restaurant?.created_at ? new Date(restaurant.created_at) : new Date(0);
        const graceEnds = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
        if (now > graceEnds) {
          return NextResponse.redirect(new URL('/app/subscription-expired', request.url));
        }
      } else {
        const { status } = subscription;
        // trial_end in future → full access (covers 'trialing' + manual admin extensions)
        const trialStillValid = subscription.trial_end && new Date(subscription.trial_end) > now;

        if (status === 'active' || status === 'past_due') {
          // allow
        } else if (trialStillValid) {
          // allow — trial or admin-extended access
        } else {
          return NextResponse.redirect(new URL('/app/subscription-expired', request.url));
        }
      }
    } catch {
      // Graceful degradation: if subscription check fails, allow access but log the failure.
      // This prevents a DB outage from locking all users out of their dashboards.
      console.error('[middleware] Subscription check failed — allowing access', {
        restaurantId: profile.default_restaurant_id,
      });
    }
  }

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    '/app/:path*',
    '/kds/:path*',
    '/counter',
    '/onboarding/:path*',
    '/login',
    '/signup',
    '/auth/callback',
    '/admin',
    '/admin/:path*',
    // Exclude API routes, static files, and assets from middleware
    '/((?!api/|_next/static|_next/image|favicon|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
