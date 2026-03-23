'use client';

/**
 * ProductCard — thin compositor.
 * Mobile layout  → ProductCardMobile.tsx   (edit this for mobile-only changes)
 * Desktop layout → ProductCardDesktop.tsx  (edit this for desktop-only changes)
 */

import { memo } from 'react';
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
  return (
    <>
      {/* Rendered only on mobile (< lg) */}
      <div className="lg:hidden">
        <ProductCardMobile {...props} />
      </div>
      {/* Rendered only on desktop (>= lg) */}
      <div className="hidden lg:block">
        <ProductCardDesktop {...props} />
      </div>
    </>
  );
});
