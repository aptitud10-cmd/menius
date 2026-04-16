'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

const NAV_ITEMS = [
  { href: '/app', labelKey: 'nav_home' as const, icon: LayoutDashboard, exact: true },
  { href: '/app/orders', labelKey: 'nav_orders' as const, icon: ClipboardList },
  { href: '/app/menu/products', labelKey: 'nav_menu' as const, activePrefix: '/app/menu', icon: UtensilsCrossed },
  { href: '/app/counter', labelKey: 'nav_counter' as const, icon: Monitor },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useDashboardLocale();

  const isActive = (item: typeof NAV_ITEMS[number]) => {
    if ('exact' in item && item.exact) return pathname === item.href;
    const prefix = ('activePrefix' in item ? item.activePrefix : undefined) ?? item.href;
    return pathname.startsWith(prefix);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const label = t[item.labelKey];
          const shortLabel = label.includes('/') ? label.split('/')[0].trim() : label;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors min-w-0',
                active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <item.icon
                className={cn('w-[22px] h-[22px] flex-shrink-0', active ? 'text-emerald-600' : 'text-gray-400')}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span className="truncate leading-tight max-w-full px-1">{shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
