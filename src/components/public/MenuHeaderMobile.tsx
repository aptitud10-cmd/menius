'use client';

/**
 * MenuHeaderMobile — header exclusivo para pantallas < lg.
 * Edita SOLO este archivo para cambios en el header mobile.
 */

import { memo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { MenuHeaderProps } from './MenuHeader';

export const MenuHeaderMobile = memo(function MenuHeaderMobile({
  restaurant,
  onToggleSearch,
  openLabel,
  closedLabel,
  backUrl,
  isScrolled = false,
  hasCover = false,
  locale = 'es',
}: MenuHeaderProps) {
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    getSupabaseBrowser()
      .auth.getSession()
      .then(({ data }) => {
        const uid = data.session?.user?.id;
        if (uid && restaurant.owner_user_id && uid === restaurant.owner_user_id) {
          setIsOwner(true);
        }
      })
      .catch(() => {});
  }, [restaurant.owner_user_id]);

  const showName = !hasCover || isScrolled;
  const isTransparent = hasCover && !isScrolled;

  return (
    <header
      className={cn(
        'flex-shrink-0 z-40 transition-colors duration-300',
        isTransparent
          ? 'bg-transparent border-transparent'
          : cn('bg-white border-b', isScrolled ? 'border-gray-200 shadow-[0_1px_8px_rgba(0,0,0,0.08)]' : 'border-gray-200')
      )}
    >
      <div className="relative flex items-center h-14 px-2">
        {/* Left: Back */}
        <div className="flex items-center flex-shrink-0">
          {backUrl && (
            <Link
              href={backUrl}
              className={cn(
                'w-10 h-10 flex items-center justify-center rounded-full transition-colors',
                isTransparent ? 'bg-black/30 backdrop-blur-sm active:bg-black/50' : 'active:bg-gray-100'
              )}
              aria-label={locale === 'en' ? 'Back' : 'Atrás'}
            >
              <ArrowLeft className={cn('w-5 h-5', isTransparent ? 'text-white' : 'text-gray-600')} />
            </Link>
          )}
        </div>

        {/* Center: Restaurant name — absolutely centered */}
        <span className={cn(
          'absolute left-0 right-0 text-center font-bold text-[20px] px-16 truncate pointer-events-none',
          !showName && 'invisible',
          isTransparent ? 'text-white drop-shadow' : 'text-gray-900'
        )}>
          {restaurant.name}
        </span>

        {/* Right: Dashboard + Search */}
        <div className="ml-auto flex items-center flex-shrink-0">
          {isOwner && (
            <Link
              href="/app"
              className={cn(
                'w-10 h-10 flex items-center justify-center rounded-full transition-colors',
                isTransparent ? 'bg-black/30 backdrop-blur-sm active:bg-black/50' : 'active:bg-gray-100'
              )}
              aria-label="Dashboard"
            >
              <LayoutDashboard className={cn('w-4 h-4', isTransparent ? 'text-white' : 'text-gray-500')} />
            </Link>
          )}
          <button
            onClick={onToggleSearch}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-full transition-colors',
              isTransparent ? 'bg-black/30 backdrop-blur-sm active:bg-black/50' : 'active:bg-gray-100'
            )}
            aria-label={locale === 'en' ? 'Search' : 'Buscar'}
          >
            <Search className={cn('w-4 h-4', isTransparent ? 'text-white' : 'text-gray-500')} />
          </button>
        </div>
      </div>
    </header>
  );
});
