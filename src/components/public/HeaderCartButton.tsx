'use client';

import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Translations } from '@/lib/translations';

interface HeaderCartButtonProps {
  count: number;
  total: number;
  onOpen: () => void;
  fmtPrice: (n: number) => string;
  t: Translations;
  /** Over the cover photo (transparent tablet header): a solid button keeps contrast. */
  overPhoto?: boolean;
  /** Desktop shows "Your order"; the tablet header has less room. */
  showLabel?: boolean;
  className?: string;
}

/**
 * The one way into the cart from tablet up (Pedro 2026-11-25: one cart, no
 * fixed column — the pattern DoorDash, Toast, Cava and Sweetgreen use). Count
 * and running total stay in sight (NN/g: show the subtotal next to the cart).
 * `data-cart-pill` is the target of the fly-to-cart animation and the anchor
 * of the "Added to your order" card.
 */
export function HeaderCartButton({
  count,
  total,
  onOpen,
  fmtPrice,
  t,
  overPhoto = false,
  showLabel = true,
  className,
}: HeaderCartButtonProps) {
  const filled = count > 0;
  return (
    <button
      type="button"
      data-cart-pill
      onClick={onOpen}
      aria-label={t.openOrderAria(count)}
      className={cn(
        'inline-flex items-center gap-2 h-10 pl-3 pr-3.5 rounded-full text-[14px] font-semibold whitespace-nowrap transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#05c8a7]',
        filled
          ? 'bg-[#05c8a7] text-[#04241E] hover:bg-[#04b096] shadow-[0_2px_8px_rgba(5,200,167,0.35)]'
          : overPhoto
            ? 'bg-white/90 text-gray-900 backdrop-blur-sm hover:bg-white'
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200',
        className,
      )}
    >
      <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={2.2} aria-hidden="true" />
      {showLabel && <span aria-hidden="true">{t.yourOrder}</span>}
      {filled && (
        <>
          <motion.span
            key={count}
            initial={{ scale: 1.35 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            aria-hidden="true"
            className="min-w-[22px] h-[22px] px-1.5 grid place-items-center rounded-full bg-[#04241E] text-white text-[12px] font-bold tabular-nums"
          >
            {count}
          </motion.span>
          <span aria-hidden="true" className="opacity-40">·</span>
          <span aria-hidden="true" className="tabular-nums">{fmtPrice(total)}</span>
        </>
      )}
    </button>
  );
}
