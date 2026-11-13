import { describe, it, expect } from 'vitest';
import { rebuildSelections, toSavedModifiers } from '@/lib/reorder';
import type { ModifierGroup, ModifierOption } from '@/types';

const opt = (id: string, price = 0, extra: Partial<ModifierOption> = {}): ModifierOption =>
  ({ id, name: id, price_delta: price, is_default: false, sort_order: 0, ...extra }) as unknown as ModifierOption;

const group = (id: string, options: ModifierOption[], extra: Partial<ModifierGroup> = {}): ModifierGroup =>
  ({
    id,
    name: id,
    selection_type: 'single',
    is_required: false,
    min_select: 0,
    max_select: 1,
    options,
    depends_on_option_id: null,
    depends_on_option_ids: null,
    ...extra,
  }) as unknown as ModifierGroup;

const eggs = group('eggs', [opt('scrambled'), opt('over-easy')], { is_required: true });
const meat = group('meat', [opt('bacon', 2), opt('ham', 2)], { max_select: 2, selection_type: 'multi' });
const baconStyle = group('bacon-style', [opt('regular'), opt('crispy')], {
  is_required: true,
  depends_on_option_id: 'bacon',
  depends_on_option_ids: ['bacon'],
});
const side = group('side', [opt('home-fries'), opt('grits', 0, { available_from: '05:30', available_until: '11:00' })], {
  is_required: true,
});
const groups = [eggs, meat, baconStyle, side];

describe('rebuildSelections', () => {
  it('repeats the same choices with today’s options', () => {
    const out = rebuildSelections(groups, [
      { groupId: 'eggs', optionIds: ['scrambled'] },
      { groupId: 'meat', optionIds: ['bacon'] },
      { groupId: 'bacon-style', optionIds: ['crispy'] },
      { groupId: 'side', optionIds: ['home-fries'] },
    ]);
    expect(out?.map((s) => [s.group.id, s.selectedOptions.map((o) => o.id)])).toEqual([
      ['eggs', ['scrambled']],
      ['meat', ['bacon']],
      ['bacon-style', ['crispy']],
      ['side', ['home-fries']],
    ]);
    expect(out?.[1].selectedOptions[0].price_delta).toBe(2);
  });

  it('gives up when a chosen option no longer exists', () => {
    expect(
      rebuildSelections(groups, [
        { groupId: 'eggs', optionIds: ['poached'] },
        { groupId: 'side', optionIds: ['home-fries'] },
      ]),
    ).toBeNull();
  });

  it('gives up when a chosen option is outside its hours', () => {
    const closed = (o: ModifierOption) => o.id !== 'grits';
    expect(
      rebuildSelections(
        groups,
        [
          { groupId: 'eggs', optionIds: ['scrambled'] },
          { groupId: 'side', optionIds: ['grits'] },
        ],
        closed,
      ),
    ).toBeNull();
  });

  it('gives up when the dish gained a required question', () => {
    expect(rebuildSelections(groups, [{ groupId: 'eggs', optionIds: ['scrambled'] }])).toBeNull();
  });

  it('asks for the follow-up only while its parent is chosen', () => {
    // Bacon picked but its required style missing → choose again.
    expect(
      rebuildSelections(groups, [
        { groupId: 'eggs', optionIds: ['scrambled'] },
        { groupId: 'meat', optionIds: ['bacon'] },
        { groupId: 'side', optionIds: ['home-fries'] },
      ]),
    ).toBeNull();
    // Ham picked: the bacon style question isn't there at all.
    expect(
      rebuildSelections(groups, [
        { groupId: 'eggs', optionIds: ['scrambled'] },
        { groupId: 'meat', optionIds: ['ham'] },
        { groupId: 'side', optionIds: ['home-fries'] },
      ]),
    ).not.toBeNull();
  });

  it('gives up when a group was deleted', () => {
    expect(
      rebuildSelections(groups, [
        { groupId: 'eggs', optionIds: ['scrambled'] },
        { groupId: 'side', optionIds: ['home-fries'] },
        { groupId: 'gone', optionIds: ['x'] },
      ]),
    ).toBeNull();
  });
});

describe('toSavedModifiers', () => {
  it('keeps group and option ids, skipping legacy pseudo-groups', () => {
    expect(
      toSavedModifiers([
        { group: eggs, selectedOptions: [eggs.options[0]] },
        { group: { ...eggs, id: '__legacy_variants' }, selectedOptions: [eggs.options[1]] },
        { group: meat, selectedOptions: [] },
      ]),
    ).toEqual([{ groupId: 'eggs', optionIds: ['scrambled'] }]);
  });
});
