import { describe, it, expect } from 'vitest';
import { filterGroupsByQuery, textMatchesQuery } from '@/lib/option-search';
import type { ModifierGroup, ModifierOption } from '@/types';

const opt = (id: string, name: string): ModifierOption =>
  ({ id, name, price_delta: 0, is_default: false, sort_order: 0 }) as unknown as ModifierOption;

const group = (id: string, name: string, options: ModifierOption[], deps?: string[]): ModifierGroup =>
  ({
    id,
    name,
    options,
    depends_on_option_id: deps?.[0] ?? null,
    depends_on_option_ids: deps ?? null,
  }) as unknown as ModifierGroup;

const meat = group('g-meat', 'Would you like to add meat?', [
  opt('bacon', 'Bacon'),
  opt('ham', 'Ham'),
]);
const baconStyle = group('g-style', 'How would you like the bacon?', [
  opt('soft', 'Soft'),
  opt('crispy', 'Crispy'),
], ['bacon']);
const veg = group('g-veg', 'Would you like to add vegetables?', [
  opt('jal', 'Jalapeños'),
  opt('onion', 'Onions'),
]);
const remove = group('g-rm', 'Would you like to remove anything?', [
  opt('no-onion', 'No Onions'),
  opt('no-tom', 'No Tomato'),
]);
const cheese = group('g-cheese', 'Would you like to add cheese?', [
  opt('am', 'American'),
  opt('ched', 'Cheddar'),
]);
const all = [meat, baconStyle, veg, remove, cheese];
const run = (q: string, selected: string[] = []) =>
  filterGroupsByQuery(all, q, (g) => g.name, (o) => o.name, new Set(selected));

describe('textMatchesQuery', () => {
  it('ignores case and accents', () => {
    expect(textMatchesQuery('Jalapeños', 'jalapenos')).toBe(true);
    expect(textMatchesQuery('Jalapenos', 'JALAPEÑO')).toBe(true);
  });
  it('tolerates one typo on longer words', () => {
    expect(textMatchesQuery('Jalapeños', 'halapeno')).toBe(true);
    expect(textMatchesQuery('Cheddar', 'chedar')).toBe(true);
  });
  it('needs every word', () => {
    expect(textMatchesQuery('Egg Whites', 'egg white')).toBe(true);
    expect(textMatchesQuery('Egg Whites', 'egg bacon')).toBe(false);
  });
  it('does not fuzz short words', () => {
    expect(textMatchesQuery('Ham', 'jam')).toBe(false);
  });
});

describe('filterGroupsByQuery', () => {
  it('returns the groups untouched for an empty query', () => {
    expect(run('   ')).toBe(all);
  });

  it('narrows each group to its matching options', () => {
    const out = run('onion');
    expect(out.map((g) => g.id)).toEqual(['g-veg', 'g-rm']);
    expect(out[0].options.map((o) => o.id)).toEqual(['onion']);
    expect(out[1].options.map((o) => o.id)).toEqual(['no-onion']);
  });

  it('finds the removal with "no onion"', () => {
    const out = run('no onion');
    expect(out.map((g) => g.id)).toEqual(['g-rm']);
  });

  it('keeps a whole group when its question matches', () => {
    const out = run('cheese');
    expect(out.map((g) => g.id)).toEqual(['g-cheese']);
    expect(out[0].options).toHaveLength(2);
  });

  it('shows the follow-up of a selected option that is on screen', () => {
    expect(run('bacon').map((g) => g.id)).toEqual(['g-meat', 'g-style']);
    // "bacon" also matches the style question's own title; with "ham" the
    // style group only comes along when bacon is both visible and picked.
    expect(run('ham', ['bacon']).map((g) => g.id)).toEqual(['g-meat']);
  });

  it('pulls in the follow-up when its parent is visible and selected', () => {
    const out = filterGroupsByQuery(
      [meat, baconStyle],
      'bac',
      () => '',
      (o) => o.name,
      new Set(['bacon']),
    );
    expect(out.map((g) => g.id)).toEqual(['g-meat', 'g-style']);
    expect(out[1].options).toHaveLength(2);
  });

  it('returns nothing when nothing matches', () => {
    expect(run('lobster')).toEqual([]);
  });
});
