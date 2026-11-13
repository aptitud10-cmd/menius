import type { ModifierGroup, ModifierOption, ModifierSelection } from '@/types';
import { pruneHiddenSelections, visibleGroups } from '@/lib/conditional-modifiers';

/**
 * "Reorder last order" with the diner's choices (Pedro 2026-11-13).
 *
 * The last order used to keep only dish + quantity. On Buccaneer 266 of 408
 * dishes have options (eggs, potatoes, bacon style), so the reorder skipped
 * nearly everything and opened an empty cart. Now each line keeps the option
 * ids it was ordered with, and they are re-checked against today's menu.
 */

/** One answered question of a past line: group id + chosen option ids. */
export interface SavedModifier {
  groupId: string;
  optionIds: string[];
}

/** Cart selections → what the last order keeps. Legacy pseudo-groups are skipped. */
export function toSavedModifiers(selections: ModifierSelection[]): SavedModifier[] {
  return selections
    .filter((s) => s.group?.id && !s.group.id.startsWith('__') && s.selectedOptions.length > 0)
    .map((s) => ({ groupId: s.group.id, optionIds: s.selectedOptions.map((o) => o.id) }));
}

/**
 * Today's selections for a past line, or null when it can't be repeated as-is
 * and the diner has to choose again: a chosen option was deleted or is outside
 * its hours (Grits after 11), or the dish gained a required question since.
 * Prices come from today's options, never from the old order.
 */
export function rebuildSelections(
  groups: ModifierGroup[],
  saved: SavedModifier[],
  isAvailable: (o: ModifierOption) => boolean = () => true,
): ModifierSelection[] | null {
  const byId = new Map(groups.map((g) => [g.id, g]));
  const selections: Record<string, ModifierOption[]> = {};

  for (const s of saved) {
    const group = byId.get(s.groupId);
    if (!group) return null;
    const options: ModifierOption[] = [];
    for (const id of s.optionIds) {
      const opt = group.options.find((o) => o.id === id);
      if (!opt || !isAvailable(opt)) return null;
      options.push(opt);
    }
    selections[group.id] = options;
  }

  const pruned = pruneHiddenSelections(groups, selections);
  const shown = visibleGroups(groups, pruned);
  for (const g of shown) {
    const count = (pruned[g.id] ?? []).length;
    const min = Math.max(g.is_required ? 1 : 0, g.min_select ?? 0);
    if (count < min) return null;
    if (g.max_select > 0 && count > g.max_select) return null;
  }

  return shown
    .filter((g) => (pruned[g.id] ?? []).length > 0)
    .map((g) => ({ group: g, selectedOptions: pruned[g.id] }));
}
