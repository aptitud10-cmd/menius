import type { Category } from '@/types';

/** Marks a synthetic pill id that stands for a category GROUP rather than a
 *  single category. Real category ids are UUIDs, so there is no collision. */
export const GROUP_PREFIX = '__group__:';

export function isGroupId(id: string): boolean {
  return id.startsWith(GROUP_PREFIX);
}

export function groupNameFromId(id: string): string {
  return id.slice(GROUP_PREFIX.length);
}

/**
 * Collapses categories into their parent groups for the pill bar.
 *
 * Returns the input untouched when grouping is off — that is the path every
 * restaurant without group_name takes, and it must stay byte-for-byte the
 * previous behaviour.
 *
 * Grouping requires large-catalog mode: outside it a pill scrolls to its own
 * section, and a group has no section, so the pills would go dead.
 */
export function collapseToGroups(
  categories: Category[],
  opts: { isLargeCatalog: boolean },
): Category[] {
  const hasGroups = categories.some((c) => !!c.group_name);
  if (!hasGroups || !opts.isLargeCatalog) return categories;

  const seen = new Map<string, { order: number; cat: Category }>();

  for (const cat of categories) {
    const grp = cat.group_name;
    if (!grp) {
      // Ungrouped categories stay as their own pill so nothing gets hidden.
      seen.set(cat.id, { order: cat.sort_order ?? 0, cat });
      continue;
    }
    if (seen.has(GROUP_PREFIX + grp)) continue;
    // Built field by field, NOT spread from `cat`: spreading dragged that one
    // category's available_from/available_to onto the whole group, so a single
    // time-limited category would paint the entire group as closed.
    seen.set(GROUP_PREFIX + grp, {
      order: cat.group_sort_order ?? cat.sort_order ?? 0,
      cat: {
        id: GROUP_PREFIX + grp,
        restaurant_id: cat.restaurant_id,
        name: grp,
        sort_order: cat.group_sort_order ?? 0,
        is_active: true,
        translations: {},
        created_at: '',
      },
    });
  }

  return Array.from(seen.values())
    .sort((a, b) => a.order - b.order)
    .map((v) => v.cat);
}

/**
 * Maps whatever the scroll-spy put in activeCategory (always a REAL category
 * id) to the pill that represents it. With groups active that pill is the
 * synthetic group id, so without this translation no pill ever matches and the
 * bar loses its highlight as soon as the user scrolls.
 */
export function resolveActivePill(
  activeCategory: string | null,
  categories: Category[],
  opts: { groupsActive: boolean },
): string | null {
  if (!opts.groupsActive || !activeCategory) return activeCategory;
  if (isGroupId(activeCategory)) return activeCategory;
  const grp = categories.find((c) => c.id === activeCategory)?.group_name;
  return grp ? GROUP_PREFIX + grp : activeCategory;
}
