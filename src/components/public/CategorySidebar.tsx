'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { Category, Product } from '@/types';

interface CategorySidebarProps {
  categories: Category[];
  products: Product[];
  activeCategory: string | null;
  onSelect: (catId: string | null) => void;
  allLabel: string;
}

export const CategorySidebar = memo(function CategorySidebar({
  categories,
  products,
  activeCategory,
  onSelect,
  allLabel,
}: CategorySidebarProps) {
  return (
    <nav className="py-6 pr-4">
      <div className="space-y-0.5">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors duration-150',
            activeCategory === null
              ? 'bg-gray-900 text-white font-semibold'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <span>{allLabel}</span>
          <span className={cn(
            'text-xs tabular-nums',
            activeCategory === null ? 'text-gray-400' : 'text-gray-300'
          )}>
            {products.length}
          </span>
        </button>

        {categories.map((cat) => {
          const count = products.filter((p) => p.category_id === cat.id).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors duration-150',
                activeCategory === cat.id
                  ? 'bg-gray-900 text-white font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <span className="truncate">{cat.name}</span>
              <span className={cn(
                'text-xs tabular-nums flex-shrink-0 ml-2',
                activeCategory === cat.id ? 'text-gray-400' : 'text-gray-300'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});
