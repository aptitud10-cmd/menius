'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { Category, Product } from '@/types';
import { tName } from '@/lib/i18n';

interface CategorySidebarProps {
  categories: Category[];
  products: Product[];
  activeCategory: string | null;
  onSelect: (catId: string | null) => void;
  allLabel?: string;
  locale?: string;
  defaultLocale?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  desayunos: '🍳', breakfast: '🍳',
  almuerzos: '🥘', lunch: '🥘',
  cenas: '🍽️', dinner: '🍽️',
  aperitivos: '🥗', appetizer: '🥗', entradas: '🥗',
  bebidas: '🥤', beverage: '🥤',
  licores: '🍷', drinks: '🍷',
  tortas: '🍰', desserts: '🍰', postres: '🍰',
  platos: '🍖',
};

function getCategoryIcon(name: string): string {
  const key = name.toLowerCase().split(' ')[0];
  return CATEGORY_ICONS[key] ?? '📋';
}

export const CategorySidebar = memo(function CategorySidebar({
  categories,
  products,
  activeCategory,
  onSelect,
  allLabel,
  locale = 'es',
  defaultLocale = 'es',
}: CategorySidebarProps) {
  return (
    <nav className="py-5 pr-3">
      <p className="px-3 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Menú</p>

      <div className="space-y-0.5">
        {categories.map((cat) => {
          const count = products.filter((p) => p.category_id === cat.id).length;
          if (count === 0) return null;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 relative',
                isActive
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-500" />
              )}
              <span className="text-base">{getCategoryIcon(cat.name)}</span>
              <span className="truncate flex-1 text-left">{tName(cat, locale, defaultLocale)}</span>
              <span className={cn(
                'text-xs tabular-nums flex-shrink-0',
                isActive ? 'text-emerald-500' : 'text-gray-300'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 px-3">
        <div className="h-px bg-gray-100" />
      </div>
    </nav>
  );
});
