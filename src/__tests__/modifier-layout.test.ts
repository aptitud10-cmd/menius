import { describe, it, expect } from 'vitest';
import { groupFormat, planGroupLayout, splitOptionName } from '@/lib/modifier-layout';
import type { ModifierGroup } from '@/types';

let n = 0;
function group(
  name: string,
  opts: Array<[string, number]>,
  over: Partial<ModifierGroup> = {},
): ModifierGroup {
  const id = `g${++n}`;
  return {
    id,
    product_id: 'p',
    name,
    selection_type: 'single',
    min_select: 1,
    max_select: 1,
    is_required: true,
    sort_order: n,
    display_type: 'grid',
    options: opts.map(([o, price], i) => ({
      id: `${id}-o${i}`,
      group_id: id,
      name: o,
      price_delta: price,
      sort_order: i,
    })) as ModifierGroup['options'],
    ...over,
  } as ModifierGroup;
}
const optional = { is_required: false, min_select: 0, selection_type: 'multi' as const };

// Bacon Cheeseburger, Buccaneer (prod data, 2026-11-16)
const style = group('Regular or Deluxe?', [['Regular', 0], ['Deluxe — lettuce, tomato & choice of side', 4]]);
const cooked = group('How would you like your burger cooked?', [['Rare', 0], ['Medium', 0], ['Well Done', 0]]);
const fries = group('Comes with French Fries. Want to swap?', [['French Fries', 0], ['Home Fries', 0], ['Onion Rings', 1.5]]);
const removed = group('Anything you would like removed?', [['No Bacon', 0], ['No Pickle', 0]], { ...optional, max_select: 3 });
const add = group('Would you like to add anything?', [['Add Avocado', 1.25], ['Add Raw Onion', 1.25], ['Add Fried Onion', 1.25], ['Add 1 Egg', 1.25]], { ...optional, max_select: 4 });
const lettuce = group('Would you like lettuce & tomato?', [['Add Lettuce & Tomato', 1.25]], { ...optional, max_select: 1 });
const cheese = group('Would you like extra cheese?', [['Extra Cheese on Burger', 1.5]], { ...optional, max_select: 2 });
const cheeseFries = group('Would you like cheese on your fries?', [['Cheese on Fries', 1.5]], { ...optional, max_select: 1 });
const sauce = group('Would you like extra sauce?', [['Gravy', 0.75], ['Ranch', 0.75], ['BBQ', 0.75], ['Mayo', 0.75], ['Ketchup', 0.75]], { ...optional, max_select: 5 });

describe('groupFormat', () => {
  it('toggle for a required plain-or-upgrade choice', () => {
    expect(groupFormat(style)).toBe('toggle');
  });
  it('not a toggle when both options cost the same or it is optional', () => {
    expect(groupFormat(group('Size', [['Small', 0], ['Large', 0]]))).toBe('chips');
    expect(groupFormat({ ...style, is_required: false, min_select: 0 })).toBe('cards');
  });
  it('cards when the upgrade label is too long for half a toggle', () => {
    const long = group('Style', [['Regular', 0], ['Super Deluxe Platter — fries & salad', 4]]);
    expect(groupFormat(long)).toBe('cards');
  });
  it('splits title and detail on the em dash', () => {
    expect(splitOptionName('Deluxe — lettuce, tomato & choice of side')).toEqual({ title: 'Deluxe', detail: 'lettuce, tomato & choice of side' });
    expect(splitOptionName('Regular')).toEqual({ title: 'Regular', detail: null });
  });
  it('chips for short choices, priced or not', () => {
    expect(groupFormat(cooked)).toBe('chips');
    expect(groupFormat(fries)).toBe('chips');
    expect(groupFormat(removed)).toBe('chips');
  });
  it('list for a few priced add-ons', () => {
    expect(groupFormat(add)).toBe('list');
  });
  it('chips once priced add-ons are many', () => {
    expect(groupFormat(sauce)).toBe('chips');
  });
  it('list for a lone optional add-on', () => {
    expect(groupFormat(cheese)).toBe('list');
  });
  it('respects an explicit list from the dashboard', () => {
    expect(groupFormat({ ...cooked, display_type: 'list' })).toBe('list');
  });
});

describe('planGroupLayout', () => {
  it('folds the lone add-ons after the add-on list into it', () => {
    const plan = planGroupLayout([style, cooked, fries, removed, add, lettuce, cheese, cheeseFries, sauce]);
    expect(plan.guests.get(add.id)?.map((g) => g.id)).toEqual([lettuce.id, cheese.id, cheeseFries.id]);
    expect(Array.from(plan.absorbed)).toEqual([lettuce.id, cheese.id, cheeseFries.id]);
    expect(plan.absorbed.has(sauce.id)).toBe(false);
  });
  it('a lone add-on with no list before it stands on its own', () => {
    const plan = planGroupLayout([cooked, cheese]);
    expect(plan.absorbed.size).toBe(0);
    expect(plan.format.get(cheese.id)).toBe('list');
  });
  it('never folds into a required group', () => {
    const requiredList = group('Pick sides', [['Fries', 1], ['Salad', 1]], { display_type: 'list' });
    const plan = planGroupLayout([requiredList, cheese]);
    expect(plan.absorbed.size).toBe(0);
  });
  it('a lone add-on can host the next one', () => {
    const plan = planGroupLayout([cooked, lettuce, cheese]);
    expect(plan.guests.get(lettuce.id)?.map((g) => g.id)).toEqual([cheese.id]);
  });
});
