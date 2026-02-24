'use client';

import { memo, useState, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Check, UtensilsCrossed, ChevronRight, Heart, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { DIETARY_TAGS } from '@/lib/dietary-tags';
import { useFavoritesStore } from '@/store/favoritesStore';
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

  const displayName = tName(product, locale, defaultLocale);
  const displayDesc = tDesc(product, locale, defaultLocale);
  const [justAdded, setJustAdded] = useState(false);
  const isFav = useFavoritesStore((s) => s.ids.includes(product.id));
  const toggleFav = useFavoritesStore((s) => s.toggle);

  const haptic = () => { try { navigator?.vibrate?.(10); } catch {} };

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

  const showImage = product.image_url && !imgError;

  return (
    <>
      {/* ── Mobile: horizontal compact card ── */}
      <div
        onClick={handleClick}
        className={cn(
          'lg:hidden flex gap-3 p-3 bg-white rounded-2xl border border-gray-100 transition-all duration-150',
          outOfStock ? 'opacity-70 cursor-default' : 'cursor-pointer active:bg-gray-50/80 active:scale-[0.98]'
        )}
      >
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-center gap-1.5">
              {outOfStock && (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full leading-none">Agotado</span>
              )}
              {!outOfStock && product.is_featured && (
                <span className="text-xs">🔥</span>
              )}
              {!outOfStock && product.is_new && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full leading-none">NEW</span>
              )}
              <h3 className={cn('font-semibold text-[15px] line-clamp-1 leading-tight', outOfStock ? 'text-gray-400' : 'text-gray-900')}>
                {displayName}
              </h3>
            </div>
            {displayDesc && (
              <p className="text-[13px] text-gray-500 line-clamp-2 mt-1 leading-snug">{displayDesc}</p>
            )}
            {(product.dietary_tags?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {product.dietary_tags!.slice(0, 3).map((tagId) => {
                  const tag = DIETARY_TAGS.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <span key={tagId} className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-full">
                      {tag.emoji}
                    </span>
                  );
                })}
              </div>
            )}
            {hasModifiers && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 font-medium mt-1.5">
                {customizeLabel}
                <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className={cn('text-[15px] font-bold tabular-nums', outOfStock ? 'text-gray-300 line-through' : 'text-gray-900')}>
              {fmtPrice(Number(product.price))}
            </span>
            {outOfStock ? (
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100">
                <Ban className="w-4 h-4 text-gray-300" />
              </div>
            ) : (
              <button
                onClick={handleAddClick}
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 active:scale-90',
                  justAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500 text-white'
                )}
              >
                {justAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {showImage ? (
          <div className="relative w-[92px] h-[92px] rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="92px"
              loader={product.image_url.includes('.supabase.co/storage/') ? supabaseLoader : undefined}
              placeholder={getBlurUrl(product.image_url) ? 'blur' : undefined}
              blurDataURL={getBlurUrl(product.image_url)}
              className={cn('object-cover', outOfStock && 'grayscale')}
              onError={() => setImgError(true)}
            />
            {outOfStock && (
              <div className="absolute inset-0 bg-white/40" />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); haptic(); toggleFav(product.id); }}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center"
              aria-label="Favorite"
            >
              <Heart className={cn('w-3.5 h-3.5 transition-colors', isFav ? 'fill-red-500 text-red-500' : 'text-gray-400')} />
            </button>
          </div>
        ) : (
          <div className="relative w-[92px] h-[92px] rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed className="w-6 h-6 text-gray-200" />
            <button
              onClick={(e) => { e.stopPropagation(); haptic(); toggleFav(product.id); }}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center"
              aria-label="Favorite"
            >
              <Heart className={cn('w-3.5 h-3.5 transition-colors', isFav ? 'fill-red-500 text-red-500' : 'text-gray-400')} />
            </button>
          </div>
        )}
      </div>

      {/* ── Desktop: landscape card (wider than tall) ── */}
      <div
        onClick={handleClick}
        className={cn(
          'hidden lg:block group relative bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 ease-out',
          outOfStock
            ? 'opacity-75 cursor-default'
            : 'cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:border-gray-200 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0'
        )}
      >
        {showImage ? (
          <div className="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              loader={product.image_url.includes('.supabase.co/storage/') ? supabaseLoader : undefined}
              placeholder={getBlurUrl(product.image_url) ? 'blur' : undefined}
              blurDataURL={getBlurUrl(product.image_url)}
              className={cn('object-cover group-hover:scale-[1.03] transition-transform duration-500', outOfStock && 'grayscale')}
              onError={() => setImgError(true)}
            />
            {outOfStock && (
              <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
                <span className="px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-bold">Agotado</span>
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
                <span className="px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-bold">Agotado</span>
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

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn('font-bold text-base line-clamp-1 leading-snug', outOfStock ? 'text-gray-400' : 'text-gray-900')}>
              {displayName}
            </h3>
            <span className={cn('text-base font-bold flex-shrink-0 tabular-nums', outOfStock ? 'text-gray-300 line-through' : 'text-gray-900')}>
              {fmtPrice(Number(product.price))}
            </span>
          </div>

          {displayDesc && (
            <p className="text-sm text-gray-500 line-clamp-1 mt-1 leading-relaxed">{displayDesc}</p>
          )}
          {(product.dietary_tags?.length ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {product.dietary_tags!.slice(0, 4).map((tagId) => {
                const tag = DIETARY_TAGS.find((t) => t.id === tagId);
                if (!tag) return null;
                return (
                  <span key={tagId} className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                    <span>{tag.emoji}</span>
                    <span>{tag.labelEs}</span>
                  </span>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            {outOfStock ? (
              <span className="inline-flex items-center gap-1 text-xs text-red-500 font-semibold">
                <Ban className="w-3 h-3" /> Agotado
              </span>
            ) : hasModifiers ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                {customizeLabel}
                <ChevronRight className="w-3 h-3" />
              </span>
            ) : (
              <span />
            )}
            {outOfStock ? (
              <span className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-400 cursor-default">
                No disponible
              </span>
            ) : (
              <button
                onClick={handleAddClick}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95',
                  justAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-md'
                )}
              >
                {justAdded ? (
                  <><Check className="w-3.5 h-3.5" /> ✓</>
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
