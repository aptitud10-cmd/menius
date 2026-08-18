'use client';

import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, ChevronRight, Heart, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DIETARY_TAGS } from '@/lib/dietary-tags';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useCartStore } from '@/store/cartStore';
import { tName, tDesc } from '@/lib/i18n';
import { getTranslations } from '@/lib/translations';
import type { ProductCardProps } from './ProductCard';

/**
 * Compact listing for products that don't carry a photo — bottled drinks, sides,
 * anything whose name already tells the customer what arrives.
 *
 * Deliberately has no image slot at all, not even a placeholder. A greyed-out
 * icon where a photo belongs reads as a broken image, and it costs the same
 * vertical space as the real thing; six drinks fit in a screen as rows where two
 * fit as cards. Everything a card communicates still has to be here — sold out,
 * cart count, favourite, "from" pricing when modifiers exist — only the picture
 * is gone. Same handlers and same 44px touch targets as ProductCardMobile.
 */
export const ProductRow = memo(function ProductRow({
  product,
  restaurantId,
  onSelect,
  onQuickAdd,
  fmtPrice,
  customizeLabel,
  soldOutLabel,
  locale = 'es',
  defaultLocale = 'es',
}: ProductCardProps) {
  const t = getTranslations(locale);
  const labelSoldOut = soldOutLabel ?? t.soldOut;

  const hasVariants = (product.variants?.length ?? 0) > 0;
  const hasExtras = (product.extras?.length ?? 0) > 0;
  const hasModifierGroups = (product.modifier_groups?.length ?? 0) > 0;
  const hasModifiers = product.has_modifiers ?? (hasVariants || hasExtras || hasModifierGroups);
  const outOfStock = product.in_stock === false;

  const tableName = useCartStore((s) => s.tableName);
  const selectedOrderType = useCartStore((s) => s.selectedOrderType);
  const isDineIn = tableName != null || selectedOrderType === 'dine_in';
  const showDineInOnly = product.dine_in_only === true && !isDineIn;

  const [justAdded, setJustAdded] = useState(false);

  const displayName = tName(product, locale, defaultLocale);
  const displayDesc = tDesc(product, locale, defaultLocale);

  const isFav = useFavoritesStore((s) => s.isFav(restaurantId, product.id));
  const toggleFav = useFavoritesStore((s) => s.toggle);

  const cartQty = useCartStore((s) =>
    s.items.reduce((sum, i) => (i.product.id === product.id ? sum + i.qty : sum), 0)
  );

  const haptic = () => { try { navigator?.vibrate?.([25, 15, 10]); } catch {} };

  const handleRowClick = useCallback(() => {
    if (outOfStock) return;
    onSelect(product);
  }, [outOfStock, onSelect, product]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (outOfStock) return;
    if (hasModifiers) {
      onSelect(product);
    } else {
      haptic();
      onQuickAdd(product);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1200);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      window.dispatchEvent(new CustomEvent('menu:cart-fly', {
        detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      }));
    }
  }, [outOfStock, hasModifiers, onSelect, onQuickAdd, product]);

  return (
    <article
      onClick={outOfStock ? undefined : handleRowClick}
      className={cn(
        // break-inside-avoid: the desktop list is a CSS multi-column, which would
        // otherwise split a row's name into one column and its price into the next.
        // The list container draws the top rule; each row draws its own bottom one.
        // (A `first:border-t` would only reach the first row in the DOM, which in
        // the desktop multi-column layout is not the top of the second column.)
        'flex items-center gap-3 py-2.5 pl-1 pr-1 border-b border-ink-100 transition-colors break-inside-avoid',
        outOfStock ? 'opacity-60' : 'cursor-pointer active:bg-ink-50'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          {/* Wraps to a second line rather than truncating: "Hawaiian Pineapple
              Juice" and "Assorted Sodas & Diet Sodas" both lose their
              distinguishing word to an ellipsis, and two drinks that read the
              same are worse than one row being taller. */}
          <h3 className={cn(
            'font-semibold text-[15px] leading-snug line-clamp-2',
            outOfStock ? 'text-ink-400' : 'text-ink-950'
          )}>
            {displayName}
          </h3>
          {!outOfStock && cartQty > 0 && (
            <motion.span
              key={cartQty}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-px min-w-[20px] h-5 px-1.5 rounded-full bg-[#05c8a7] text-white text-[11px] font-extrabold flex items-center justify-center tabular-nums leading-none flex-shrink-0"
            >
              {cartQty}
            </motion.span>
          )}
          {outOfStock && (
            <span className="mt-1 text-[10px] font-bold text-ink-500 bg-ink-100 px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">
              {labelSoldOut}
            </span>
          )}
          {!outOfStock && product.is_new && (
            <span className="mt-1 text-[10px] font-bold text-white bg-blue-500 px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">
              {t.productNew}
            </span>
          )}
        </div>

        {displayDesc && !outOfStock && (
          <p className="text-xs text-ink-500 truncate mt-0.5 leading-snug">{displayDesc}</p>
        )}

        <div className="flex items-center gap-2 mt-0.5">
          {(product.dietary_tags?.length ?? 0) > 0 && (
            <span className="flex items-center gap-1 leading-none">
              {product.dietary_tags!.slice(0, 3).map((tagId) => {
                const tag = DIETARY_TAGS.find((d) => d.id === tagId);
                if (!tag) return null;
                return <span key={tagId} className="text-xs" aria-hidden="true">{tag.emoji}</span>;
              })}
            </span>
          )}
          {!outOfStock && showDineInOnly && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-950 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full leading-none">
              <span aria-hidden>🍷</span>
              {t.dineInOnlyBadge}
            </span>
          )}
          {hasModifiers && !outOfStock && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-ink-400 font-medium leading-none">
              {customizeLabel}
              <ChevronRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>

      {/* "From" belongs directly above the number it qualifies — on its own in the
          metadata line it read as a label for whatever followed it. */}
      <div className="flex flex-col items-end flex-shrink-0 leading-none">
        {hasModifiers && !outOfStock && (
          <span className="text-[9px] font-semibold text-ink-400 uppercase tracking-wide leading-none mb-0.5">
            {t.fromPrice}
          </span>
        )}
        <span className={cn(
          'text-[15px] font-bold tabular-nums leading-none',
          outOfStock ? 'text-ink-300 line-through' : 'text-ink-950'
        )}>
          {fmtPrice(Number(product.price))}
        </span>
      </div>

      {/* Favourite sits after the name, not before it: leading the row with a
          secondary action pushed the product name off the left edge. */}
      <button
        onClick={(e) => { e.stopPropagation(); haptic(); toggleFav(restaurantId, product.id); }}
        className="w-9 h-11 -my-2 flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7] rounded-full"
        aria-label={isFav ? t.removeFromFavorites : t.addToFavorites}
        aria-pressed={isFav}
      >
        <Heart className={cn('w-4 h-4 transition-colors', isFav ? 'fill-red-500 text-red-500' : 'text-ink-300')} />
      </button>

      {outOfStock ? (
        <div className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center flex-shrink-0">
          <Ban className="w-3.5 h-3.5 text-ink-300" />
        </div>
      ) : (
        /* 44px touch target wrapping the visible 32px circle */
        <button
          onClick={handleAddClick}
          aria-label={justAdded ? t.addedToCart : (hasModifiers ? t.ariaCustomize(displayName) : t.ariaAdd(displayName))}
          className="relative z-10 w-11 h-11 -my-2 flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#05c8a7] rounded-full"
        >
          <motion.span
            whileTap={{ scale: 0.88 }}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 pointer-events-none',
              justAdded ? 'bg-[#05c8a7] text-white' : 'bg-[#e6faf7] text-[#047a65] hover:bg-[#d0f7f1]'
            )}
          >
            {justAdded ? <Check className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
          </motion.span>
        </button>
      )}
    </article>
  );
});
