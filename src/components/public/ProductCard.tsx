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
  popularLabel: string;
}

export const ProductCard = memo(function ProductCard({
  product,
  onSelect,
  onQuickAdd,
  fmtPrice,
  addLabel,
  popularLabel,
}: ProductCardProps) {
  const hasModifiers = (product.variants?.length ?? 0) > 0 || (product.extras?.length ?? 0) > 0;
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
      className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
    >
      {showImage ? (
        <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 300px"
            className="object-cover"
            onError={() => setImgError(true)}
          />
          {product.is_featured && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/90 text-white text-[10px] font-bold">
              <Flame className="w-3 h-3" /> {popularLabel}
            </span>
          )}
        </div>
      ) : (
        <div className="relative w-full aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <UtensilsCrossed className="w-8 h-8 text-gray-200" />
          {product.is_featured && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/90 text-white text-[10px] font-bold">
              <Flame className="w-3 h-3" /> {popularLabel}
            </span>
          )}
        </div>
      )}

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[15px] text-gray-900 line-clamp-1 leading-snug">
            {product.name}
          </h3>
          <span className="text-sm font-bold text-gray-900 flex-shrink-0 tabular-nums">
            {fmtPrice(Number(product.price))}
          </span>
        </div>
        {product.description && (
          <p className="text-xs text-gray-400 line-clamp-1 mt-1">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-2.5">
          {hasModifiers ? (
            <span className="text-[11px] text-gray-400">
              {product.variants?.length ? `${product.variants.length} opciones` : ''}
              {product.variants?.length && product.extras?.length ? ' · ' : ''}
              {product.extras?.length ? `${product.extras.length} extras` : ''}
            </span>
          ) : (
            <span />
          )}
          <button
            onClick={handleAddClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 active:scale-95 transition-all duration-150"
          >
            <Plus className="w-3 h-3" />
            {addLabel}
          </button>
        </div>
      </div>
    </div>
  );
});
