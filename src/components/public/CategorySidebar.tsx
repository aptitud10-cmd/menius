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
  /** Open right now, in the restaurant's zone (MenuShell owns the clock). */
  isAvailable?: (cat: Category) => boolean;
  /** "6–11 AM" for a category with hours, null otherwise. */
  hoursLabel?: (cat: Category) => string | null;
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
  isAvailable,
  hoursLabel,
}: CategorySidebarProps) {
  return (
    <nav className="py-5 px-3 font-sidebar">
      <div className="space-y-0.5">
        {categories.map((cat) => {
          const count = countFor
            ? countFor(cat)
            : products.filter((p) => p.category_id === cat.id).length;
          if (count === 0) return null;
          const isActive = activeCategory === cat.id;
          const available = isAvailable ? isAvailable(cat) : true;
          const hours = hoursLabel ? hoursLabel(cat) : null;
          const hasSchedule = !!hours;

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
                    ? 'text-white font-semibold'
                    : 'text-ink-700 font-medium hover:text-ink-950 hover:bg-ink-50'
                  : 'text-ink-300 font-medium cursor-not-allowed'
              )}
            >
              {isActive && available && (
                <>
                  <motion.span
                    layoutId="sidebar-pill"
                    className="absolute inset-0 rounded-xl bg-ink-950"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                </>
              )}
              <div className="flex-1 text-left min-w-0 relative z-10">
                <span className="truncate block">{tName(cat, locale, defaultLocale)}</span>
                {hasSchedule && !available && (
                  <span className="flex items-center gap-1 text-[13px] text-ink-600 mt-0.5">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {hours}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[13px] tabular-nums shrink-0 mt-0.5 relative z-10',
                available
                  ? isActive ? 'text-white/75' : 'text-ink-600'
                  : 'text-ink-300'
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
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[14px] text-ink-700 font-medium hover:text-ink-950 hover:bg-ink-50 transition-colors text-left"
                  >
                    <span className="truncate flex-1">
                      {tName(sub, locale, defaultLocale)}
                    </span>
                    <span className="text-[13px] tabular-nums text-ink-600 shrink-0">
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
