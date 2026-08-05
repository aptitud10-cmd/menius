import { describe, it, expect } from 'vitest';
import {
  visibleGroups,
  pruneHiddenSelections,
  selectedOptionIds,
} from '@/lib/conditional-modifiers';
import type { ModifierGroup, ModifierOption } from '@/types';

function opt(id: string, name: string, delta = 0): ModifierOption {
  return { id, group_id: '', name, price_delta: delta, is_default: false, sort_order: 0 };
}

function group(
  id: string,
  name: string,
  options: ModifierOption[],
  over: Partial<ModifierGroup> = {},
): ModifierGroup {
  return {
    id,
    product_id: 'burger',
    name,
    selection_type: 'single',
    min_select: 1,
    max_select: 1,
    is_required: true,
    sort_order: 0,
    options,
    ...over,
  };
}

// Buccaneer's actual shape: Style drives whether Choice of Side exists.
const REGULAR = opt('o-regular', 'Regular');
const DELUXE = opt('o-deluxe', 'Deluxe (w/ Side & Coleslaw)', 5);
const FRIES = opt('o-fries', 'French Fries');
const ONION = opt('o-onion', 'Onion Rings', 1.5);

const STYLE = group('g-style', 'Style', [REGULAR, DELUXE]);
const SIDE = group('g-side', 'Choice of Side', [FRIES, ONION], {
  depends_on_option_id: 'o-deluxe',
});
const TEMP = group('g-temp', 'Cooking Temperature', [opt('o-med', 'Medium')]);

describe('groups without dependencies', () => {
  it('are always visible', () => {
    const out = visibleGroups([STYLE, TEMP], {});
    expect(out.map((g) => g.id)).toEqual(['g-style', 'g-temp']);
  });
});

describe('visibleGroups', () => {
  it('hides the dependent group when the option is not selected', () => {
    const out = visibleGroups([STYLE, SIDE], { 'g-style': [REGULAR] });
    expect(out.map((g) => g.id)).toEqual(['g-style']);
  });

  it('shows the dependent group when the option is selected', () => {
    const out = visibleGroups([STYLE, SIDE], { 'g-style': [DELUXE] });
    expect(out.map((g) => g.id)).toEqual(['g-style', 'g-side']);
  });

  it('hides it when nothing is selected yet', () => {
    expect(visibleGroups([STYLE, SIDE], {}).map((g) => g.id)).toEqual(['g-style']);
  });

  it('collapses a whole chain when the first link is unselected', () => {
    // Side depends on Deluxe; Sauce depends on a Side option.
    const SAUCE = group('g-sauce', 'Sauce', [opt('o-ketchup', 'Ketchup')], {
      depends_on_option_id: 'o-onion',
    });
    const selections = { 'g-style': [REGULAR], 'g-side': [ONION] };
    // Onion Rings is still "selected" in stale state, but its own group is
    // hidden — Sauce must go with it.
    const out = visibleGroups([STYLE, SIDE, SAUCE], selections);
    expect(out.map((g) => g.id)).toEqual(['g-style']);
  });
});

describe('pruneHiddenSelections', () => {
  it('drops the side once the customer switches back to Regular', () => {
    // Regression: switching Deluxe → Regular kept charging the +$1.50 onion
    // rings, because the group vanished from the UI but not from state.
    const stale = { 'g-style': [REGULAR], 'g-side': [ONION] };
    const pruned = pruneHiddenSelections([STYLE, SIDE], stale);
    expect(pruned['g-side']).toBeUndefined();
    expect(pruned['g-style']).toEqual([REGULAR]);
  });

  it('keeps the side while Deluxe is selected', () => {
    const sel = { 'g-style': [DELUXE], 'g-side': [ONION] };
    expect(pruneHiddenSelections([STYLE, SIDE], sel)['g-side']).toEqual([ONION]);
  });

  it('never drops legacy pseudo-groups', () => {
    // __legacy_variants / __legacy_extras aren't in `groups` and are never
    // conditional; dropping them would silently lose the variant surcharge.
    const sel = {
      'g-style': [REGULAR],
      __legacy_variants: [opt('v1', 'Bottle', 20)],
    };
    const pruned = pruneHiddenSelections([STYLE, SIDE], sel);
    expect(pruned.__legacy_variants).toBeDefined();
  });
});

describe('selectedOptionIds', () => {
  it('flattens every selected option across groups', () => {
    const ids = selectedOptionIds({ 'g-style': [DELUXE], 'g-side': [FRIES, ONION] });
    expect(ids).toEqual(new Set(['o-deluxe', 'o-fries', 'o-onion']));
  });
});
