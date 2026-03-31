'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

export function Breadcrumbs() {
  const pathname = usePathname();
  const { t } = useDashboardLocale();
  const segments = pathname.split('/').filter(Boolean);

  const LABELS: Record<string, string> = {
    app: t.nav_home,
    orders: t.nav_orders,
    kds: t.nav_kds,
    menu: t.nav_menu,
    categories: t.nav_categories,
    products: t.nav_products,
    tables: t.nav_tables,
    customers: t.nav_customers,
    promotions: t.nav_promotions,
    staff: t.nav_staff,
    analytics: t.nav_analytics,
    marketing: t.nav_marketing,
    billing: t.nav_billing,
    settings: t.nav_settings,
  };

  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => ({
    label: LABELS[seg] || seg,
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav className="flex items-center gap-1.5 text-[13px] mb-5" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <Fragment key={crumb.href}>
          {i > 0 && <span className="text-gray-300 select-none">/</span>}
          {crumb.isLast ? (
            <span className="text-gray-900 font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
