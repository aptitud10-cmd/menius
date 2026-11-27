import { describe, it, expect } from 'vitest';
import { quickPickStep } from '@/lib/quick-pick';
import type { ModifierGroup, ModifierOption } from '@/types';

const opt = (id: string, extra: Partial<ModifierOption> = {}): ModifierOption => ({
  id,
  group_id: '',
  name: id,
  price_delta: 0,
  is_default: false,
  sort_order: 0,
  ...extra,
});

const group = (id: string, options: ModifierOption[], extra: Partial<ModifierGroup> = {}): ModifierGroup => ({
  id,
  product_id: 'p',
  name: id,
  selection_type: 'single',
  min_select: 1,
  max_select: 1,
  is_required: true,
  sort_order: 0,
  options: options.map((o) => ({ ...o, group_id: id })),
  ...extra,
} as ModifierGroup);

describe('quickPickStep — elegir ahí mismo desde el buscador', () => {
  const soda = group('soda', [opt('pepsi'), opt('sprite')]);

  it('una pregunta: la pregunta, y al contestarla queda lista', () => {
    const first = quickPickStep([soda], {});
    expect(first.kind).toBe('ask');
    if (first.kind === 'ask') expect(first.options.map((o) => o.id)).toEqual(['pepsi', 'sprite']);

    const done = quickPickStep([soda], { soda: [soda.options[1]] });
    expect(done).toEqual({ kind: 'done', selections: [{ group: soda, selectedOptions: [soda.options[1]] }] });
  });

  it('pregunta que cuelga de otra: bacon → cómo lo quiere', () => {
    const meat = group('meat', [opt('bacon'), opt('ham')]);
    const cook = group('cook', [opt('soft'), opt('crispy')], { depends_on_option_id: 'bacon' });
    const groups = [meat, cook];

    const afterBacon = quickPickStep(groups, { meat: [meat.options[0]] });
    expect(afterBacon.kind === 'ask' && afterBacon.group.id).toBe('cook');

    // Ham no tiene punto de cocción: listo con una sola respuesta.
    const ham = quickPickStep(groups, { meat: [meat.options[1]] });
    expect(ham.kind).toBe('done');

    const crispy = quickPickStep(groups, { meat: [meat.options[0]], cook: [cook.options[1]] });
    expect(crispy.kind === 'done' && crispy.selections.map((s) => s.group.id)).toEqual(['meat', 'cook']);
  });

  it('dos preguntas propias (una burger): se abre entera', () => {
    expect(quickPickStep([soda, group('size', [opt('s'), opt('l')])], {})).toEqual({ kind: 'full' });
  });

  it('elegir varias en una pregunta obligatoria: se abre entera', () => {
    const toppings = group('top', [opt('a'), opt('b')], { selection_type: 'multi', min_select: 2, max_select: 3 });
    expect(quickPickStep([toppings], {})).toEqual({ kind: 'full' });
  });

  it('lo opcional no se pregunta y va como viene por defecto', () => {
    const milk = group('milk', [opt('regular', { is_default: true }), opt('skim')], {
      is_required: false,
      min_select: 0,
    });
    const step = quickPickStep([soda, milk], { soda: [soda.options[0]] });
    expect(step.kind === 'done' && step.selections.map((s) => s.selectedOptions[0].id)).toEqual(['pepsi', 'regular']);
  });

  it('sin preguntas obligatorias: listo directo', () => {
    const extra = group('x', [opt('cheese')], { is_required: false, min_select: 0 });
    expect(quickPickStep([extra], {})).toEqual({ kind: 'done', selections: [] });
  });

  it('lo agotado no se ofrece; si no queda nada, se abre entera', () => {
    const s = group('soda', [opt('pepsi', { sold_out: true }), opt('sprite')]);
    const step = quickPickStep([s], {});
    expect(step.kind === 'ask' && step.options.map((o) => o.id)).toEqual(['sprite']);

    const none = group('soda', [opt('pepsi', { sold_out: true })]);
    expect(quickPickStep([none], {})).toEqual({ kind: 'full' });
  });
});
