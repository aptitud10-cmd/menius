'use client';

import { memo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Search, X, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/lib/utils';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { Restaurant } from '@/types';

function isRestaurantOpen(hours?: Restaurant['operating_hours']): boolean {
  if (!hours || Object.keys(hours).length === 0) return true;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const day = days[now.getDay()];
  const dayHours = hours[day];
  if (!dayHours || dayHours.closed) return false;
  const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return t >= dayHours.open && t <= dayHours.close;
}

export const HEADER_HEIGHT = 56;

interface MenuHeaderProps {
  restaurant: Restaurant;
  tableName: string | null;
  searchQuery: string;
  showSearch: boolean;
  onSearchChange: (q: string) => void;
  onToggleSearch: () => void;
  searchPlaceholder: string;
  fmtPrice: (n: number) => string;
  openLabel: string;
  closedLabel: string;
  backUrl?: string;
}

export const MenuHeader = memo(function MenuHeader({
  restaurant,
  tableName,
  searchQuery,
  showSearch,
  onSearchChange,
  onToggleSearch,
  searchPlaceholder,
  fmtPrice,
  openLabel,
  closedLabel,
  backUrl,
}: MenuHeaderProps) {
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.qty, 0));
  const itemTotal = useCartStore((s) => s.items.reduce((sum, i) => sum + i.lineTotal, 0));
  const setOpen = useCartStore((s) => s.setOpen);
  const open = isRestaurantOpen(restaurant.operating_hours);

  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    getSupabaseBrowser().auth.getSession().then(({ data }) => {
      if (data.session) setIsOwner(true);
    });
  }, []);

  return (
    <header className="flex-shrink-0 z-40 bg-white border-b border-gray-200">
      <div className="h-14 max-w-[1440px] mx-auto px-4 lg:px-6 flex items-center gap-3">
        {/* Back button (demo/external) */}
        {backUrl && (
          <Link href={backUrl} className="flex-shrink-0 p-1.5 -ml-1.5 rounded-lg active:bg-gray-100 transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
        )}

        {/* Logo + Name */}
        <div className="flex items-center gap-2.5 flex-shrink-0 min-w-0">
          {restaurant.logo_url ? (
            <div className="relative w-8 h-8 lg:w-10 lg:h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <Image src={restaurant.logo_url} alt={restaurant.name} fill sizes="40px" className="object-cover" />
            </div>
          ) : (
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <span className="text-xs lg:text-sm font-bold text-white">{restaurant.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <span className="text-sm lg:text-base font-bold text-gray-900 truncate max-w-[140px] lg:max-w-[220px]">{restaurant.name}</span>
        </div>

        {/* Center: Search bar (desktop) */}
        <div className="hidden md:flex flex-1 max-w-md mx-auto">
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
        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0 ml-auto">
          {isOwner && (
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          )}

          <span className={cn(
            'hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold',
            open ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', open ? 'bg-emerald-500' : 'bg-red-500')} />
            {open ? openLabel : closedLabel}
          </span>

          {tableName && (
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-[11px] font-semibold text-gray-600">
              {tableName}
            </span>
          )}

          {/* Mobile search toggle */}
          <button onClick={onToggleSearch} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Search">
            <Search className="w-4 h-4 text-gray-500" />
          </button>

          {/* Mobile cart button */}
          <button
            onClick={() => setOpen(true)}
            className={cn(
              'relative flex items-center gap-2 px-3 py-2 rounded-lg transition-colors lg:hidden',
              itemCount > 0 ? 'bg-emerald-500 text-white' : 'hover:bg-gray-100'
            )}
          >
            <ShoppingCart className={cn('w-4 h-4', itemCount > 0 ? 'text-white' : 'text-gray-500')} />
            {itemCount > 0 && (
              <span className="text-xs font-bold tabular-nums">{itemCount}</span>
            )}
          </button>

          {/* Desktop cart summary */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-gray-200">
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

      {/* Mobile search — expandable */}
      {showSearch && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-gray-400"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => { onSearchChange(''); onToggleSearch(); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
});
