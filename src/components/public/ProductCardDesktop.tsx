'use client';

import { memo, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Plus, Check, UtensilsCrossed, ChevronRight, Heart, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { DIETARY_TAGS } from '@/lib/dietary-tags';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useCartStore } from '@/store/cartStore';
import { tName, tDesc } from '@/lib/i18n';
import { getBlurUrl } from '@/lib/image-loader';
import type { ProductCardProps } from './ProductCard';

export const ProductCardDesktop = memo(function ProductCardDesktop({
  product,
  onSelect,
  onQuickAdd,
  fmtPrice,
  addLabel,
  customizeLabel,
  popularLabel,
  soldOutLabel,
  unavailableLabel,
  addedShortLabel,
  locale = 'es',
  defaultLocale = 'es',
  priority = false,
}: ProductCardProps) {
  const isEn = locale === 'en';
  const labelSoldOut = soldOutLabel ?? (isEn ? 'Sold out' : 'Agotado');
  const labelUnavailable = unavailableLabel ?? (isEn ? 'Unavailable' : 'No disponible');
  const labelAdded = addedShortLabel ?? (isEn ? 'Added' : 'Listo');

  const hasVariants = (product.variants?.length ?? 0) > 0;
  const hasExtras = (product.extras?.length ?? 0) > 0;
  const hasModifierGroups = (product.modifier_groups?.length ?? 0) > 0;
  const hasModifiers = hasVariants || hasExtras || hasModifierGroups;
  const outOfStock = product.in_stock === false;

  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const displayName = tName(product, locale, defaultLocale);
  const displayDesc = tDesc(product, locale, defaultLocale);
  const imgAlt = displayDesc ? `${displayName} - ${displayDesc.slice(0, 80)}` : displayName;
  const showImage = product.image_url && !imgError;

  const isFav = useFavoritesStore((s) => s.ids.includes(product.id));
  const toggleFav = useFavoritesStore((s) => s.toggle);

  const cartItems = useCartStore((s) => s.items);
  const cartQty = cartItems
    .filter((i) => i.product.id === product.id)
    .reduce((s, i) => s + i.qty, 0);

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
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      window.dispatchEvent(new CustomEvent('menu:cart-fly', {
        detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      }));
    }
  }, [outOfStock, hasModifiers, onSelect, onQuickAdd, product]);

  return (
    <article
      onClick={outOfStock ? undefined : handleCardClick}
      className={cn(
        'group relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-[transform,box-shadow] duration-300 ease-out will-change-transform',
        outOfStock
          ? 'opacity-75'
          : 'cursor-pointer hover:shadow-[0_12px_40px_rgba(0,0,0,0.14)] hover:-translate-y-1 active:scale-[0.98]'
      )}
    >
      {showImage ? (
        <div className="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden">
          {!imgLoaded && <div className="absolute inset-0 bg-gray-100 animate-pulse" />}
          <Image
            src={product.image_url}
            alt={imgAlt}
            fill
            sizes="(max-width: 1280px) 50vw, 33vw"
            priority={priority}
            unoptimized={product.image_url.includes('.supabase.co/storage/')}
            placeholder={getBlurUrl(product.image_url) ? 'blur' : undefined}
            blurDataURL={getBlurUrl(product.image_url)}
            className={cn(
              'object-cover transition-[transform,opacity] duration-500',
              imgLoaded ? 'opacity-100' : 'opacity-0',
              outOfStock ? 'grayscale' : 'group-hover:scale-105'
            )}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
          {!outOfStock && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          )}
          {outOfStock && (
            <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
              <span className="px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-bold">{labelSoldOut}</span>
            </div>
          )}
          {!outOfStock && product.is_featured && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-sm" aria-hidden="true">
              🔥 {popularLabel}
            </span>
          )}
          {!outOfStock && !product.is_featured && product.is_new && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500 text-white text-[10px] font-bold shadow-sm">
              {locale === 'es' ? 'NUEVO' : 'NEW'}
            </span>
          )}
          {!outOfStock && cartQty > 0 && (
            <motion.span
              key={cartQty}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute bottom-3 left-3 min-w-[24px] h-6 px-2 rounded-full bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center shadow-md tabular-nums leading-none"
            >
              {cartQty}
            </motion.span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); haptic(); toggleFav(product.id); }}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
            aria-label={isFav ? (isEn ? 'Remove from favorites' : 'Quitar de favoritos') : (isEn ? 'Add to favorites' : 'Agregar a favoritos')}
            aria-pressed={isFav}
          >
            <Heart className={cn('w-4 h-4 transition-colors', isFav ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover:text-gray-500')} />
          </button>
        </div>
      ) : (
        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
          <UtensilsCrossed className="w-10 h-10 text-gray-200 transition-transform duration-500 group-hover:scale-110" aria-hidden="true" />
          {outOfStock && (
            <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
              <span className="px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-bold">{labelSoldOut}</span>
            </div>
          )}
          {!outOfStock && product.is_featured && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold" aria-hidden="true">
              🔥 {popularLabel}
            </span>
          )}
          {!outOfStock && !product.is_featured && product.is_new && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500 text-white text-[10px] font-bold">
              {locale === 'es' ? 'NUEVO' : 'NEW'}
            </span>
          )}
          {!outOfStock && cartQty > 0 && (
            <motion.span
              key={cartQty}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute bottom-3 left-3 min-w-[24px] h-6 px-2 rounded-full bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center shadow-md tabular-nums leading-none"
            >
              {cartQty}
            </motion.span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); haptic(); toggleFav(product.id); }}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
            aria-label={isFav ? (isEn ? 'Remove from favorites' : 'Quitar de favoritos') : (isEn ? 'Add to favorites' : 'Agregar a favoritos')}
            aria-pressed={isFav}
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
                  <span aria-hidden="true">{tag.emoji}</span>
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
                <Ban className="w-3 h-3" /> {labelSoldOut}
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
              {labelUnavailable}
            </span>
          ) : (
            <button
              onClick={handleAddClick}
              aria-label={justAdded ? (isEn ? 'Added to cart' : 'Agregado al carrito') : (hasModifiers ? (isEn ? `Customize ${displayName}` : `Personalizar ${displayName}`) : (isEn ? `Add ${displayName}` : `Agregar ${displayName}`))}
              className={cn(
                'relative z-10 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-emerald-500',
                justAdded
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 scale-105'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-md'
              )}
            >
              {justAdded ? (
                <><Check className="w-3.5 h-3.5" aria-hidden="true" /> {labelAdded}</>
              ) : (
                <><Plus className="w-3.5 h-3.5" aria-hidden="true" /> {addLabel}</>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
});
