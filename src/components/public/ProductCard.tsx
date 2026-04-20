'use client';

/**
 * ProductCard — thin compositor.
 * Mobile layout  → ProductCardMobile.tsx   (edit this for mobile-only changes)
 * Desktop layout → ProductCardDesktop.tsx  (edit this for desktop-only changes)
 *
 * Mobile-first SSR: initial state defaults to false (mobile) so the server
 * and first client paint both render a single card variant, cutting the SSR
 * HTML in half for large catalogs. After hydration, useEffect swaps to the
 * desktop variant on wide screens (one silent re-render, imperceptible to users).
 */

import { memo, useState, useEffect } from 'react';
import type { Product } from '@/types';
import { ProductCardMobile } from './ProductCardMobile';
import { ProductCardDesktop } from './ProductCardDesktop';

export interface ProductCardProps {
  product: Product;
  restaurantId: string;
  onSelect: (p: Product) => void;
  onQuickAdd: (p: Product) => void;
  fmtPrice: (n: number) => string;
  addLabel: string;
  customizeLabel: string;
  popularLabel: string;
  soldOutLabel?: string;
  unavailableLabel?: string;
  addedShortLabel?: string;
  locale?: string;
  defaultLocale?: string;
  priority?: boolean;
}

export const ProductCard = memo(function ProductCard(props: ProductCardProps) {
  // Default false = mobile: SSR and first paint render only ProductCardMobile.
  // useEffect detects the real breakpoint after hydration.
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isDesktop) return <ProductCardDesktop {...props} />;
  return <ProductCardMobile {...props} />;
});
