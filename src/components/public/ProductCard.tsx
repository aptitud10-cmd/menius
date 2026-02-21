'use client';

import { memo, useState, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Check, Flame, UtensilsCrossed, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { DIETARY_TAGS } from '@/lib/dietary-tags';

interface ProductCardProps {
  product: Product;
  onSelect: (p: Product) => void;
  onQuickAdd: (p: Product) => void;
  fmtPrice: (n: number) => string;
  addLabel: string;
  customizeLabel: string;
  popularLabel: string;
}

export const ProductCard = memo(function ProductCard({
  product,
  onSelect,
  onQuickAdd,
  fmtPrice,
  addLabel,
  customizeLabel,
  popularLabel,
}: ProductCardProps) {
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const hasExtras = (product.extras?.length ?? 0) > 0;
  const hasModifierGroups = (product.modifier_groups?.length ?? 0) > 0;
  const hasModifiers = hasVariants || hasExtras || hasModifierGroups;
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const isNew = (() => {
    if (!product.created_at) return false;
    const created = new Date(product.created_at).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return created > sevenDaysAgo;
  })();

  const handleClick = () => {
    if (hasModifiers) {
      onSelect(product);
    } else {
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
        className="lg:hidden flex gap-3 p-3 bg-white rounded-2xl border border-gray-100 cursor-pointer active:bg-gray-50/80 transition-all duration-150"
      >
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-center gap-1.5">
              {product.is_featured && (
                <span className="text-xs">🔥</span>
              )}
              {isNew && !product.is_featured && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full leading-none">NEW</span>
              )}
              <h3 className="font-semibold text-[15px] text-gray-900 line-clamp-1 leading-tight">
                {product.name}
              </h3>
            </div>
            {product.description && (
              <p className="text-[13px] text-gray-500 line-clamp-2 mt-1 leading-snug">{product.description}</p>
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
            <span className="text-[15px] font-bold text-gray-900 tabular-nums">
              {fmtPrice(Number(product.price))}
            </span>
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
          </div>
        </div>

        {showImage ? (
          <div className="relative w-[92px] h-[92px] rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="92px"
              className="object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-[92px] h-[92px] rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed className="w-6 h-6 text-gray-200" />
          </div>
        )}
      </div>

      {/* ── Desktop: landscape card (wider than tall) ── */}
      <div
        onClick={handleClick}
        className="hidden lg:block group relative bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg hover:border-gray-200 transition-all duration-200"
      >
        {showImage ? (
          <div className="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
              onError={() => setImgError(true)}
            />
            {product.is_featured && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-sm">
                🔥 {popularLabel}
              </span>
            )}
            {isNew && !product.is_featured && (
              <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-sm">
                NEW
              </span>
            )}
          </div>
        ) : (
          <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <UtensilsCrossed className="w-10 h-10 text-gray-200" />
            {product.is_featured && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                🔥 {popularLabel}
              </span>
            )}
            {isNew && !product.is_featured && (
              <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                NEW
              </span>
            )}
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base text-gray-900 line-clamp-1 leading-snug">
              {product.name}
            </h3>
            <span className="text-base font-bold text-gray-900 flex-shrink-0 tabular-nums">
              {fmtPrice(Number(product.price))}
            </span>
          </div>

          {product.description && (
            <p className="text-sm text-gray-500 line-clamp-1 mt-1 leading-relaxed">{product.description}</p>
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
            {hasModifiers ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                {customizeLabel}
                <ChevronRight className="w-3 h-3" />
              </span>
            ) : (
              <span />
            )}
            <button
              onClick={handleAddClick}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95',
                justAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              )}
            >
              {justAdded ? (
                <><Check className="w-3.5 h-3.5" /> ✓</>
              ) : (
                <><Plus className="w-3.5 h-3.5" /> {addLabel}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
});
