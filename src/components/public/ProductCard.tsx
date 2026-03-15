'use client';

import { memo, useState, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Check, Minus, UtensilsCrossed, ChevronRight, Heart, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { DIETARY_TAGS } from '@/lib/dietary-tags';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useCartStore } from '@/store/cartStore';
import { tName, tDesc } from '@/lib/i18n';
import { supabaseLoader, getBlurUrl } from '@/lib/image-loader';

interface ProductCardProps {
  product: Product;
  onSelect: (p: Product) => void;
  onQuickAdd: (p: Product) => void;
  fmtPrice: (n: number) => string;
  addLabel: string;
  customizeLabel: string;
  popularLabel: string;
  locale?: string;
  defaultLocale?: string;
}

export const ProductCard = memo(function ProductCard({
  product,
  onSelect,
  onQuickAdd,
  fmtPrice,
  addLabel,
  customizeLabel,
  popularLabel,
  locale = 'es',
  defaultLocale = 'es',
}: ProductCardProps) {
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const hasExtras = (product.extras?.length ?? 0) > 0;
  const hasModifierGroups = (product.modifier_groups?.length ?? 0) > 0;
  const hasModifiers = hasVariants || hasExtras || hasModifierGroups;
  const outOfStock = product.in_stock === false;
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const displayName = tName(product, locale, defaultLocale);
  const displayDesc = tDesc(product, locale, defaultLocale);
  const imgAlt = displayDesc ? `${displayName} - ${displayDesc.slice(0, 80)}` : displayName;
  const [justAdded, setJustAdded] = useState(false);
  const isFav = useFavoritesStore((s) => s.ids.includes(product.id));
  const toggleFav = useFavoritesStore((s) => s.toggle);

  // Cart quantity tracking for inline stepper (no-modifier products only)
  const cartItems = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const cartQty = !hasModifiers
    ? cartItems.filter((i) => i.product.id === product.id).reduce((s, i) => s + i.qty, 0)
    : 0;
  const cartIndex = !hasModifiers
    ? cartItems.findIndex((i) => i.product.id === product.id)
    : -1;

  const haptic = () => { try { navigator?.vibrate?.([25, 15, 10]); } catch {} };

  const handleClick = () => {
    if (outOfStock) return;
    if (hasModifiers) {
      onSelect(product);
    } else {
      haptic();
      onQuickAdd(product);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1200);
    }
  };

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick();
  }, [handleClick]);

  const handleDecrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    haptic();
    if (cartIndex >= 0) updateQty(cartIndex, cartQty - 1);
  }, [cartIndex, cartQty, updateQty]);

  const handleIncrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    haptic();
    if (cartIndex >= 0) {
      updateQty(cartIndex, cartQty + 1);
    } else {
      onQuickAdd(product);
    }
  }, [cartIndex, cartQty, updateQty, onQuickAdd, product]);

  const showImage = product.image_url && !imgError;

  return (
    <>
      {/* ── Mobile: vertical 2-column card (Uber Eats style) ── */}
      <div
        onClick={handleClick}
        className={cn(
          'lg:hidden flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all duration-150',
          outOfStock ? 'opacity-70 cursor-default' : 'cursor-pointer active:scale-[0.97]'
        )}
      >
        {/* Image */}
        <div className="relative w-full aspect-[4/3] bg-gray-100 flex-shrink-0 overflow-hidden">
          {showImage ? (
            <>
              {!imgLoaded && <div className="absolute inset-0 bg-gray-100 animate-pulse" />}
              <Image
                src={product.image_url}
                alt={imgAlt}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                loader={product.image_url.includes('.supabase.co/storage/') ? supabaseLoader : undefined}
                placeholder={getBlurUrl(product.image_url) ? 'blur' : undefined}
                blurDataURL={getBlurUrl(product.image_url)}
                className={cn('object-cover transition-opacity duration-300', imgLoaded ? 'opacity-100' : 'opacity-0', outOfStock && 'grayscale')}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <UtensilsCrossed className="w-7 h-7 text-gray-200" />
            </div>
          )}

          {outOfStock && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
              <span className="px-2 py-1 rounded-full bg-black/60 text-white text-[10px] font-bold">
                {locale === 'en' ? 'Sold out' : 'Agotado'}
              </span>
            </div>
          )}
          {!outOfStock && product.is_featured && (
            <span className="absolute top-2 left-2 text-sm leading-none">🔥</span>
          )}
          {!outOfStock && product.is_new && (
            <span className="absolute top-2 left-2 text-[10px] font-bold text-white bg-blue-500 px-1.5 py-0.5 rounded-full leading-none">NEW</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); haptic(); toggleFav(product.id); }}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm"
            aria-label="Favorite"
          >
            <Heart className={cn('w-3.5 h-3.5 transition-colors', isFav ? 'fill-red-500 text-red-500' : 'text-gray-400')} />
          </button>
        </div>

        {/* Content */}
        <div className="p-2.5 flex flex-col flex-1">
          <h3 className={cn('font-bold text-[13px] line-clamp-2 leading-tight', outOfStock ? 'text-gray-400' : 'text-gray-900')}>
            {displayName}
          </h3>
          {hasModifiers && !outOfStock && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium mt-0.5">
              {customizeLabel}
              <ChevronRight className="w-2.5 h-2.5" />
            </span>
          )}
          {(product.dietary_tags?.length ?? 0) > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {product.dietary_tags!.slice(0, 3).map((tagId) => {
                const tag = DIETARY_TAGS.find((t) => t.id === tagId);
                if (!tag) return null;
                return <span key={tagId} className="text-[11px]">{tag.emoji}</span>;
              })}
            </div>
          )}
          <div className="flex items-center justify-between mt-auto pt-2">
            <span className={cn('text-[13px] font-extrabold tabular-nums leading-none', outOfStock ? 'text-gray-300 line-through' : 'text-gray-900')}>
              {fmtPrice(Number(product.price))}
            </span>
            {outOfStock ? (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Ban className="w-3.5 h-3.5 text-gray-300" />
              </div>
            ) : !hasModifiers && cartQty > 0 ? (
              /* Inline stepper: [-] N [+] */
              <div className="flex items-center gap-0 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={handleDecrement}
                  className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center text-[13px] font-extrabold tabular-nums text-emerald-600">
                  {cartQty}
                </span>
                <button
                  onClick={handleIncrement}
                  className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddClick}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 flex-shrink-0 shadow-sm',
                  justAdded
                    ? 'bg-emerald-600 text-white scale-110'
                    : 'bg-emerald-500 text-white'
                )}
              >
                {justAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Desktop: landscape card (wider than tall) ── */}
      <div
        onClick={handleClick}
        className={cn(
          'hidden lg:block group relative bg-white rounded-2xl border border-gray-100 overflow-hidden transition-[transform,box-shadow] duration-300 ease-out',
          outOfStock
            ? 'opacity-75 cursor-default'
            : 'cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0'
        )}
      >
        {showImage ? (
          <div className="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden">
            {!imgLoaded && (
              <div className="absolute inset-0 bg-gray-100 animate-pulse" />
            )}
            <Image
              src={product.image_url}
              alt={imgAlt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              loader={product.image_url.includes('.supabase.co/storage/') ? supabaseLoader : undefined}
              placeholder={getBlurUrl(product.image_url) ? 'blur' : undefined}
              blurDataURL={getBlurUrl(product.image_url)}
              className={cn('object-cover transition-[transform,opacity] duration-500', imgLoaded ? 'opacity-100' : 'opacity-0', outOfStock && 'grayscale')}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
            {outOfStock && (
              <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
                <span className="px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-bold">{locale === 'en' ? 'Sold out' : 'Agotado'}</span>
              </div>
            )}
            {!outOfStock && product.is_featured && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-sm">
                🔥 {popularLabel}
              </span>
            )}
            {!outOfStock && !product.is_featured && product.is_new && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500 text-white text-[10px] font-bold shadow-sm">
                NEW
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); haptic(); toggleFav(product.id); }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all duration-200"
              aria-label="Favorite"
            >
              <Heart className={cn('w-4 h-4 transition-colors', isFav ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover:text-gray-500')} />
            </button>
          </div>
        ) : (
          <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <UtensilsCrossed className="w-10 h-10 text-gray-200" />
            {outOfStock && (
              <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
                <span className="px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-bold">{locale === 'en' ? 'Sold out' : 'Agotado'}</span>
              </div>
            )}
            {!outOfStock && product.is_featured && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                🔥 {popularLabel}
              </span>
            )}
            {!outOfStock && !product.is_featured && product.is_new && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                NEW
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); haptic(); toggleFav(product.id); }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all duration-200"
              aria-label="Favorite"
            >
              <Heart className={cn('w-4 h-4 transition-colors', isFav ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover:text-gray-500')} />
            </button>
          </div>
        )}

        <div className="p-4 flex flex-col">
          <h3 className={cn('font-bold text-base line-clamp-2 leading-snug', outOfStock ? 'text-gray-400' : 'text-gray-900')}>
            {displayName}
          </h3>

          {displayDesc && (
            <p className="text-sm text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">{displayDesc}</p>
          )}
          {(product.dietary_tags?.length ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {product.dietary_tags!.slice(0, 4).map((tagId) => {
                const tag = DIETARY_TAGS.find((t) => t.id === tagId);
                if (!tag) return null;
                return (
                  <span key={tagId} className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                    <span>{tag.emoji}</span>
                    <span>{locale === 'en' ? tag.labelEn : tag.labelEs}</span>
                  </span>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex flex-col gap-0.5">
              <span className={cn('text-base font-bold tabular-nums', outOfStock ? 'text-gray-300 line-through' : 'text-gray-900')}>
                {fmtPrice(Number(product.price))}
              </span>
              {outOfStock ? (
                <span className="inline-flex items-center gap-1 text-xs text-red-500 font-semibold">
                  <Ban className="w-3 h-3" /> {locale === 'en' ? 'Sold out' : 'Agotado'}
                </span>
              ) : hasModifiers ? (
                <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 font-medium">
                  {customizeLabel}
                  <ChevronRight className="w-3 h-3" />
                </span>
              ) : null}
            </div>
            {outOfStock ? (
              <span className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-400 cursor-default">
                {locale === 'en' ? 'Unavailable' : 'No disponible'}
              </span>
            ) : !hasModifiers && cartQty > 0 ? (
              /* Inline stepper: [-] N [+] */
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={handleDecrement}
                  className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 active:scale-90 transition-all"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-7 text-center text-sm font-extrabold tabular-nums text-emerald-600">
                  {cartQty}
                </span>
                <button
                  onClick={handleIncrement}
                  className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 active:scale-90 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddClick}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95',
                  justAdded
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 scale-105'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-md'
                )}
              >
                {justAdded ? (
                  <><Check className="w-3.5 h-3.5" /> {locale === 'en' ? 'Added' : 'Listo'}</>
                ) : (
                  <><Plus className="w-3.5 h-3.5" /> {addLabel}</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
});
