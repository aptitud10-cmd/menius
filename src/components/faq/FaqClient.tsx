'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { FaqCategory } from '@/lib/faq-data';
import { extractFaqText } from '@/lib/faq-data';
import { CategoryFilter } from '@/components/ui/CategoryFilter';

interface FaqPageText {
  badge: string;
  title: string;
  subtitleSuffix: string;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaDemo: string;
  searchPlaceholder: string;
  searchClear: string;
  searchResultsZero: string;
  searchResultsOne: string;
  searchResultsMany: string;
  noResultsTitle: string;
  noResultsBody: string;
}

function formatResultsCount(pt: FaqPageText, n: number): string {
  if (n === 0) return pt.searchResultsZero;
  if (n === 1) return pt.searchResultsOne;
  return pt.searchResultsMany.replace('{n}', String(n));
}

interface FaqClientProps {
  categories: FaqCategory[];
  pt: FaqPageText;
}

interface MatchedQuestion {
  q: string;
  a: React.ReactNode;
  category: FaqCategory;
}

/** Highlight occurrences of `query` inside `text` with a <mark>. Case/diacritics-insensitive. */
const DIACRITICS = /[̀-ͯ]/g;
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(DIACRITICS, '');

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const haystack = norm(text);
  const needle = norm(query);
  if (!needle) return text;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let i = haystack.indexOf(needle, cursor);
  while (i !== -1) {
    if (i > cursor) parts.push(text.slice(cursor, i));
    parts.push(
      <mark
        key={`m-${i}`}
        className="bg-emerald-500/20 text-emerald-200 px-0.5 rounded-sm"
      >
        {text.slice(i, i + query.length)}
      </mark>,
    );
    cursor = i + query.length;
    i = haystack.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export function FaqClient({ categories, pt }: FaqClientProps) {
  const [activeId, setActiveId] = useState<string>(categories[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Auto-hide sticky header on scroll-down (mobile UX)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      if (y < 80) setHidden(false);
      else if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Pre-compute searchable text per question (memo, so it only runs once)
  const searchIndex = useMemo(() => {
    return categories.flatMap((cat) =>
      cat.questions.map<MatchedQuestion & { searchText: string }>((q) => ({
        q: q.q,
        a: q.a,
        category: cat,
        searchText: norm(`${q.q}\n${extractFaqText(q.a)}`),
      })),
    );
  }, [categories]);

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;

  const matches = useMemo<MatchedQuestion[]>(() => {
    if (!isSearching) return [];
    const needle = norm(trimmedQuery);
    return searchIndex.filter((item) => item.searchText.includes(needle));
  }, [isSearching, trimmedQuery, searchIndex]);

  const active = categories.find((c) => c.id === activeId) ?? categories[0];

  const filterCategories = categories.map((cat) => ({
    id: cat.id,
    label: cat.title,
    count: cat.questions.length,
    icon: cat.icon,
  }));

  return (
    <>
      {/* Sticky search + category nav — auto-hides on scroll-down */}
      <section
        className={`sticky top-16 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.04] transition-transform duration-300 ${hidden ? '-translate-y-full' : 'translate-y-0'}`}
      >
        <div className="max-w-5xl mx-auto px-6 pt-3">
          {/* Search input */}
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={pt.searchPlaceholder}
              aria-label={pt.searchPlaceholder}
              className="w-full pl-10 pr-10 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:border-emerald-400/40 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={pt.searchClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Categories — disabled visually while searching but still navigable */}
          <div
            aria-hidden={isSearching}
            className={`transition-opacity duration-200 ${isSearching ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
          >
            <CategoryFilter
              categories={filterCategories}
              active={activeId}
              onChange={(id) => id && setActiveId(id)}
              hideAll
              ariaLabel="FAQ categories"
            />
          </div>
        </div>
      </section>

      {/* FAQ content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16 md:py-20">
        {isSearching ? (
          /* ── Search results view ────────────────────────────────────── */
          <section>
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-xl md:text-2xl font-semibold text-white">
                {formatResultsCount(pt, matches.length)}
              </h2>
              {matches.length > 0 && (
                <span className="ml-auto text-xs text-gray-500 truncate max-w-[40%]">
                  &ldquo;{trimmedQuery}&rdquo;
                </span>
              )}
            </div>
            {matches.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-10 md:p-14 text-center">
                <p className="text-base font-semibold text-white mb-2">{pt.noResultsTitle}</p>
                <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">{pt.noResultsBody}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((m, i) => (
                  <details
                    key={`${m.category.id}-${i}`}
                    className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:border-emerald-500/20 transition-colors duration-300"
                  >
                    <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-inset">
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium text-gray-200">
                          {highlight(m.q, trimmedQuery)}
                        </p>
                        <p className="text-[11px] text-gray-600 mt-1 inline-flex items-center gap-1.5">
                          <span aria-hidden>{m.category.icon}</span>
                          <span>{m.category.title}</span>
                        </p>
                      </div>
                      <span className="faq-icon text-emerald-400 text-xl font-light transition-transform duration-200 flex-shrink-0 group-open:rotate-45">+</span>
                    </summary>
                    <div className="faq-answer px-6 pb-5">
                      <div className="text-sm text-gray-400 leading-relaxed">{m.a}</div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>
        ) : active ? (
          /* ── Default category view ──────────────────────────────────── */
          <section>
            <div className="flex items-center gap-3 mb-8">
              <span className="text-2xl">{active.icon}</span>
              <h2 className="text-xl md:text-2xl font-semibold text-white">{active.title}</h2>
              <span className="ml-auto px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-xs font-medium text-gray-500">
                {active.questions.length}
              </span>
            </div>
            <div className="space-y-3">
              {active.questions.map((faq, i) => (
                <details key={i} className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:border-emerald-500/20 transition-colors duration-300">
                  <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-inset">
                    <span className="text-[15px] font-medium text-gray-200 pr-4">{faq.q}</span>
                    <span className="faq-icon text-emerald-400 text-xl font-light transition-transform duration-200 flex-shrink-0 group-open:rotate-45">+</span>
                  </summary>
                  <div className="faq-answer px-6 pb-5">
                    <div className="text-sm text-gray-400 leading-relaxed">{faq.a}</div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {/* CTA */}
        <div className="mt-20 relative text-center rounded-2xl overflow-hidden p-10 md:p-14">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-blue-600/10 rounded-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-semibold text-white tracking-tight mb-4">{pt.ctaTitle}</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed font-light">{pt.ctaSubtitle}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="mailto:soporte@menius.app"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-black font-medium text-[15px] hover:bg-gray-100 transition-all btn-glow"
              >
                soporte@menius.app
              </a>
              <Link
                href="/demo"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 text-gray-400 font-medium text-[15px] hover:text-white hover:border-white/20 transition-all"
              >
                {pt.ctaDemo}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
