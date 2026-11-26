'use client';

/**
 * MenuHeaderMobile — header exclusivo para pantallas < lg.
 * Edita SOLO este archivo para cambios en el header mobile.
 */

import { memo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadSupabaseBrowser } from '@/lib/supabase/browser-lazy';
import { getTranslations } from '@/lib/translations';
import { LanguageMenu } from './LanguageMenu';
import { HeaderCartButton } from './HeaderCartButton';
import type { MenuHeaderProps } from './MenuHeader';
import { isRestaurantOpen } from './MenuHeader';

let _sessionCache: Promise<boolean> | null = null;
function checkIsLoggedIn(): Promise<boolean> {
  if (!_sessionCache) {
    _sessionCache = loadSupabaseBrowser()
      .then((s) => s.auth.getSession())
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
  locale = 'es',
  loyaltyPoints,
  languages,
  onLocaleChange,
  fmtPrice,
  cartCount = 0,
  cartTotal = 0,
  onOpenCart,
}: MenuHeaderProps) {
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    checkIsLoggedIn().then((loggedIn) => { if (loggedIn) setIsOwner(true); });
  }, []);

  const t = getTranslations(locale);
  const showName = !hasCover || isScrolled;
  const isTransparent = hasCover && !isScrolled;
  // Closed shows next to the name once the cover (and its strip) scroll away.
  // After mount only: the server's clock must not decide the first render.
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    const check = () => setClosed(!isRestaurantOpen(restaurant.operating_hours, restaurant.timezone));
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [restaurant.operating_hours, restaurant.timezone]);

  return (
    <header
      className={cn(
        'flex-shrink-0 z-40 transition-colors duration-300',
        // Push content below the iOS notch / Dynamic Island. The inset is 0 on
        // devices without a notch (and on desktop), so this never adds dead space
        // where it isn't needed.
        'pt-[env(safe-area-inset-top)]',
        isTransparent
          ? 'bg-transparent border-transparent'
          : cn('bg-white border-b', isScrolled ? 'border-gray-200 shadow-[0_1px_8px_rgba(0,0,0,0.08)]' : 'border-gray-200')
      )}
    >
      <div className="relative flex items-center h-12 px-2">
        {/* Left: Back */}
        <div className="flex items-center flex-shrink-0">
          {backUrl && (
            <Link
              href={backUrl}
              className={cn(
                'w-10 h-10 flex items-center justify-center rounded-full transition-colors',
                isTransparent ? 'bg-black/30 backdrop-blur-sm active:bg-black/50' : 'active:bg-gray-100'
              )}
              aria-label={t.goBack}
            >
              <ArrowLeft className={cn('w-5 h-5', isTransparent ? 'text-white' : 'text-gray-600')} />
            </Link>
          )}
        </div>

        {/* Center: Restaurant name — absolutely centered.
            Sans extrabold con tracking apretado (Opción C): más carácter que el
            bold plano sin perder legibilidad en mobile — el patrón de Uber Eats. */}
        <span className={cn(
          'absolute left-0 right-0 text-center font-extrabold text-[20px] tracking-[-0.03em] px-16 md:px-56 truncate pointer-events-none',
          !showName && 'invisible',
          isTransparent ? 'text-white drop-shadow' : 'text-gray-900'
        )}>
          {restaurant.name}
          {closed && (
            <span className="ml-2 align-[2px] text-[13px] font-semibold tracking-normal text-[#b42318]">
              {closedLabel}
            </span>
          )}
        </span>

        {/* Right: Loyalty badge + Dashboard + Search */}
        <div className="ml-auto flex items-center flex-shrink-0">
          {loyaltyPoints != null && loyaltyPoints > 0 && (
            <span className={cn(
              'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold mr-1',
              isTransparent ? 'bg-black/30 text-white' : 'bg-amber-50 text-amber-600 border border-amber-200'
            )}>
              ⭐ {loyaltyPoints}
            </span>
          )}
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
          {languages && languages.length > 1 && onLocaleChange && (
            <LanguageMenu
              locales={languages}
              current={locale}
              onChange={onLocaleChange}
              label={t.changeLanguageAriaLabel}
              tone={isTransparent ? 'overlay' : 'light'}
            />
          )}
          <button
            onClick={onToggleSearch}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-full transition-colors',
              isTransparent ? 'bg-black/30 backdrop-blur-sm active:bg-black/50' : 'active:bg-gray-100'
            )}
            aria-label={t.searchProducts}
          >
            <Search className={cn('w-5 h-5', isTransparent ? 'text-white' : 'text-gray-700')} />
          </button>
          {/* Tablet only (md–lg): phones keep the bottom cart bar. */}
          {onOpenCart && (
            <HeaderCartButton
              count={cartCount}
              total={cartTotal}
              onOpen={onOpenCart}
              fmtPrice={fmtPrice}
              t={t}
              overPhoto={isTransparent}
              showLabel={false}
              className="hidden md:inline-flex ml-1"
            />
          )}
        </div>
      </div>
    </header>
  );
});
