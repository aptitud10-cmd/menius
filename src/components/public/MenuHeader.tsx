'use client';

import { memo } from 'react';
import Image from 'next/image';
import { ShoppingBag, Search, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/lib/utils';
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
}: MenuHeaderProps) {
  const totalItems = useCartStore((s) => s.totalItems);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const setOpen = useCartStore((s) => s.setOpen);
  const open = isRestaurantOpen(restaurant.operating_hours);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-6">
        {/* Banner */}
        <div className="flex items-center gap-3.5 py-3">
          {restaurant.logo_url ? (
            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 ring-1 ring-gray-200/60">
              <Image src={restaurant.logo_url} alt={restaurant.name} fill sizes="44px" className="object-cover" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
              <span className="text-base font-bold text-white">{restaurant.name.charAt(0).toUpperCase()}</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900 truncate">{restaurant.name}</h1>
              {tableName && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-semibold text-gray-500 flex-shrink-0">
                  {tableName}
                </span>
              )}
            </div>
            {restaurant.description && (
              <p className="text-xs text-gray-400 truncate mt-0.5">{restaurant.description}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={cn(
              'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold',
              open ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', open ? 'bg-emerald-500' : 'bg-red-400')} />
              {open ? openLabel : closedLabel}
            </span>

            <button onClick={onToggleSearch} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Search">
              <Search className="w-4 h-4 text-gray-400" />
            </button>

            <button onClick={() => setOpen(true)} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden" aria-label="Cart">
              <ShoppingBag className="w-4 h-4 text-gray-700" />
              {totalItems() > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-gray-900 text-white text-[9px] font-bold">
                  {totalItems()}
                </span>
              )}
            </button>

            <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-gray-100">
              <ShoppingBag className="w-4 h-4 text-gray-400" />
              <span className={cn('text-sm font-bold tabular-nums', totalItems() > 0 ? 'text-gray-900' : 'text-gray-300')}>
                {totalItems() > 0 ? fmtPrice(totalPrice()) : '$0'}
              </span>
            </div>
          </div>
        </div>

        {showSearch && (
          <div className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 placeholder-gray-400"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => { onSearchChange(''); onToggleSearch(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
});
