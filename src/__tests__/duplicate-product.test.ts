import { describe, it, expect } from 'vitest';
import {
  planModifierCopy,
  remapDependency,
  suffixTranslatedNames,
  type SourceGroup,
  type SourceOption,
} from '@/lib/duplicate-product';

function opt(id: string, name: string, sort = 0, over: Partial<SourceOption> = {}): SourceOption {
  return {
    id,
    name,
    price_delta: 0,
    is_default: false,
    sort_order: sort,
    cost_price: null,
    translations: null,
    available_from: null,
    available_until: null,
    linked_product_id: null,
    image_url: null,
    ...over,
  };
}

function group(id: string, name: string, options: SourceOption[], over: Partial<SourceGroup> = {}): SourceGroup {
  return {
    id,
    name,
    selection_type: 'single',
    min_select: 1,
    max_select: 1,
    is_required: true,
    sort_order: 0,
    display_type: 'list',
    depends_on_option_id: null,
    depends_on_option_ids: null,
    translations: null,
    shared_origin_id: null,
    ticket_label: null,
    ticket_layout: 'line',
    modifier_options: options,
    ...over,
  };
}

function seqIds() {
  let n = 0;
  return () => `new-${++n}`;
}

// Burger shape: "Choice of Side" only exists for the Deluxe style.
const STYLE = group('g-style', 'Style', [opt('o-regular', 'Regular', 0), opt('o-deluxe', 'Deluxe', 1, { price_delta: 5 })]);
const SIDE = group('g-side', 'Choice of Side', [opt('o-fries', 'Fries', 0), opt('o-rings', 'Onion Rings', 1, { price_delta: 1.5 })], {
  sort_order: 1,
  depends_on_option_id: 'o-deluxe',
  depends_on_option_ids: ['o-deluxe'],
});

describe('remapDependency', () => {
  it('returns no dependency for an unconditional group', () => {
    expect(remapDependency({ depends_on_option_id: null, depends_on_option_ids: null }, new Map())).toEqual({
      depends_on_option_id: null,
      depends_on_option_ids: null,
    });
  });

  it('maps every "any of" option to the copy and mirrors the first one', () => {
    const map = new Map([['a', 'A'], ['b', 'B']]);
    expect(remapDependency({ depends_on_option_id: 'a', depends_on_option_ids: ['a', 'b'] }, map)).toEqual({
      depends_on_option_id: 'A',
      depends_on_option_ids: ['A', 'B'],
    });
  });

  it('upgrades a legacy single-id dependency to the list form', () => {
    const map = new Map([['a', 'A']]);
    expect(remapDependency({ depends_on_option_id: 'a', depends_on_option_ids: null }, map)).toEqual({
      depends_on_option_id: 'A',
      depends_on_option_ids: ['A'],
    });
  });

  it('keeps a stale id so the copied group stays as hidden as the original', () => {
    const map = new Map([['a', 'A']]);
    expect(remapDependency({ depends_on_option_id: 'gone', depends_on_option_ids: ['gone', 'a'] }, map)).toEqual({
      depends_on_option_id: 'gone',
      depends_on_option_ids: ['gone', 'A'],
    });
  });
});

describe('planModifierCopy', () => {
  it('points the conditional group at the copy option, never at the original', () => {
    const plan = planModifierCopy([SIDE, STYLE], 'prod-copy', seqIds());
    const style = plan.groups.find((g) => g.name === 'Style')!;
    const side = plan.groups.find((g) => g.name === 'Choice of Side')!;
    const deluxeCopy = plan.options.find((o) => o.name === 'Deluxe' && o.group_id === style.id)!;

    expect(side.depends_on_option_ids).toEqual([deluxeCopy.id]);
    expect(side.depends_on_option_id).toBe(deluxeCopy.id);
    const allOriginalIds = ['o-regular', 'o-deluxe', 'o-fries', 'o-rings'];
    expect(allOriginalIds).not.toContain(side.depends_on_option_id);
  });

  it('gives every row a fresh id under the new product and keeps order', () => {
    const plan = planModifierCopy([SIDE, STYLE], 'prod-copy', seqIds());
    expect(plan.groups.map((g) => g.name)).toEqual(['Style', 'Choice of Side']);
    expect(plan.groups.every((g) => g.product_id === 'prod-copy')).toBe(true);
    const ids = [...plan.groups.map((g) => g.id), ...plan.options.map((o) => o.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('new-'))).toBe(true);
    const groupIds = new Set(plan.groups.map((g) => g.id));
    expect(plan.options.every((o) => groupIds.has(o.group_id))).toBe(true);
  });

  it('copies option content (price, hours, image, linked dish) and group settings', () => {
    const g = group('g', 'Grits', [
      opt('o1', 'Grits', 0, {
        price_delta: 2.25,
        is_default: true,
        cost_price: 0.4,
        available_from: '05:30:00',
        available_until: '11:00:00',
        linked_product_id: 'p-grits',
        image_url: 'https://x/y.jpg',
        translations: { es: { name: 'Sémola', hint: 'tip' } },
      }),
    ], { display_type: 'grid', ticket_label: 'SIDE', ticket_layout: 'inline', translations: { es: { name: 'Acompañante' } } });
    const plan = planModifierCopy([g], 'p2', seqIds());
    expect(plan.groups[0]).toMatchObject({ display_type: 'grid', ticket_label: 'SIDE', ticket_layout: 'inline', translations: { es: { name: 'Acompañante' } } });
    expect(plan.options[0]).toMatchObject({
      price_delta: 2.25,
      is_default: true,
      cost_price: 0.4,
      available_from: '05:30:00',
      available_until: '11:00:00',
      linked_product_id: 'p-grits',
      image_url: 'https://x/y.jpg',
      translations: { es: { name: 'Sémola', hint: 'tip' } },
    });
  });

  it('keeps a shared group in its family and leaves standalone groups alone', () => {
    const linked = group('g-linked', 'Which soup?', [], { shared_origin_id: 'g-origin' });
    const origin = group('g-own-origin', 'Sauces', [], { sort_order: 1 });
    const alone = group('g-alone', 'Cook', [], { sort_order: 2 });
    const plan = planModifierCopy([linked, origin, alone], 'p2', seqIds(), new Set(['g-own-origin']));
    expect(plan.groups.map((g) => g.shared_origin_id)).toEqual(['g-origin', 'g-own-origin', null]);
  });

  it('keeps option positions so shared families stay paired', () => {
    const g = group('g', 'Sauces', [opt('a', 'A', 0), opt('c', 'C', 2), opt('b', 'B', 1)]);
    const plan = planModifierCopy([g], 'p2', seqIds());
    expect(plan.options.map((o) => [o.name, o.sort_order])).toEqual([['A', 0], ['B', 1], ['C', 2]]);
  });
});

describe('suffixTranslatedNames', () => {
  it('marks each translated name as a copy in its own language', () => {
    expect(suffixTranslatedNames({ en: { name: 'Burger', description: 'd' }, es: { name: 'Hamburguesa' } })).toEqual({
      en: { name: 'Burger (copy)', description: 'd' },
      es: { name: 'Hamburguesa (copia)' },
    });
  });

  it('leaves empty or missing translations untouched', () => {
    expect(suffixTranslatedNames(null)).toBeNull();
    expect(suffixTranslatedNames({ en: { name: '' } })).toEqual({ en: { name: '' } });
  });
});
