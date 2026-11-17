'use client';

import { memo, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { tName, tDesc } from '@/lib/i18n';
import { getBlurUrl, supabaseLoader } from '@/lib/image-loader';
import { getTranslations } from '@/lib/translations';
import type { ProductCardProps } from './ProductCard';

/**
 * List row with a 108px photo on the right, for categories shown as a list on
 * phones (categories.display_mode = 'list', or the large-catalog default).
 * Used where dishes look alike and are chosen by reading — 19 burgers on a white
 * plate differ by "bacon" or "mushroom", not by the photo — so a list shows
 * 4 per screen instead of 2 (NN/g: grid when visual difference decides, list
 * when text does). Photo-less products keep using ProductRow.
 *
 * The whole row opens the dish. The "+" only appears when the dish can be added
 * without choosing anything (no modifiers); otherwise it would just open the
 * same sheet the row does, and "$12.95+" already says there are options.
 */
export const ProductListItem = memo(function ProductListItem({
  product,
  onSelect,
  onQuickAdd,
  fmtPrice,
  soldOutLabel,
  locale = 'es',
  defaultLocale = 'es',
  priority = false,
}: ProductCardProps) {
  const t = getTranslations(locale);
  const labelSoldOut = product.unavailable_note ?? soldOutLabel ?? t.soldOut;

  const hasModifiers =
    product.has_modifiers ??
    ((product.variants?.length ?? 0) > 0 ||
      (product.extras?.length ?? 0) > 0 ||
      (product.modifier_groups?.length ?? 0) > 0);
  const outOfStock = product.in_stock === false;

  const tableName = useCartStore((s) => s.tableName);
  const selectedOrderType = useCartStore((s) => s.selectedOrderType);
  const isDineIn = tableName != null || selectedOrderType === 'dine_in';
  const showDineInOnly = product.dine_in_only === true && !isDineIn;

  const cartQty = useCartStore((s) =>
    s.items.reduce((sum, i) => (i.product.id === product.id ? sum + i.qty : sum), 0)
  );

  const [justAdded, setJustAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [skipTransform, setSkipTransform] = useState(false);

  const displayName = tName(product, locale, defaultLocale);
  const displayDesc = tDesc(product, locale, defaultLocale);
  const showImage = !!product.image_url && !imgError;

  const open = useCallback(() => {
    if (!outOfStock) onSelect(product);
  }, [outOfStock, onSelect, product]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    },
    [open]
  );

  const handleQuickAdd = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (outOfStock) return;
      try { navigator?.vibrate?.([25, 15, 10]); } catch {}
      onQuickAdd(product);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1200);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      window.dispatchEvent(
        new CustomEvent('menu:cart-fly', {
          detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        })
      );
    },
    [outOfStock, onQuickAdd, product]
  );

  const price = Number(product.price);
  const compareAt = product.compare_at_price != null ? Number(product.compare_at_price) : null;

  return (
    <article
      role="button"
      tabIndex={outOfStock ? -1 : 0}
      aria-label={hasModifiers ? t.ariaCustomize(displayName) : displayName}
      aria-disabled={outOfStock || undefined}
      onClick={open}
      onKeyDown={handleKey}
      className={cn(
        'flex items-start gap-3 px-4 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900',
        outOfStock ? 'opacity-60' : 'cursor-pointer active:bg-ink-50'
      )}
    >
      <div className="flex-1 min-w-0">
        <h3
          className={cn(
            'text-[16px] font-semibold leading-snug tracking-[-0.01em] line-clamp-2',
            outOfStock ? 'text-ink-600' : 'text-ink-950'
          )}
        >
          {displayName}
        </h3>
        {displayDesc && !outOfStock && (
          <p className="mt-1 text-[14px] leading-snug text-ink-600 line-clamp-2">{displayDesc}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              'text-[15px] font-semibold tabular-nums',
              outOfStock ? 'text-ink-600 line-through' : 'text-ink-950'
            )}
          >
            {fmtPrice(price)}
            {hasModifiers && !outOfStock ? '+' : ''}
          </span>
          {!outOfStock && compareAt != null && compareAt > price && (
            <span className="text-[13px] text-ink-600 line-through tabular-nums">{fmtPrice(compareAt)}</span>
          )}
          {outOfStock && (
            <span className="text-[13px] font-semibold text-ink-700 bg-ink-100 px-2 py-0.5 rounded-full">
              {labelSoldOut}
            </span>
          )}
          {!outOfStock && product.is_new && (
            <span className="text-[13px] font-semibold text-ink-700 bg-ink-100 px-2 py-0.5 rounded-full">
              {t.productNew}
            </span>
          )}
          {!outOfStock && showDineInOnly && (
            <span className="text-[13px] font-semibold text-ink-700 bg-ink-100 px-2 py-0.5 rounded-full">
              {t.dineInOnlyBadge}
            </span>
          )}
          {!outOfStock && cartQty > 0 && (
            <motion.span
              key={cartQty}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#05c8a7] text-[#04241E] text-[12px] font-extrabold flex items-center justify-center tabular-nums"
              aria-label={`${cartQty} ${t.addedToCart}`}
            >
              {cartQty}
            </motion.span>
          )}
        </div>
      </div>

      {showImage && (
        <div className="relative flex-none w-[108px] h-[108px]">
          <div className="absolute inset-0 rounded-xl overflow-hidden bg-ink-100">
            <Image
              src={product.image_url!}
              alt=""
              fill
              sizes="108px"
              priority={priority}
              loading={priority ? undefined : 'lazy'}
              loader={!skipTransform && product.image_url!.includes('.supabase.co/storage/') ? supabaseLoader : undefined}
              placeholder={getBlurUrl(product.image_url!) ? 'blur' : undefined}
              blurDataURL={getBlurUrl(product.image_url!)}
              className={cn('object-cover', outOfStock && 'grayscale')}
              onError={() => (skipTransform ? setImgError(true) : setSkipTransform(true))}
            />
          </div>
          {!outOfStock && !hasModifiers && (
            /* 44px touch target around the visible 34px circle */
            <button
              type="button"
              onClick={handleQuickAdd}
              aria-label={justAdded ? t.addedToCart : t.ariaAdd(displayName)}
              className="absolute -right-2 -bottom-2 w-11 h-11 flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
            >
              <motion.span
                whileTap={{ scale: 0.88 }}
                className={cn(
                  'w-[34px] h-[34px] rounded-full flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.18)] pointer-events-none transition-colors',
                  justAdded ? 'bg-[#05c8a7] text-[#04241E]' : 'bg-white text-ink-950'
                )}
              >
                {justAdded ? <Check className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-[18px] h-[18px]" aria-hidden="true" />}
              </motion.span>
            </button>
          )}
        </div>
      )}
    </article>
  );
});
