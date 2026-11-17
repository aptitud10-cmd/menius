'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initAnalytics, trackPageView } from '@/lib/analytics';

/**
 * Renders nothing — it only initialises analytics and reports page views.
 * It must NOT wrap the app: useSearchParams() makes Next bail out of static
 * rendering up to the nearest <Suspense>, and when that boundary wrapped
 * {children} every page (menus, landing) shipped empty HTML and was built in
 * the browser. Mounted as a sibling in its own Suspense instead.
 */
export function PostHogProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (pathname) {
      const url = searchParams?.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      trackPageView(url);
    }
  }, [pathname, searchParams]);

  return null;
}
