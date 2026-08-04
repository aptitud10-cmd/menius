'use client';

/**
 * ProductCardFeatured — the wide card used only inside the "Popular" carousel.
 *
 * Deliberately NOT a variant of ProductCardMobile: the grid card is optimised
 * for scanning 400 products two-up, this one is optimised for one editorial
 * recommendation at a time. Different aspect ratio (16:9 vs square), room for
 * the description, and the add button sits over the image instead of competing
 * with the price row.
 */

import { memo, useState, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Check, UtensilsCrossed, Heart, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useCartStore } from '@/store/cartStore';
import { tName } from '@/lib/i18n';
import { getBlurUrl, supabaseLoader } from '@/lib/image-loader';
import { getTranslations } from '@/lib/translations';
import type { ProductCardProps } from './ProductCard';

export interface ProductCardFeaturedProps extends ProductCardProps {
  /** When false the "#1 this week" / "N orders" badges are suppressed.
   *  Order counts in the low single digits are noise, not popularity — see
   *  hasReliablePopularity in MenuShell. */
  showRankBadge?: boolean;
}

export const ProductCardFeatured = memo(function ProductCardFeatured({
  product,
  restaurantId,
  onSelect,
  onQuickAdd,
  fmtPrice,
  customizeLabel,
  soldOutLabel,
  locale = 'es',
  defaultLocale = 'es',
  priority = false,
  showRankBadge = true,
}: ProductCardFeaturedProps) {
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

  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const displayName = tName(product, locale, defaultLocale);
  const showImage = product.image_url && !imgError;

  const isFav = useFavoritesStore((s) => s.isFav(restaurantId, product.id));
  const toggleFav = useFavoritesStore((s) => s.toggle);

  const cartQty = useCartStore((s) =>
    s.items.reduce((sum, i) => (i.product.id === product.id ? sum + i.qty : sum), 0),
  );

  const haptic = () => { try { navigator?.vibrate?.([25, 15, 10]); } catch {} };

  const handleCardClick = useCallback(() => {
    if (outOfStock) return;
    onSelect(product);
  }, [outOfStock, onSelect, product]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (outOfStock) return;
    if (hasModifiers) {
      onSelect(product);
      return;
    }
    haptic();
    onQuickAdd(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('menu:cart-fly', {
      detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    }));
  }, [outOfStock, hasModifiers, onSelect, onQuickAdd, product]);

  const rank = product.popularity_rank;
  const orders7d = product.orders_last_7d ?? 0;

  return (
    <article
      onClick={outOfStock ? undefined : handleCardClick}
      className={cn(
        'relative flex flex-col flex-shrink-0 w-[248px] snap-start bg-white rounded-[20px] overflow-hidden',
        'shadow-[0_4px_20px_rgba(20,15,10,0.10)] border border-gray-100 transition-all duration-150',
        outOfStock ? 'opacity-60' : 'cursor-pointer active:scale-[0.98]',
      )}
    >
      {/* 16:9 image — the editorial ratio. The square grid card crops food tight;
          this one lets the plate breathe. */}
      <div className="relative w-full aspect-[16/9] bg-gray-100 flex-shrink-0 overflow-hidden">
        {showImage ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 skeleton" />}
            <Image
              src={product.image_url}
              alt={displayName}
              fill
              sizes="248px"
              priority={priority}
              loading={priority ? undefined : 'lazy'}
              loader={product.image_url.includes('.supabase.co/storage/') ? supabaseLoader : undefined}
              placeholder={getBlurUrl(product.image_url) ? 'blur' : undefined}
              blurDataURL={getBlurUrl(product.image_url)}
              className={cn(
                'object-cover transition-opacity duration-150',
                imgLoaded ? 'opacity-100' : 'opacity-0',
                outOfStock && 'grayscale',
              )}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <UtensilsCrossed className="w-10 h-10 text-gray-300" aria-hidden="true" />
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-bold">
              {labelSoldOut}
            </span>
          </div>
        )}

        {!outOfStock && showRankBadge && (() => {
          if (rank === 1) return (
            <span className="absolute top-2.5 left-2.5 text-[10px] font-bold text-white px-2.5 py-1 rounded-full leading-none bg-gradient-to-r from-amber-500 to-yellow-400 shadow-md">
              ⭐ {t.popularityTop1}
            </span>
          );
          if (rank != null && rank <= 3) return (
            <span className="absolute top-2.5 left-2.5 text-[10px] font-bold text-white px-2.5 py-1 rounded-full leading-none bg-gradient-to-r from-red-500 to-orange-400 shadow-md">
              🔥 Top {rank}
            </span>
          );
          if (orders7d >= 10) return (
            <span className="absolute top-2.5 left-2.5 text-[10px] font-bold text-white px-2.5 py-1 rounded-full leading-none bg-gradient-to-r from-red-500 to-orange-400 shadow-md">
              🔥 {t.popularityOrders(orders7d)}
            </span>
          );
          return null;
        })()}

        {!outOfStock && showDineInOnly && (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-950 bg-amber-100/95 border border-amber-300 px-2 py-0.5 rounded-full leading-none shadow-sm backdrop-blur-sm">
            <span aria-hidden>🍷</span>
            {t.dineInOnlyBadge}
          </span>
        )}

        {!outOfStock && cartQty > 0 && (
          <span className="absolute bottom-2.5 left-2.5 min-w-[24px] h-[24px] px-1.5 rounded-full bg-[#05c8a7] text-white text-xs font-extrabold flex items-center justify-center shadow-md tabular-nums leading-none">
            {cartQty}
          </span>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); haptic(); toggleFav(restaurantId, product.id); }}
          className="absolute top-0.5 right-0.5 w-11 h-11 flex items-center justify-center z-10"
          aria-label={isFav ? t.removeFromFavorites : t.addToFavorites}
          aria-pressed={isFav}
        >
          <span className="w-7 h-7 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center shadow-sm">
            <Heart className={cn('w-3.5 h-3.5 transition-colors', isFav ? 'fill-red-500 text-red-500' : 'text-gray-400')} />
          </span>
        </button>

        {/* Add button straddles the image edge — the Uber Eats move. Keeps the
            text block clean and gives the CTA a fixed, predictable position. */}
        {!outOfStock && (
          <button
            onClick={handleAddClick}
            aria-label={justAdded ? t.addedToCart : (hasModifiers ? t.ariaCustomize(displayName) : t.ariaAdd(displayName))}
            className="absolute -bottom-5 right-2.5 w-11 h-11 flex items-center justify-center z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#05c8a7]"
          >
            <span
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 pointer-events-none',
                'shadow-[0_3px_10px_rgba(5,200,167,0.35)] ring-2 ring-white',
                justAdded ? 'bg-[#05c8a7] text-white' : 'bg-[#05c8a7] text-white',
              )}
            >
              {justAdded ? <Check className="w-[18px] h-[18px]" aria-hidden="true" /> : <Plus className="w-[18px] h-[18px]" aria-hidden="true" />}
            </span>
          </button>
        )}
        {outOfStock && (
          <div className="absolute -bottom-5 right-2.5 w-10 h-10 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center">
            <Ban className="w-4 h-4 text-gray-300" />
          </div>
        )}
      </div>

      {/* pr-14 reserves the lane the floating add button occupies */}
      <div className="p-3 pt-4 pr-14 flex flex-col flex-1">
        <h3 className={cn('font-bold text-[15px] line-clamp-1 leading-snug', outOfStock ? 'text-gray-400' : 'text-gray-950')}>
          {displayName}
        </h3>
        {product.description && !outOfStock && (
          <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-snug min-h-[2rem]">
            {product.description}
          </p>
        )}
        <div className="flex items-baseline gap-1.5 mt-2">
          {hasModifiers && !outOfStock && (
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide leading-none">
              {t.fromPrice}
            </span>
          )}
          <span className={cn('text-[17px] font-black tabular-nums leading-none', outOfStock ? 'text-gray-300 line-through' : 'text-gray-950')}>
            {fmtPrice(Number(product.price))}
          </span>
          {!outOfStock && product.compare_at_price != null && Number(product.compare_at_price) > Number(product.price) && (
            <span className="text-[11px] text-gray-400 line-through tabular-nums leading-none">
              {fmtPrice(Number(product.compare_at_price))}
            </span>
          )}
        </div>
      </div>
    </article>
  );
});
