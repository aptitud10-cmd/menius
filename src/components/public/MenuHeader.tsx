'use client';

import { memo } from 'react';
import { ShoppingBag, Search, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/lib/utils';

interface MenuHeaderProps {
  restaurantName: string;
  tableName: string | null;
  searchQuery: string;
  showSearch: boolean;
  onSearchChange: (q: string) => void;
  onToggleSearch: () => void;
  searchPlaceholder: string;
  fmtPrice: (n: number) => string;
}

export const MenuHeader = memo(function MenuHeader({
  restaurantName,
  tableName,
  searchQuery,
  showSearch,
  onSearchChange,
  onToggleSearch,
  searchPlaceholder,
  fmtPrice,
}: MenuHeaderProps) {
  const totalItems = useCartStore((s) => s.totalItems);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const setOpen = useCartStore((s) => s.setOpen);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: restaurant name */}
          <h1 className="text-base font-bold text-gray-900 truncate mr-4">
            {restaurantName}
          </h1>

          {/* Right: badges + actions */}
          <div className="flex items-center gap-2">
            {tableName && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-600">
                {tableName}
              </span>
            )}

            <button
              onClick={onToggleSearch}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
              aria-label="Search"
            >
              <Search className="w-4 h-4 text-gray-500" />
            </button>

            {/* Cart button — visible on mobile only (desktop has permanent panel) */}
            <button
              onClick={() => setOpen(true)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
              aria-label="Cart"
            >
              <ShoppingBag className="w-4 h-4 text-gray-700" />
              {totalItems() > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-gray-900 text-white text-[9px] font-bold">
                  {totalItems()}
                </span>
              )}
            </button>

            {/* Desktop: cart summary in header */}
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <ShoppingBag className="w-4 h-4 text-gray-400" />
              <span className={cn(
                'font-bold tabular-nums',
                totalItems() > 0 ? 'text-gray-900' : 'text-gray-300'
              )}>
                {totalItems() > 0 ? fmtPrice(totalPrice()) : '$0'}
              </span>
            </div>
          </div>
        </div>

        {/* Search bar — expandable */}
        {showSearch && (
          <div className="pb-3 lg:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 placeholder-gray-400"
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
