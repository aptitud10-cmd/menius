'use client';

/**
 * MenuHeaderMobile — header exclusivo para pantallas < lg.
 * Edita SOLO este archivo para cambios en el header mobile.
 */

import { memo, useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Search, ArrowLeft, LayoutDashboard, History } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/lib/utils';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { MenuHeaderProps } from './MenuHeader';
import { isRestaurantOpen } from './MenuHeader';

let _sessionCache: Promise<boolean> | null = null;
function checkIsLoggedIn(): Promise<boolean> {
  if (!_sessionCache) {
    _sessionCache = getSupabaseBrowser()
      .auth.getSession()
      .then(({ data }) => !!data.session)
      .catch(() => false);
  }
  return _sessionCache;
}

export const MenuHeaderMobile = memo(function MenuHeaderMobile({
  restaurant,
  onToggleSearch,
  openLabel,
  closedLabel,
  backUrl,
  isScrolled = false,
  hasCover = false,
}: MenuHeaderProps) {
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.qty, 0));
  const setOpen = useCartStore((s) => s.setOpen);
  const open = isRestaurantOpen(restaurant.operating_hours);

  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    checkIsLoggedIn().then((loggedIn) => { if (loggedIn) setIsOwner(true); });
  }, []);

  const showName = !hasCover || isScrolled;

  return (
    <header
      className={cn(
        'flex-shrink-0 z-40 bg-white border-b',
        isScrolled ? 'border-gray-200 shadow-sm' : 'border-gray-100'
      )}
    >
      <div className="flex items-center h-12 px-2 gap-1">
        {/* Back */}
        {backUrl && (
          <Link
            href={backUrl}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg active:bg-gray-100 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
        )}

        {/* Restaurant name — takes all available space */}
        <span className={cn(
          'flex-1 min-w-0 font-bold text-gray-900 text-sm truncate',
          !showName && 'invisible'
        )}>
          {restaurant.name}
        </span>

        {/* Open/closed dot */}
        <span
          className={cn('w-2 h-2 rounded-full flex-shrink-0 mx-1', open ? 'bg-emerald-500' : 'bg-red-500')}
          title={open ? openLabel : closedLabel}
        />

        {/* Dashboard (owner only) */}
        {isOwner && (
          <Link
            href="/app"
            className="w-10 h-10 flex items-center justify-center rounded-lg active:bg-gray-100 transition-colors"
            aria-label="Dashboard"
          >
            <LayoutDashboard className="w-4 h-4 text-gray-500" />
          </Link>
        )}

        {/* My orders */}
        <Link
          href={`/${restaurant.slug}/mis-pedidos`}
          className="w-10 h-10 flex items-center justify-center rounded-lg active:bg-gray-100 transition-colors"
          aria-label="Mis pedidos"
        >
          <History className="w-4 h-4 text-gray-500" />
        </Link>

        {/* Search toggle — opens fullscreen overlay in MenuShell */}
        <button
          onClick={onToggleSearch}
          className="w-10 h-10 flex items-center justify-center rounded-lg active:bg-gray-100 transition-colors"
          aria-label="Search"
        >
          <Search className="w-4 h-4 text-gray-500" />
        </button>

        {/* Cart button */}
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'flex items-center gap-1.5 min-w-[44px] h-10 px-2.5 rounded-xl transition-colors justify-center flex-shrink-0',
            itemCount > 0 ? 'bg-emerald-500 text-white' : 'hover:bg-gray-100'
          )}
        >
          <ShoppingCart className={cn('w-4 h-4', itemCount > 0 ? 'text-white' : 'text-gray-500')} />
          {itemCount > 0 && (
            <span className="text-xs font-bold tabular-nums">{itemCount}</span>
          )}
        </button>
      </div>
    </header>
  );
});
