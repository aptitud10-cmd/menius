'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Product, Category } from '@/types';
import {
  heuristicIntent,
  applyIntent,
  isEmptyIntent,
  type MenuIntent,
} from '@/lib/menu-intent';

/**
 * Natural-language layer over the lexical menu search.
 *
 * Only engages when the lexical engine came up short AND the query looks like a
 * sentence rather than a dish name. "burger" is handled locally and instantly;
 * "algo liviano para mi hijo" is what this is for.
 *
 * Everything is additive: the caller keeps rendering `lexicalResults` and only
 * falls back to `results` here when the lexical ones are empty. Disabling the
 * feature (or a network failure) leaves the existing search untouched.
 */

/** Below this a query is a dish name, not a sentence — never worth a round-trip. */
const MIN_SENTENCE_LEN = 12;
const MIN_SENTENCE_WORDS = 3;
const DEBOUNCE_MS = 650;

export interface UseNaturalSearchOptions {
  enabled: boolean;
  query: string;
  restaurantId: string;
  products: Product[];
  categories: Category[];
  locale: string;
  defaultLocale: string;
  /** Results from the lexical engine. NL only runs when these come up empty. */
  lexicalResultCount: number;
}

export interface NaturalSearchState {
  /** Products matching the interpreted intent. Empty when NL didn't run. */
  results: Product[];
  /** Short human sentence from the model, shown above the results. */
  reply: string | null;
  loading: boolean;
  /** True once an interpretation produced something to show. */
  active: boolean;
}

const IDLE: NaturalSearchState = { results: [], reply: null, loading: false, active: false };

function looksLikeSentence(query: string): boolean {
  const q = query.trim();
  return q.length >= MIN_SENTENCE_LEN && q.split(/\s+/).length >= MIN_SENTENCE_WORDS;
}

export function useNaturalSearch({
  enabled,
  query,
  restaurantId,
  products,
  categories,
  locale,
  defaultLocale,
  lexicalResultCount,
}: UseNaturalSearchOptions): NaturalSearchState {
  const [intent, setIntent] = useState<MenuIntent | null>(null);
  const [loading, setLoading] = useState(false);

  // Guards against a slow response for an old query overwriting a newer one.
  const requestIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const shouldRun = enabled && lexicalResultCount === 0 && looksLikeSentence(query);

  useEffect(() => {
    clearTimeout(timerRef.current);

    if (!shouldRun) {
      setIntent(null);
      setLoading(false);
      return;
    }

    // Interpret locally first: "sin gluten" resolves with zero latency and zero
    // cost, and stays on screen if the request later fails.
    const local = heuristicIntent(query);
    if (!isEmptyIntent(local)) setIntent(local);

    const id = ++requestIdRef.current;
    setLoading(true);

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/public/menu-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurant_id: restaurantId, query, locale }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { intent?: MenuIntent };
        // Ignore a response that arrived after the customer kept typing.
        if (id !== requestIdRef.current) return;
        if (data.intent) setIntent(data.intent);
      } catch {
        // Keep the heuristic intent — the customer still gets results.
        if (id === requestIdRef.current && isEmptyIntent(local)) setIntent(null);
      } finally {
        if (id === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [shouldRun, query, restaurantId, locale]);

  // Cancel any in-flight work on unmount so a late response can't setState.
  useEffect(() => {
    return () => {
      requestIdRef.current++;
      clearTimeout(timerRef.current);
    };
  }, []);

  const results = useMemo(() => {
    if (!shouldRun || !intent) return [];
    return applyIntent({ products, categories, intent, locale, defaultLocale });
  }, [shouldRun, intent, products, categories, locale, defaultLocale]);

  if (!shouldRun) return IDLE;

  return {
    results,
    reply: intent?.reply ?? null,
    loading,
    active: results.length > 0,
  };
}
