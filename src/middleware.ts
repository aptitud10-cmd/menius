import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

  // Use getUser() — validates JWT server-side (getSession only reads the cookie)
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const isDashboard = path.startsWith('/app');
  const isOnboarding = path.startsWith('/onboarding');
  const isAuthPage = path === '/login' || path === '/signup';
  const isAuthCallback = path.startsWith('/auth/callback');

  // Never block the auth callback route
  if (isAuthCallback) {
    return response;
  }

  // ---- Not authenticated ----
  if (!user) {
    // Protected routes require login
    if (isDashboard || isOnboarding) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return response;
  }

  // ---- Authenticated ----
  // Fetch profile to check if user has a restaurant
  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  const hasRestaurant = !!profile?.default_restaurant_id;

  // If on auth pages (login/signup) and already logged in → redirect
  if (isAuthPage) {
    if (hasRestaurant) {
      return NextResponse.redirect(new URL('/app', request.url));
    }
    return NextResponse.redirect(new URL('/onboarding/create-restaurant', request.url));
  }

  // If on dashboard but has no restaurant → force onboarding
  if (isDashboard && !hasRestaurant) {
    return NextResponse.redirect(new URL('/onboarding/create-restaurant', request.url));
  }

  // If on onboarding but already has a restaurant → go to dashboard
  if (isOnboarding && hasRestaurant) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/app/:path*', '/onboarding/:path*', '/login', '/signup', '/auth/callback'],
};
