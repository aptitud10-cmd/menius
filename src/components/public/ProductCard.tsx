'use client';

/**
 * ProductCard — thin compositor.
 * Mobile layout  → ProductCardMobile.tsx   (edit this for mobile-only changes)
 * Desktop layout → ProductCardDesktop.tsx  (edit this for desktop-only changes)
 *
 * After hydration, only the layout matching the current breakpoint is mounted,
 * which eliminates the double-render (hooks, subscriptions, images) that
 * previously occurred on every product in the grid.
 */

import { memo, useState, useEffect } from 'react';
import type { Product } from '@/types';
import { ProductCardMobile } from './ProductCardMobile';
import { ProductCardDesktop } from './ProductCardDesktop';

export interface ProductCardProps {
  product: Product;
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
}

export const ProductCard = memo(function ProductCard(props: ProductCardProps) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isDesktop === true) return <ProductCardDesktop {...props} />;
  if (isDesktop === false) return <ProductCardMobile {...props} />;

  // SSR + first paint: render both with CSS-based visibility (no hydration mismatch)
  return (
    <>
      <div className="lg:hidden">
        <ProductCardMobile {...props} />
      </div>
      <div className="hidden lg:block">
        <ProductCardDesktop {...props} />
      </div>
    </>
  );
});
