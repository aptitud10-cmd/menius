import type { ModifierGroup, ModifierOption } from '@/types';
import { dependencyIds } from '@/lib/conditional-modifiers';
import { fuzzyMatches, normalize } from '@/lib/menu-search';

/**
 * Search box over a dish's modifier groups (Pedro 2026-11-13).
 *
 * A Western omelette or a Two Eggs plate asks 12–15 questions; a diner who
 * just wants "add bacon" or "no onions" had to scroll past all of them. Typing
 * narrows every group to the options that match, keeping the question above
 * each one so "Bacon" still reads as meat-to-add and not bacon style.
 */

/** Below this many options the sheet is short enough that a box is noise. */
export const OPTION_SEARCH_MIN_OPTIONS = 20;

/**
 * Every word the diner typed must appear in the text. A word also matches a
 * one-typo prefix of a longer word, so "halapeno" finds "Jalapeños" and
 * "chedar" finds "Cheddar".
 */
export function textMatchesQuery(text: string, query: string): boolean {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = normalize(text);
  const words = hay.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.every(
    (tok) =>
      hay.includes(tok) ||
      words.some(
        (w) => fuzzyMatches(w, tok) || fuzzyMatches(w.slice(0, tok.length), tok),
      ),
  );
}

type SearchableGroup = Pick<
  ModifierGroup,
  'id' | 'depends_on_option_id' | 'depends_on_option_ids'
> & { options: ModifierOption[] };

/**
 * Groups narrowed to the query, in their original order.
 *
 * - A group whose question matches ("cheese" → "Would you like to add
 *   cheese?") keeps all its options.
 * - Otherwise it keeps only the matching options, and drops out if none do.
 * - A conditional group opened by a selected option that is on screen stays
 *   whole: picking Bacon from the results must show "How would you like the
 *   bacon?" right there, not hide it behind the filter.
 *
 * An empty query returns the groups untouched.
 */
export function filterGroupsByQuery<G extends SearchableGroup>(
  groups: G[],
  query: string,
  titleOf: (g: G) => string,
  nameOf: (o: ModifierOption) => string,
  selectedIds: Set<string>,
): G[] {
  if (!normalize(query)) return groups;

  const kept = new Map<string, G>();
  for (const g of groups) {
    if (textMatchesQuery(titleOf(g), query)) {
      kept.set(g.id, g);
      continue;
    }
    const options = g.options.filter((o) => textMatchesQuery(nameOf(o), query));
    if (options.length > 0) kept.set(g.id, { ...g, options });
  }

  // Chains (Choice of Meat → Bacon → Bacon style) resolve over a few passes.
  let changed = true;
  while (changed) {
    changed = false;
    const onScreen = new Set<string>();
    kept.forEach((g) => g.options.forEach((o) => onScreen.add(o.id)));
    for (const g of groups) {
      if (kept.get(g.id) === g) continue;
      const opened = dependencyIds(g).some(
        (dep) => onScreen.has(dep) && selectedIds.has(dep),
      );
      if (opened) {
        kept.set(g.id, g);
        changed = true;
      }
    }
  }

  return groups.flatMap((g) => {
    const k = kept.get(g.id);
    return k ? [k] : [];
  });
}
