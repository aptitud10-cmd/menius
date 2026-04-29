'use client';

import { memo, useState, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Check, UtensilsCrossed, ChevronRight, Heart, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { DIETARY_TAGS } from '@/lib/dietary-tags';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useCartStore } from '@/store/cartStore';
import { tName } from '@/lib/i18n';
import { getBlurUrl, supabaseLoader } from '@/lib/image-loader';
import { getTranslations } from '@/lib/translations';
import type { ProductCardProps } from './ProductCard';

export const ProductCardMobile = memo(function ProductCardMobile({
  product,
  restaurantId,
  onSelect,
  onQuickAdd,
  fmtPrice,
  customizeLabel,
  soldOutLabel,
  addedShortLabel,
  locale = 'es',
  defaultLocale = 'es',
  priority = false,
}: ProductCardProps) {
  const t = getTranslations(locale);
  const labelSoldOut = soldOutLabel ?? t.soldOut;
  const labelAdded = addedShortLabel ?? t.addedToCart;

  const hasVariants = (product.variants?.length ?? 0) > 0;
  const hasExtras = (product.extras?.length ?? 0) > 0;
  const hasModifierGroups = (product.modifier_groups?.length ?? 0) > 0;
  // has_modifiers is set server-side when products are slimmed; fall back to array checks
  const hasModifiers = product.has_modifiers ?? (hasVariants || hasExtras || hasModifierGroups);
  const outOfStock = product.in_stock === false;

  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const displayName = tName(product, locale, defaultLocale);
  const showImage = product.image_url && !imgError;
  const imgAlt = displayName;

  const isFav = useFavoritesStore((s) => s.isFav(restaurantId, product.id));
  const toggleFav = useFavoritesStore((s) => s.toggle);

  const cartQty = useCartStore((s) =>
    s.items.reduce((sum, i) => i.product.id === product.id ? sum + i.qty : sum, 0)
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
    } else {
      haptic();
      onQuickAdd(product);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1200);
    }
  }, [outOfStock, hasModifiers, onSelect, onQuickAdd, product]);

  return (
    <article
      onClick={outOfStock ? undefined : handleCardClick}
      className={cn(
        'relative flex flex-col bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(20,15,10,0.07)] overflow-hidden transition-all duration-150',
        outOfStock ? 'opacity-60' : 'cursor-pointer active:opacity-80'
      )}
    >

      {/* Image */}
      <div className="relative w-full aspect-square bg-gray-100 flex-shrink-0 overflow-hidden">

        {showImage ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 skeleton" />}
            <Image
              src={product.image_url}
              alt={imgAlt}
              fill
              sizes="(max-width: 640px) 46vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              loader={product.image_url.includes('.supabase.co/storage/') ? supabaseLoader : undefined}
              placeholder={getBlurUrl(product.image_url) ? 'blur' : undefined}
              blurDataURL={getBlurUrl(product.image_url)}
              className={cn('object-cover transition-opacity duration-150', imgLoaded ? 'opacity-100' : 'opacity-0', outOfStock && 'grayscale')}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <UtensilsCrossed className="w-8 h-8 text-gray-200" aria-hidden="true" />
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-bold">
              {labelSoldOut}
            </span>
          </div>
        )}
        {!outOfStock && (() => {
          const rank = product.popularity_rank;
          const orders7d = product.orders_last_7d ?? 0;
          if (rank === 1) return <span className="absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full leading-none bg-gradient-to-r from-amber-500 to-yellow-400 shadow-sm">⭐ #1 esta semana</span>;
          if (rank != null && rank <= 3) return <span className="absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full leading-none bg-gradient-to-r from-red-500 to-orange-400 shadow-sm">🔥 Top {rank}</span>;
          if (orders7d >= 10) return <span className="absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full leading-none bg-gradient-to-r from-red-500 to-orange-400 shadow-sm">🔥 {orders7d} pedidos</span>;
          if (product.is_new) return <span className="absolute top-2 left-2 text-[10px] font-bold text-white bg-blue-500 px-2 py-0.5 rounded-full leading-none shadow-sm">{t.productNew}</span>;
          return null;
        })()}

        {!outOfStock && cartQty > 0 && (
          <span className="absolute bottom-2 left-2 min-w-[24px] h-[24px] px-1.5 rounded-full bg-[#05c8a7] text-white text-xs font-extrabold flex items-center justify-center shadow-md tabular-nums leading-none">
            {cartQty}
          </span>
        )}

        {/* 44px touch target wrapping the visible 28px circle */}
        <button
          onClick={(e) => { e.stopPropagation(); haptic(); toggleFav(restaurantId, product.id); }}
          className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center z-10"
          aria-label={isFav ? t.removeFromFavorites : t.addToFavorites}
          aria-pressed={isFav}
        >
          <span className="w-7 h-7 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center shadow-sm">
            <Heart className={cn('w-3.5 h-3.5 transition-colors', isFav ? 'fill-red-500 text-red-500' : 'text-gray-400')} />
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className={cn('font-bold text-[15px] line-clamp-2 leading-snug', outOfStock ? 'text-gray-400' : 'text-gray-950')}>
          {displayName}
        </h3>
        {product.description && !outOfStock && (
          <p className="text-xs text-gray-600 line-clamp-1 mt-0.5 leading-snug">
            {product.description}
          </p>
        )}
        {hasModifiers && !outOfStock && (
          <span className="inline-flex items-center gap-0.5 text-xs text-[#05c8a7] font-medium mt-1">
            {customizeLabel}
            <ChevronRight className="w-3 h-3" />
          </span>
        )}
        {(product.dietary_tags?.length ?? 0) > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {product.dietary_tags!.slice(0, 3).map((tagId) => {
              const tag = DIETARY_TAGS.find((t) => t.id === tagId);
              if (!tag) return null;
              return <span key={tagId} className="text-sm" aria-hidden="true">{tag.emoji}</span>;
            })}
          </div>
        )}
        <div className="flex items-center justify-between mt-auto pt-2.5">
          <span className={cn('text-[17px] font-black tabular-nums leading-none', outOfStock ? 'text-gray-300 line-through' : 'text-gray-950')}>
            {fmtPrice(Number(product.price))}
          </span>
          {outOfStock ? (
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Ban className="w-4 h-4 text-gray-300" />
            </div>
          ) : (
            /* 44px touch target wrapping the visible 36px circle */
            <button
              onClick={handleAddClick}
              aria-label={justAdded ? t.addedToCart : (hasModifiers ? t.ariaCustomize(displayName) : t.ariaAdd(displayName))}
              className="relative z-10 w-11 h-11 flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#05c8a7]"
            >
              <span className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 shadow-md pointer-events-none',
                justAdded ? 'bg-[#05c8a7] text-white scale-110' : 'bg-[#05c8a7] text-white hover:bg-[#04b096]'
              )}>
                {justAdded ? <Check className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
});
