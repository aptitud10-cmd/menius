'use client';

import Image from 'next/image';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { cartItemImage } from '@/lib/product-display';
import { cartModLines, withTitle } from '@/lib/modifier-lines';
import { ProductGlyph } from './ProductGlyph';
import type { Translations } from '@/lib/translations';

/** Long enough to read and reach a button (NN/g: no quickly-fading overlays). */
const VISIBLE_MS = 6000;

interface AddedToOrderCardProps {
  /** Cart line just added (addItem always appends a new line with its own uid). */
  uid: string;
  onClose: () => void;
  onViewOrder: () => void;
  onCheckout: () => void;
  fmtPrice: (n: number) => string;
  t: Translations;
}

/**
 * "Added to your order" — tablet and desktop only, anchored under the header
 * cart button. Doesn't dim or block the menu and never opens the cart by
 * itself (DoorDash's mini-cart; Shopify Horizon's auto_open_cart_drawer: false).
 * Stays while the pointer or focus is on it; Esc or ✕ closes it.
 */
export function AddedToOrderCard({ uid, onClose, onViewOrder, onCheckout, fmtPrice, t }: AddedToOrderCardProps) {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const index = items.findIndex((i) => i.uid === uid);
  const item = index >= 0 ? items[index] : null;
  const cartTotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  // Anchor under the header button that is on screen.
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const pill = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-pill]')).find((e) => e.offsetParent);
      if (!pill) return setPos({ top: 60, right: 16 });
      const r = pill.getBoundingClientRect();
      setPos({ top: Math.round(r.bottom + 10), right: Math.max(12, Math.round(window.innerWidth - r.right)) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, []);

  // Auto-close, paused while hovered or focused.
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (paused) return;
    timer.current = setTimeout(onClose, VISIBLE_MS);
    return () => clearTimeout(timer.current);
  }, [paused, uid, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // The line was removed or edited away (e.g. from the cart): nothing to confirm.
  useEffect(() => { if (!item) onClose(); }, [item, onClose]);

  const undo = useCallback(() => {
    if (index >= 0) removeItem(index);
    onClose();
  }, [index, removeItem, onClose]);

  if (!item || !pos) return null;

  const thumb = cartItemImage(item);
  const { name, lines } = withTitle(item.product.name, cartModLines(item.modifierSelections));
  const detail = lines.map((l) => l.text).join(' · ');

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{ top: pos.top, right: pos.right }}
      className="hidden md:block fixed z-[45] w-[360px] rounded-[18px] bg-white border border-gray-100 shadow-[0_18px_48px_rgba(0,0,0,0.16)] p-3.5"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-[22px] h-[22px] rounded-full bg-[#05c8a7] grid place-items-center flex-shrink-0" aria-hidden="true">
          <Check className="w-3.5 h-3.5 text-[#04241E]" strokeWidth={3.2} />
        </span>
        <p className="flex-1 text-[15px] font-semibold text-gray-900">{t.addedToYourOrder}</p>
        <button
          type="button"
          onClick={undo}
          className="h-8 px-2 rounded-lg text-[13px] font-semibold text-[#047a65] hover:bg-[#e6faf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
        >
          {t.cartUndo}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="w-8 h-8 grid place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3 p-2.5 rounded-[14px] bg-gray-50">
        {thumb ? (
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
            <Image src={thumb.src} alt="" fill sizes="56px" unoptimized={thumb.option} className="object-cover" />
          </div>
        ) : (
          <ProductGlyph name={item.product.name} className="w-14 h-14 rounded-xl" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-900 leading-snug line-clamp-2">
            {item.qty > 1 && <span className="tabular-nums">{item.qty}× </span>}
            {name}
          </p>
          {detail && <p className="text-[13px] text-gray-600 leading-snug truncate mt-0.5">{detail}</p>}
        </div>
        <p className="text-[14px] font-semibold text-gray-900 tabular-nums flex-shrink-0">{fmtPrice(item.lineTotal)}</p>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={onViewOrder}
          className="flex-1 h-11 rounded-[14px] border-[1.5px] border-gray-300 bg-white text-[14px] font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
        >
          {t.viewOrder}
        </button>
        <button
          type="button"
          onClick={onCheckout}
          className="flex-[1.3] h-11 rounded-[14px] bg-[#05c8a7] text-[14px] font-bold text-[#04241E] hover:bg-[#04b096] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#05c8a7]"
        >
          {t.placeOrder} · <span className="tabular-nums">{fmtPrice(cartTotal)}</span>
        </button>
      </div>
    </motion.div>
  );
}
