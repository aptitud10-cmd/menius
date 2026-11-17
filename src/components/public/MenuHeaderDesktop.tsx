'use client';

/**
 * MenuHeaderDesktop — header exclusivo para pantallas >= lg.
 * Edita SOLO este archivo para cambios en el header desktop.
 */

import { memo, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, X, ArrowLeft, LayoutDashboard, Clock, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { getTranslations } from '@/lib/translations';
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
  openLabel,
  closedLabel,
  backUrl,
  isScrolled = false,
  hasCover = false,
  locale = 'es',
  loyaltyPoints,
}: MenuHeaderProps) {
  const t = getTranslations(locale);
  const open = isRestaurantOpen(restaurant.operating_hours, restaurant.timezone);

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
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
        )}

        {/* Restaurant name — fades in when the cover (which carries it) scrolls
            away. Always laid out, only its opacity changes: mounting it on
            scroll pushed the search box 95px to the right mid-scroll. */}
        <motion.div
          initial={false}
          animate={{ opacity: showName ? 1 : 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          aria-hidden={!showName}
          className="flex items-center flex-shrink-0 min-w-0"
        >
          <span className="font-bold text-gray-900 truncate text-base max-w-[260px]">
            {restaurant.name}
          </span>
        </motion.div>

        {/* Center search bar */}
        <div className="flex flex-1 max-w-md mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-[#05c8a7]/20 focus:border-[#05c8a7] placeholder-gray-600"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                aria-label={t.clearSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {isOwner && (
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
          )}

          {restaurant.estimated_delivery_minutes && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-medium bg-gray-100 text-gray-700">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              ~{restaurant.estimated_delivery_minutes} min
            </span>
          )}

          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-semibold',
            open ? 'bg-[#e6faf7] text-[#047a65]' : 'bg-red-50 text-red-600'
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', open ? 'bg-[#05c8a7]' : 'bg-red-500')} />
            {open ? openLabel : closedLabel}
          </span>

          {tableName && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-[13px] font-semibold text-gray-700">
              {tableName}
            </span>
          )}

          <Link
            href={`/${restaurant.slug}/mis-pedidos`}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={t.myOrders}
            title={t.myOrders}
          >
            <History className="w-[18px] h-[18px] text-gray-700" />
          </Link>

          {loyaltyPoints != null && loyaltyPoints > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[13px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              ⭐ {loyaltyPoints} pts
            </span>
          )}

        </div>
      </div>
    </motion.header>
  );
});
