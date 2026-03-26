'use client';

/**
 * MenuHeader — thin compositor.
 * Mobile layout  → MenuHeaderMobile.tsx   (edit this for mobile-only changes)
 * Desktop layout → MenuHeaderDesktop.tsx  (edit this for desktop-only changes)
 */

import { memo } from 'react';
import type { Restaurant } from '@/types';
import { MenuHeaderMobile } from './MenuHeaderMobile';
import { MenuHeaderDesktop } from './MenuHeaderDesktop';

export const HEADER_HEIGHT = 56;

export interface MenuHeaderProps {
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
  isScrolled?: boolean;
  hasCover?: boolean;
  locale?: string;
}

/** Utility shared by both mobile and desktop sub-components */
export function isRestaurantOpen(hours?: Restaurant['operating_hours']): boolean {
  if (!hours || Object.keys(hours).length === 0) return true;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const day = days[now.getDay()];
  const dayHours = hours[day];
  if (!dayHours || dayHours.closed) return false;
  const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return t >= dayHours.open && t <= dayHours.close;
}

export const MenuHeader = memo(function MenuHeader(props: MenuHeaderProps) {
  return (
    <>
      {/* Rendered only on mobile (< lg) */}
      <div className="lg:hidden">
        <MenuHeaderMobile {...props} />
      </div>
      {/* Rendered only on desktop (>= lg) */}
      <div className="hidden lg:block">
        <MenuHeaderDesktop {...props} />
      </div>
    </>
  );
});
