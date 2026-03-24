'use client';

/**
 * MenuHeaderDesktop — header exclusivo para pantallas >= lg.
 * Edita SOLO este archivo para cambios en el header desktop.
 */

import { memo, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Search, X, ArrowLeft, LayoutDashboard, Clock, History } from 'lucide-react';
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

export const MenuHeaderDesktop = memo(function MenuHeaderDesktop({
  restaurant,
  tableName,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  fmtPrice,
  openLabel,
  closedLabel,
  backUrl,
  isScrolled = false,
  hasCover = false,
}: MenuHeaderProps) {
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.qty, 0));
  const itemTotal = useCartStore((s) => s.items.reduce((sum, i) => sum + i.lineTotal, 0));
  const open = isRestaurantOpen(restaurant.operating_hours);

  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    checkIsLoggedIn().then((loggedIn) => { if (loggedIn) setIsOwner(true); });
  }, []);

  const showName = !hasCover || isScrolled;

  return (
    <motion.header
      className={cn(
        'flex-shrink-0 z-40 bg-white/95 backdrop-blur-md border-b',
        isScrolled ? 'border-gray-200 shadow-[0_1px_12px_rgba(0,0,0,0.07)]' : 'border-gray-100'
      )}
      animate={{ boxShadow: isScrolled ? '0 1px 12px rgba(0,0,0,0.07)' : '0 0 0 transparent' }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-[1440px] mx-auto px-6 flex items-center gap-3 h-12">
        {/* Back */}
        {backUrl && (
          <Link
            href={backUrl}
            className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
        )}

        {/* Restaurant name — fade in when banner scrolls away */}
        <AnimatePresence mode="wait">
          {showName && (
            <motion.div
              key="restaurant-name"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex items-center flex-shrink-0 min-w-0"
            >
              <span className="font-bold text-gray-900 truncate text-base max-w-[260px]">
                {restaurant.name}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center search bar */}
        <div className="flex flex-1 max-w-md mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-gray-400"
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {isOwner && (
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
          )}

          {restaurant.estimated_delivery_minutes && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-500">
              <Clock className="w-3 h-3" />
              ~{restaurant.estimated_delivery_minutes} min
            </span>
          )}

          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold',
            open ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', open ? 'bg-emerald-500' : 'bg-red-500')} />
            {open ? openLabel : closedLabel}
          </span>

          {tableName && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-[11px] font-semibold text-gray-600">
              {tableName}
            </span>
          )}

          <Link
            href={`/${restaurant.slug}/mis-pedidos`}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Mis pedidos"
            title="Ver mis pedidos anteriores"
          >
            <History className="w-4 h-4 text-gray-500" />
          </Link>

          {/* Cart summary */}
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <ShoppingCart className="w-4 h-4 text-gray-400" />
            <span className={cn('text-sm font-bold tabular-nums', itemCount > 0 ? 'text-gray-900' : 'text-gray-300')}>
              {itemCount}
            </span>
            {itemCount > 0 && (
              <span className="text-sm font-bold text-emerald-600 tabular-nums">{fmtPrice(itemTotal)}</span>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
});
