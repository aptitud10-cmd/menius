'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MenuSheetSection {
  id: string;
  label: string;
  count: number;
}

export interface MenuSheetEntry {
  id: string;
  label: string;
  count: number;
  /** Subsections, only for groups with enough of them to be worth a jump. */
  sections: MenuSheetSection[];
}

interface MenuSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  searchLabel: string;
  onSearch: () => void;
  entries: MenuSheetEntry[];
  activeId: string | null;
  /** Group to open expanded (and scroll to) — the floating "Sections" button. */
  expandOnOpen: string | null;
  onSelect: (id: string) => void;
  onSelectSection: (entryId: string, sectionId: string) => void;
  /** Breakpoint above which the sheet is never shown (desktop has a sidebar). */
  hiddenFromClass: string;
}

/**
 * One "Menu" sheet for both ways in: the ☰ opens it folded, the floating
 * "Breakfast · Sections" button opens it with that group unfolded. It used to
 * be two sheets that looked alike — "EXPLORE MENU" with no counts and "JUMP
 * TO SECTION" with counts — and neither had Popular, so on mobile there was
 * no way back to it from the list. Counts per group, as Toast does, tell the
 * diner how much is behind each name before the jump.
 */
export function MenuSheet({
  open,
  onClose,
  title,
  closeLabel,
  searchLabel,
  onSearch,
  entries,
  activeId,
  expandOnOpen,
  onSelect,
  onSelectSection,
  hiddenFromClass,
}: MenuSheetProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const expandedRowRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Fresh state on every open: folded, or the requested group unfolded.
  useEffect(() => {
    if (!open) return;
    setExpanded(expandOnOpen ? new Set([expandOnOpen]) : new Set());
  }, [open, expandOnOpen]);

  // Opened for a group's sections: bring that group to the top of the list.
  useEffect(() => {
    if (!open || !expandOnOpen) return;
    // Manual offset rather than scrollIntoView, which on iOS also scrolls
    // the page behind the sheet.
    const id = requestAnimationFrame(() => {
      const nav = navRef.current;
      const row = expandedRowRef.current;
      // nav is the offsetParent (relative), so offsetTop is already inside it.
      if (nav && row) nav.scrollTop = row.offsetTop;
    });
    return () => cancelAnimationFrame(id);
  }, [open, expandOnOpen]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={cn(hiddenFromClass, 'fixed inset-0 z-[80] bg-black/40')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              hiddenFromClass,
              'fixed bottom-0 left-0 right-0 z-[81] bg-white rounded-t-3xl overflow-hidden flex flex-col',
            )}
            style={{ maxHeight: '85dvh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-sheet-title"
          >
            <div className="flex justify-center pt-2.5 flex-shrink-0" aria-hidden="true">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            <div className="flex items-center justify-between pl-5 pr-2 pt-1 pb-2 flex-shrink-0">
              <h2 id="menu-sheet-title" className="text-[20px] font-bold text-gray-900">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <div className="px-5 pb-2 flex-shrink-0">
              <button
                type="button"
                onClick={onSearch}
                className="w-full h-11 flex items-center gap-2.5 px-4 rounded-xl bg-gray-100 text-[15px] text-gray-600 text-left active:bg-gray-200 transition-colors"
              >
                <Search className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {searchLabel}
              </button>
            </div>

            <nav ref={navRef} className="relative overflow-y-auto flex-1 pb-3" aria-label={title}>
              {entries.map((entry) => {
                const isActive = activeId === entry.id;
                const canExpand = entry.sections.length > 0;
                const isOpen = canExpand && expanded.has(entry.id);
                return (
                  <div
                    key={entry.id}
                    ref={entry.id === expandOnOpen ? expandedRowRef : undefined}
                  >
                    <div className="relative flex items-stretch">
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#05c8a7]"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => onSelect(entry.id)}
                        aria-current={isActive ? 'true' : undefined}
                        className={cn(
                          'flex-1 min-w-0 min-h-[44px] flex items-center gap-3 pl-5 text-left text-[16px] transition-colors active:bg-gray-50',
                          canExpand ? 'pr-1' : 'pr-5',
                          isActive ? 'font-bold text-gray-900' : 'font-medium text-gray-800',
                        )}
                      >
                        <span className="flex-1 truncate">{entry.label}</span>
                        <span className="text-[14px] font-normal text-gray-600 tabular-nums">
                          {entry.count}
                        </span>
                      </button>
                      {canExpand ? (
                        <button
                          type="button"
                          onClick={() => toggle(entry.id)}
                          aria-expanded={isOpen}
                          aria-label={`${entry.label}: ${entry.sections.length}`}
                          className="w-12 min-h-[44px] flex items-center justify-center flex-shrink-0 text-gray-600 active:bg-gray-50 transition-colors"
                        >
                          <ChevronDown
                            className={cn('w-5 h-5 transition-transform', isOpen && 'rotate-180')}
                            aria-hidden="true"
                          />
                        </button>
                      ) : null}
                    </div>
                    {isOpen && (
                      <div className="pb-1">
                        {entry.sections.map((section) => (
                          <button
                            key={section.id}
                            type="button"
                            onClick={() => onSelectSection(entry.id, section.id)}
                            className="w-full min-h-[44px] flex items-center gap-3 pl-9 pr-5 text-left text-[15px] text-gray-700 active:bg-gray-50 transition-colors"
                          >
                            <span className="flex-1 truncate">{section.label}</span>
                            <span className="text-[14px] text-gray-600 tabular-nums">
                              {section.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
            <div className="flex-shrink-0 pb-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
