'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { Plus, Flame, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

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
  const hasModifiers = hasVariants || hasExtras;
  const [imgError, setImgError] = useState(false);

  const handleClick = () => {
    if (hasModifiers) {
      onSelect(product);
    } else {
      onQuickAdd(product);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick();
  };

  const showImage = product.image_url && !imgError;

  return (
    <>
      {/* ── Mobile: horizontal compact card ── */}
      <div
        onClick={handleClick}
        className="lg:hidden flex gap-3 p-3 bg-white rounded-xl border border-gray-100 cursor-pointer active:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              {product.is_featured && (
                <Flame className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
              )}
              <h3 className="font-semibold text-[15px] text-gray-900 line-clamp-1 leading-tight">
                {product.name}
              </h3>
            </div>
            {product.description && (
              <p className="text-[13px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">{product.description}</p>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[15px] font-bold text-gray-900 tabular-nums">
              {fmtPrice(Number(product.price))}
            </span>
            <button
              onClick={handleAddClick}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white active:scale-90 transition-transform"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showImage ? (
          <div className="relative w-[88px] h-[88px] rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="88px"
              className="object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-[88px] h-[88px] rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed className="w-6 h-6 text-gray-200" />
          </div>
        )}
      </div>

      {/* ── Desktop: vertical card with large image ── */}
      <div
        onClick={handleClick}
        className="hidden lg:block group relative bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md hover:border-gray-200 transition-all duration-200"
      >
        {showImage ? (
          <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 1280px) 33vw, 300px"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgError(true)}
            />
            {product.is_featured && (
              <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-sm">
                <Flame className="w-3 h-3" /> {popularLabel}
              </span>
            )}
          </div>
        ) : (
          <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <UtensilsCrossed className="w-10 h-10 text-gray-200" />
            {product.is_featured && (
              <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                <Flame className="w-3 h-3" /> {popularLabel}
              </span>
            )}
          </div>
        )}

        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm text-gray-900 line-clamp-1 leading-snug">
              {product.name}
            </h3>
            <span className="text-sm font-bold text-gray-900 flex-shrink-0 tabular-nums">
              {fmtPrice(Number(product.price))}
            </span>
          </div>

          {product.description && (
            <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">{product.description}</p>
          )}

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50">
            {hasModifiers ? (
              <span className="text-xs text-gray-400">{customizeLabel}</span>
            ) : (
              <span />
            )}
            <button
              onClick={handleAddClick}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 active:scale-95 transition-all duration-150"
            >
              <Plus className="w-3.5 h-3.5" />
              {addLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
});
