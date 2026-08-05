import type { ModifierGroup, ModifierOption } from '@/types';

/**
 * Conditional modifier groups.
 *
 * A group with `depends_on_option_id` only exists while that option is
 * selected. Buccaneer's burgers are the driving case: "Choice of Side" hangs
 * off the "Deluxe" option of the "Style" group, because a Regular burger comes
 * with no side at all — yet the customer was still forced to pick one, and
 * picking a premium side charged $1.50 for food that would never arrive.
 *
 * Both the sheet and the orders API resolve visibility through these helpers so
 * the price the customer sees and the price the server charges cannot drift.
 */

/** Ids of every option currently selected, across all groups. */
export function selectedOptionIds(
  selections: Record<string, ModifierOption[]>,
): Set<string> {
  const ids = new Set<string>();
  for (const opts of Object.values(selections)) {
    for (const o of opts) ids.add(o.id);
  }
  return ids;
}

/**
 * Whether a group should be shown at all.
 *
 * Resolved iteratively rather than with a single pass: a dependency can itself
 * hang off another group, and a chain must collapse entirely when any link is
 * unselected. Without this, hiding "Style" would leave "Choice of Side" visible
 * because its own option is still technically selected.
 */
export function visibleGroups(
  groups: ModifierGroup[],
  selections: Record<string, ModifierOption[]>,
): ModifierGroup[] {
  const optionOwner = new Map<string, string>();
  for (const g of groups) {
    for (const o of g.options) optionOwner.set(o.id, g.id);
  }

  const selected = selectedOptionIds(selections);
  let visible = groups;

  // Each pass can hide a group whose parent just disappeared; the loop settles
  // when nothing more drops. Bounded by the group count, so it always ends.
  for (let pass = 0; pass < groups.length + 1; pass++) {
    const visibleIds = new Set(visible.map((g) => g.id));
    const next = visible.filter((g) => {
      const dep = g.depends_on_option_id;
      if (!dep) return true;
      // The group that owns the dependency must itself still be on screen.
      const owner = optionOwner.get(dep);
      if (owner && !visibleIds.has(owner)) return false;
      return selected.has(dep);
    });
    if (next.length === visible.length) break;
    visible = next;
  }

  return visible;
}

/**
 * Drops selections belonging to groups that are no longer visible.
 *
 * Without this, choosing Deluxe → Onion Rings (+$1.50) and then switching back
 * to Regular would keep charging the $1.50: the group vanishes from the UI but
 * its selection stays in state and still reaches the cart.
 */
export function pruneHiddenSelections(
  groups: ModifierGroup[],
  selections: Record<string, ModifierOption[]>,
): Record<string, ModifierOption[]> {
  const visibleIds = new Set(visibleGroups(groups, selections).map((g) => g.id));
  const pruned: Record<string, ModifierOption[]> = {};
  for (const [groupId, opts] of Object.entries(selections)) {
    // Legacy pseudo-groups (__legacy_variants / __legacy_extras) are never
    // conditional and aren't part of `groups`, so they must survive.
    const isKnownGroup = groups.some((g) => g.id === groupId);
    if (!isKnownGroup || visibleIds.has(groupId)) pruned[groupId] = opts;
  }
  return pruned;
}
