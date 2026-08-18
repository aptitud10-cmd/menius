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
  /** Overrides the product count. Group entries carry a synthetic id, so the
   *  default count-by-category_id would return 0 and hide them. */
  countFor?: (cat: Category) => number;
  /** Subsections of the currently open group, rendered indented underneath it.
   *  On mobile the same list is reached through a floating button and a sheet;
   *  desktop has a permanent sidebar, so nesting them here is the natural
   *  equivalent — without it a group like Breakfast is 81 products deep with no
   *  way to jump to "French Toast". Empty = nothing to nest. */
  subcategories?: { category: Category; items: unknown[] }[];
  /** Scrolls to a subsection. Distinct from `onSelect`, which switches the
   *  active group filter and would collapse the very list being clicked. */
  onSelectSubcategory?: (catId: string) => void;
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
  countFor,
  subcategories,
  onSelectSubcategory,
}: CategorySidebarProps) {
  return (
    <nav className="py-5 pr-3 font-sidebar">
      <div className="space-y-0.5">
        {categories.map((cat) => {
          const count = countFor
            ? countFor(cat)
            : products.filter((p) => p.category_id === cat.id).length;
          if (count === 0) return null;
          const isActive = activeCategory === cat.id;
          const available = isCategoryAvailableNow(cat);
          const hasSchedule = !!(cat.available_from && cat.available_to);

          const nested =
            isActive && available && subcategories && subcategories.length > 0
              ? subcategories
              : null;

          const entry = (
            <button
              key={cat.id}
              data-sidebar-cat={cat.id}
              onClick={() => available ? onSelect(cat.id) : undefined}
              disabled={!available}
              className={cn(
                'w-full flex items-start gap-2 px-4 py-2.5 rounded-xl text-[15px] transition-colors duration-150 relative',
                available
                  ? isActive
                    ? 'text-[#047a65] font-semibold'
                    : 'text-ink-600 font-medium hover:text-ink-900'
                  : 'text-ink-300 font-medium cursor-not-allowed'
              )}
            >
              {isActive && available && (
                <>
                  <motion.span
                    layoutId="sidebar-pill"
                    className="absolute inset-0 rounded-xl bg-[#e6faf7]"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                  <motion.span
                    layoutId="sidebar-bar"
                    className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-[#05c8a7]"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                </>
              )}
              <div className="flex-1 text-left min-w-0 relative z-10">
                <span className="truncate block">{tName(cat, locale, defaultLocale)}</span>
                {hasSchedule && !available && (
                  <span className="flex items-center gap-1 text-[10px] text-ink-400 mt-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {cat.available_from} – {cat.available_to}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-xs tabular-nums flex-shrink-0 mt-0.5 relative z-10',
                available
                  ? isActive ? 'text-[#05c8a7]' : 'text-ink-300'
                  : 'text-ink-200'
              )}>
                {count}
              </span>
            </button>
          );

          // No wrapper unless something is actually nested: the parent's
          // `space-y-0.5` targets its direct children, so wrapping every entry
          // would silently restyle the sidebar of every restaurant.
          if (!nested) return entry;

          return (
            <div key={cat.id}>
              {entry}
              <div className="mt-0.5 mb-1 ml-4 pl-3 border-l border-ink-200 space-y-px">
                {nested.map(({ category: sub, items }) => (
                  <button
                    key={sub.id}
                    onClick={() => onSelectSubcategory?.(sub.id)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] text-ink-500 font-medium hover:text-ink-900 hover:bg-ink-50 transition-colors text-left"
                  >
                    <span className="truncate flex-1">
                      {tName(sub, locale, defaultLocale)}
                    </span>
                    <span className="text-[11px] tabular-nums text-ink-300 flex-shrink-0">
                      {items.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
});
