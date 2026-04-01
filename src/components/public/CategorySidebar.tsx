'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Category, Product } from '@/types';
import { tName } from '@/lib/i18n';
import { Clock } from 'lucide-react';

interface CategorySidebarProps {
  categories: Category[];
  products: Product[];
  activeCategory: string | null;
  onSelect: (catId: string | null) => void;
  allLabel?: string;
  locale?: string;
  defaultLocale?: string;
  sectionProgress?: Record<string, number>;
}

function isCategoryAvailableNow(cat: Category): boolean {
  if (!cat.available_from || !cat.available_to) return true;
  const now = new Date();
  const [fromH, fromM] = cat.available_from.split(':').map(Number);
  const [toH, toM] = cat.available_to.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= fromH * 60 + fromM && nowMins <= toH * 60 + toM;
}

export const CategorySidebar = memo(function CategorySidebar({
  categories,
  products,
  activeCategory,
  onSelect,
  locale = 'es',
  defaultLocale = 'es',
  sectionProgress = {},
}: CategorySidebarProps) {
  return (
    <nav className="py-5 pr-3 font-sidebar">
      <div className="space-y-0.5">
        {categories.map((cat) => {
          const count = products.filter((p) => p.category_id === cat.id).length;
          if (count === 0) return null;
          const isActive = activeCategory === cat.id;
          const available = isCategoryAvailableNow(cat);
          const hasSchedule = !!(cat.available_from && cat.available_to);

          return (
            <button
              key={cat.id}
              data-sidebar-cat={cat.id}
              onClick={() => available ? onSelect(cat.id) : undefined}
              disabled={!available}
              className={cn(
                'w-full flex items-start gap-2 px-4 py-2.5 rounded-xl text-[15px] transition-colors duration-150 relative',
                available
                  ? isActive
                    ? 'text-emerald-700 font-semibold'
                    : 'text-gray-600 font-medium hover:text-gray-900'
                  : 'text-gray-300 font-medium cursor-not-allowed'
              )}
            >
              {isActive && available && (
                <>
                  <motion.span
                    layoutId="sidebar-pill"
                    className="absolute inset-0 rounded-xl bg-emerald-50"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                  <motion.span
                    layoutId="sidebar-bar"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-500"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                </>
              )}
              {/* Scroll progress micro-bar */}
              {available && (sectionProgress[cat.id] ?? 0) > 0 && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gray-100 overflow-hidden">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full bg-emerald-400"
                    style={{ width: `${Math.round((sectionProgress[cat.id] ?? 0) * 100)}%` }}
                    layoutId={undefined}
                  />
                </span>
              )}
              <div className="flex-1 text-left min-w-0 relative z-10">
                <span className="truncate block">{tName(cat, locale, defaultLocale)}</span>
                {hasSchedule && !available && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {cat.available_from} – {cat.available_to}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-xs tabular-nums flex-shrink-0 mt-0.5 relative z-10',
                available
                  ? isActive ? 'text-emerald-500' : 'text-gray-300'
                  : 'text-gray-200'
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
