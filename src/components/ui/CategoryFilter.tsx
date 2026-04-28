'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';

interface Category {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface CategoryFilterProps {
  categories: Category[];
  active: string | null;
  onChange: (id: string | null) => void;
  allLabel?: string;
  allCount?: number;
  hideAll?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function CategoryFilter({
  categories,
  active,
  onChange,
  allLabel = 'All',
  allCount,
  hideAll = false,
  ariaLabel = 'Categories',
  className = '',
}: CategoryFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  // Auto-scroll active pill into view (horizontal-only, never vertical).
  // Skip the initial mount so loading the page doesn't jump the document.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const container = scrollRef.current;
    const btn = activeBtnRef.current;
    if (!container || !btn) return;
    const targetScroll =
      btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2;
    container.scrollTo({ left: targetScroll, behavior: 'smooth' });
  }, [active]);

  // Track scroll position for edge fades
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setShowLeftFade(el.scrollLeft > 4);
      setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [categories.length]);

  return (
    <div className={`relative ${className}`}>
      <div
        className={`pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-[#050505] to-transparent transition-opacity duration-200 ${showLeftFade ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-[#050505] to-transparent transition-opacity duration-200 ${showRightFade ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden
      />

      <nav
        ref={scrollRef}
        aria-label={ariaLabel}
        className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-px-6 px-6 py-3"
      >
        {!hideAll && (
          <PillButton
            ref={active === null ? activeBtnRef : null}
            active={active === null}
            label={allLabel}
            count={allCount}
            onClick={() => onChange(null)}
          />
        )}
        {categories.map((cat) => (
          <PillButton
            key={cat.id}
            ref={active === cat.id ? activeBtnRef : null}
            active={active === cat.id}
            label={cat.label}
            count={cat.count}
            icon={cat.icon}
            onClick={() => onChange(active === cat.id ? null : cat.id)}
          />
        ))}
        <div className="flex-shrink-0 w-2" aria-hidden />
      </nav>
    </div>
  );
}

interface PillButtonProps {
  active: boolean;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  onClick: () => void;
}

const PillButton = forwardRef<HTMLButtonElement, PillButtonProps>(function PillButton(
  { active, label, count, icon, onClick },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`
        group flex-shrink-0 snap-start
        inline-flex items-center gap-1.5
        px-4 py-2 rounded-full
        text-sm font-medium
        transition-all duration-200
        active:scale-[0.96]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]
        ${active
          ? 'bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/30 shadow-[0_0_20px_-6px_rgba(16,185,129,0.4)]'
          : 'text-gray-400 ring-1 ring-white/[0.06] hover:text-white hover:ring-white/15 hover:bg-white/[0.03]'}
      `}
    >
      {icon && (
        <span className="text-base flex-shrink-0" aria-hidden>
          {icon}
        </span>
      )}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`text-[11px] tabular-nums transition-colors ${active ? 'text-emerald-400/70' : 'text-gray-600 group-hover:text-gray-500'}`}
        >
          {count}
        </span>
      )}
    </button>
  );
});
