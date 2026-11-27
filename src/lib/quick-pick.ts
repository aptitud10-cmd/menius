import type { ModifierGroup, ModifierOption, ModifierSelection } from '@/types';
import { pruneHiddenSelections, visibleGroups } from '@/lib/conditional-modifiers';

/**
 * Elegir ahí mismo, desde el buscador de otro plato ("soda" en una burger → Sprite).
 *
 * Solo para productos chicos: una pregunta obligatoria, y las que cuelgan de ella
 * (Side of Bacon → Bacon → Crispy). Se pregunta de a una, y lo opcional del
 * producto queda como viene por defecto. Un plato con dos o más preguntas
 * propias (una burger, una cena) se abre entero después: meter todas sus
 * preguntas dentro de otro plato no se entiende.
 */
export type QuickPickStep =
  /** Hay que abrirlo entero (Choose after). */
  | { kind: 'full' }
  /** Falta esta pregunta; `options` = lo que se puede pedir ahora. */
  | { kind: 'ask'; group: ModifierGroup; options: ModifierOption[] }
  /** Todo contestado: listo para el carrito. */
  | { kind: 'done'; selections: ModifierSelection[] };

const isConditional = (g: ModifierGroup) =>
  (g.depends_on_option_ids?.filter(Boolean).length ?? 0) > 0 || !!g.depends_on_option_id;

const isSingle = (g: ModifierGroup) => g.selection_type === 'single' && g.min_select <= 1;

export function quickPickStep(
  groups: ModifierGroup[],
  picks: Record<string, ModifierOption[]>,
  isAvailable: (o: ModifierOption) => boolean = (o) => !o.sold_out,
): QuickPickStep {
  const topRequired = groups.filter((g) => g.is_required && !isConditional(g));
  if (topRequired.length > 1) return { kind: 'full' };

  // Lo opcional, como viene por defecto (si el dueño marcó algo); lo obligatorio se pregunta.
  const selections: Record<string, ModifierOption[]> = {};
  for (const g of groups) {
    if (g.is_required) continue;
    const defaults = g.options.filter((o) => o.is_default && isAvailable(o));
    if (defaults.length > 0) selections[g.id] = defaults;
  }
  for (const [groupId, opts] of Object.entries(picks)) selections[groupId] = opts;

  const visible = visibleGroups(groups, selections);
  const next = visible.find((g) => g.is_required && !(selections[g.id]?.length));
  if (next) {
    if (!isSingle(next)) return { kind: 'full' };
    const options = next.options.filter(isAvailable);
    if (options.length === 0) return { kind: 'full' };
    return { kind: 'ask', group: next, options };
  }

  const pruned = pruneHiddenSelections(groups, selections);
  return {
    kind: 'done',
    selections: visible
      .filter((g) => (pruned[g.id]?.length ?? 0) > 0)
      .map((g) => ({ group: g, selectedOptions: pruned[g.id] })),
  };
}
