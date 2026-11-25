'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initAnalytics, isTrackedPath, trackPageView } from '@/lib/analytics';

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

  // Loaded on the first tracked page; a staff screen never downloads it.
  useEffect(() => {
    if (isTrackedPath(pathname)) initAnalytics();
  }, [pathname]);

  useEffect(() => {
    if (pathname && isTrackedPath(pathname)) {
      const url = searchParams?.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      trackPageView(url);
    }
  }, [pathname, searchParams]);

  return null;
}
