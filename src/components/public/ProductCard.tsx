'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { Plus, Flame, UtensilsCrossed, Settings2 } from 'lucide-react';
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
    <div
      onClick={handleClick}
      className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md hover:border-gray-200 transition-all duration-200"
    >
      {/* Image — 4:3 aspect */}
      {showImage ? (
        <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 300px"
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
        {/* Name + Price */}
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

        {/* Inline variant pills */}
        {hasVariants && (
          <div className="flex items-center gap-1 mt-2.5 flex-wrap">
            <span className="text-[10px] text-gray-400 mr-0.5">Sizes:</span>
            {product.variants!.slice(0, 4).map((v) => (
              <span key={v.id} className="px-2 py-0.5 rounded-md border border-gray-200 bg-white text-[10px] font-medium text-gray-600 hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                {v.name}
              </span>
            ))}
            {product.variants!.length > 4 && (
              <span className="text-[10px] text-gray-300">+{product.variants!.length - 4}</span>
            )}
          </div>
        )}

        {/* Extras indicator */}
        {hasExtras && !hasVariants && (
          <p className="text-[10px] text-gray-400 mt-2">
            +{product.extras!.length} extras disponibles
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50">
          {hasModifiers ? (
            <button
              onClick={handleAddClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              {customizeLabel}
            </button>
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
  );
});
