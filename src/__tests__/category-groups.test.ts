import { describe, it, expect } from 'vitest';
import {
  collapseToGroups,
  resolveActivePill,
  GROUP_PREFIX,
} from '@/lib/category-groups';
import type { Category } from '@/types';

function cat(over: Partial<Category> & { id: string; name: string }): Category {
  return {
    restaurant_id: 'r1',
    sort_order: 0,
    is_active: true,
    translations: {},
    created_at: '',
    ...over,
  };
}

/** The 7 restaurants that don't use grouping. Their behaviour must not change. */
describe('restaurants without groups', () => {
  const flat = [
    cat({ id: 'a', name: 'Entradas', sort_order: 1 }),
    cat({ id: 'b', name: 'Platos', sort_order: 2 }),
    cat({ id: 'c', name: 'Bebidas', sort_order: 3 }),
  ];

  it('returns the categories untouched on a small menu', () => {
    expect(collapseToGroups(flat, { isLargeCatalog: false })).toBe(flat);
  });

  it('returns the categories untouched on a large menu too', () => {
    expect(collapseToGroups(flat, { isLargeCatalog: true })).toBe(flat);
  });

  it('leaves the active pill as the plain category id', () => {
    expect(resolveActivePill('b', flat, { groupsActive: false })).toBe('b');
  });
});

describe('grouping requires large-catalog mode', () => {
  const grouped = [
    cat({ id: 'a', name: 'Cafés', group_name: 'Bebidas', group_sort_order: 1 }),
    cat({ id: 'b', name: 'Jugos', group_name: 'Bebidas', group_sort_order: 1 }),
  ];

  it('does NOT collapse on a small menu — the pills would go dead', () => {
    // Regression: a group has no section of its own, so outside large-catalog
    // mode tapping a group pill scrolled nowhere and filtered nothing.
    expect(collapseToGroups(grouped, { isLargeCatalog: false })).toBe(grouped);
  });

  it('collapses on a large menu', () => {
    const out = collapseToGroups(grouped, { isLargeCatalog: true });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(`${GROUP_PREFIX}Bebidas`);
    expect(out[0].name).toBe('Bebidas');
  });
});

describe('collapseToGroups', () => {
  it('orders groups by group_sort_order', () => {
    const out = collapseToGroups(
      [
        cat({ id: 'a', name: 'Postres', group_name: 'Dulces', group_sort_order: 9 }),
        cat({ id: 'b', name: 'Huevos', group_name: 'Breakfast', group_sort_order: 1 }),
        cat({ id: 'c', name: 'Waffles', group_name: 'Breakfast', group_sort_order: 1 }),
      ],
      { isLargeCatalog: true },
    );
    expect(out.map((c) => c.name)).toEqual(['Breakfast', 'Dulces']);
  });

  it('keeps ungrouped categories as their own pill', () => {
    const out = collapseToGroups(
      [
        cat({ id: 'a', name: 'Huevos', group_name: 'Breakfast', group_sort_order: 1 }),
        cat({ id: 'b', name: 'Suelta', sort_order: 2 }),
      ],
      { isLargeCatalog: true },
    );
    expect(out.map((c) => c.name)).toEqual(['Breakfast', 'Suelta']);
  });

  it('does NOT inherit a category schedule onto the whole group', () => {
    // Regression: the group object used to be spread from the first category,
    // so one time-limited category painted the entire group as closed.
    const out = collapseToGroups(
      [
        cat({
          id: 'a',
          name: 'Desayuno temprano',
          group_name: 'Breakfast',
          group_sort_order: 1,
          available_from: '06:00',
          available_to: '11:00',
        }),
        cat({ id: 'b', name: 'Pancakes', group_name: 'Breakfast', group_sort_order: 1 }),
      ],
      { isLargeCatalog: true },
    );
    expect(out[0].available_from).toBeUndefined();
    expect(out[0].available_to).toBeUndefined();
  });

  it('does not leak the source category id', () => {
    const out = collapseToGroups(
      [cat({ id: 'real-uuid', name: 'Huevos', group_name: 'Breakfast', group_sort_order: 1 })],
      { isLargeCatalog: true },
    );
    expect(out[0].id).not.toBe('real-uuid');
  });
});

describe('resolveActivePill', () => {
  const cats = [
    cat({ id: 'a', name: 'Huevos', group_name: 'Breakfast', group_sort_order: 1 }),
    cat({ id: 'b', name: 'Suelta' }),
  ];

  it('maps a real category id to its group pill', () => {
    // Regression: the scroll-spy writes real ids, the pills carry synthetic
    // ones — without this the bar lost its highlight on any scroll.
    expect(resolveActivePill('a', cats, { groupsActive: true })).toBe(
      `${GROUP_PREFIX}Breakfast`,
    );
  });

  it('leaves an ungrouped category as-is', () => {
    expect(resolveActivePill('b', cats, { groupsActive: true })).toBe('b');
  });

  it('passes a group id through unchanged', () => {
    const id = `${GROUP_PREFIX}Breakfast`;
    expect(resolveActivePill(id, cats, { groupsActive: true })).toBe(id);
  });

  it('handles null', () => {
    expect(resolveActivePill(null, cats, { groupsActive: true })).toBeNull();
  });
});
