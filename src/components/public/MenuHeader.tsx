'use client';

/**
 * MenuHeader — thin compositor.
 * Mobile layout  → MenuHeaderMobile.tsx   (edit this for mobile-only changes)
 * Desktop layout → MenuHeaderDesktop.tsx  (edit this for desktop-only changes)
 */

import { memo } from 'react';
import { inTimeZone, isOpenAt, type OperatingHours } from '@/lib/orders/business-hours';
import type { Restaurant } from '@/types';
import { MenuHeaderMobile } from './MenuHeaderMobile';
import { MenuHeaderDesktop } from './MenuHeaderDesktop';

// Altura del header mobile (px). Compartida con el sticky de categorías en
// MenuShell para alinear su `top:` justo debajo del header. Solo afecta mobile;
// en desktop el offset se fuerza a 0 (ver MenuShell:824). Mantener sincronizada
// con la clase de altura del <header> en MenuHeaderMobile (h-12 = 48px).
export const HEADER_HEIGHT = 48;

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
  loyaltyPoints?: number | null;
}

/** Utility shared by both mobile and desktop sub-components */
/**
 * Open right now, in the restaurant's zone — not the diner's phone, and not the
 * server's UTC clock (which put tomorrow's hours on screen every evening in New
 * York). Same rule as checkout (isOpenAt), so a late-night schedule that crosses
 * midnight reads as open at 1 AM too.
 */
export function isRestaurantOpen(
  hours?: Restaurant['operating_hours'],
  timeZone?: string | null,
): boolean {
  if (!hours || Object.keys(hours).length === 0) return true;
  return isOpenAt(hours as OperatingHours, inTimeZone(new Date(), timeZone || 'UTC'));
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
