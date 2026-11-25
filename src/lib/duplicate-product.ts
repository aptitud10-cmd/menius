/**
 * Pure planning for "duplicate dish".
 *
 * The copy gets fresh ids for every modifier group and option up front, so a
 * conditional group ("Choice of Side" that only exists for "Deluxe") can point
 * at the NEW option of the copy in the same insert. Copying the dependency
 * verbatim would point at the original dish's option, and dropping it would
 * make the group mandatory on every order of the copy.
 */

export type SourceOption = {
  id: string;
  name: string;
  price_delta: number | null;
  is_default: boolean | null;
  sort_order: number | null;
  cost_price: number | null;
  translations: unknown;
  available_from: string | null;
  available_until: string | null;
  linked_product_id: string | null;
  image_url: string | null;
};

export type SourceGroup = {
  id: string;
  name: string;
  selection_type: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  sort_order: number | null;
  display_type: string | null;
  depends_on_option_id: string | null;
  depends_on_option_ids: string[] | null;
  translations: unknown;
  shared_origin_id: string | null;
  ticket_label: string | null;
  ticket_layout: string | null;
  modifier_options: SourceOption[] | null;
};

export type GroupInsert = {
  id: string;
  product_id: string;
  name: string;
  selection_type: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  sort_order: number;
  display_type: string;
  depends_on_option_id: string | null;
  depends_on_option_ids: string[] | null;
  translations: unknown;
  shared_origin_id: string | null;
  ticket_label: string | null;
  ticket_layout: string;
};

export type OptionInsert = {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  is_default: boolean;
  sort_order: number;
  cost_price: number | null;
  translations: unknown;
  available_from: string | null;
  available_until: string | null;
  linked_product_id: string | null;
  image_url: string | null;
};

/**
 * Maps a group's dependency onto the copy's option ids.
 *
 * Reads the list first and falls back to the legacy single id, then writes
 * both columns the way resolveDependency does (list = source of truth, single
 * id = first element). An id that is not an option of the source dish (stale)
 * is kept as is: the original group never shows for it either, so the copy
 * behaves exactly like the original.
 */
export function remapDependency(
  group: Pick<SourceGroup, 'depends_on_option_id' | 'depends_on_option_ids'>,
  optionIdMap: ReadonlyMap<string, string>,
): { depends_on_option_id: string | null; depends_on_option_ids: string[] | null } {
  const list = (group.depends_on_option_ids ?? []).filter(Boolean);
  const source = list.length > 0 ? list : group.depends_on_option_id ? [group.depends_on_option_id] : [];
  const ids = Array.from(new Set(source.map((id) => optionIdMap.get(id) ?? id)));
  return {
    depends_on_option_id: ids[0] ?? null,
    depends_on_option_ids: ids.length > 0 ? ids : null,
  };
}

/**
 * Rows to insert for the copy's modifier groups and options.
 *
 * `sharedOrigins` are the source groups that other dishes link to. A copied
 * group stays in the same shared family as its source (linked copy → same
 * origin; origin with siblings → the source itself), so later edits keep
 * reaching it. Option sort_order is kept as is because shared families pair
 * options by position.
 */
export function planModifierCopy(
  groups: SourceGroup[],
  newProductId: string,
  newId: () => string,
  sharedOrigins: ReadonlySet<string> = new Set(),
): { groups: GroupInsert[]; options: OptionInsert[] } {
  const sorted = [...groups].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const groupIdMap = new Map<string, string>();
  const optionIdMap = new Map<string, string>();
  for (const g of sorted) {
    groupIdMap.set(g.id, newId());
    for (const o of g.modifier_options ?? []) optionIdMap.set(o.id, newId());
  }

  const groupRows: GroupInsert[] = sorted.map((g) => {
    const origin = g.shared_origin_id ?? (sharedOrigins.has(g.id) ? g.id : null);
    return {
      id: groupIdMap.get(g.id) as string,
      product_id: newProductId,
      name: g.name,
      selection_type: g.selection_type,
      min_select: g.min_select,
      max_select: g.max_select,
      is_required: g.is_required,
      sort_order: g.sort_order ?? 0,
      display_type: g.display_type ?? 'list',
      ...remapDependency(g, optionIdMap),
      translations: g.translations ?? null,
      shared_origin_id: origin,
      ticket_label: g.ticket_label ?? null,
      ticket_layout: g.ticket_layout ?? 'line',
    };
  });

  const optionRows: OptionInsert[] = sorted.flatMap((g) =>
    [...(g.modifier_options ?? [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((o) => ({
        id: optionIdMap.get(o.id) as string,
        group_id: groupIdMap.get(g.id) as string,
        name: o.name,
        price_delta: Number(o.price_delta ?? 0),
        is_default: !!o.is_default,
        sort_order: o.sort_order ?? 0,
        cost_price: o.cost_price ?? null,
        translations: o.translations ?? null,
        available_from: o.available_from ?? null,
        available_until: o.available_until ?? null,
        linked_product_id: o.linked_product_id ?? null,
        image_url: o.image_url ?? null,
      })),
  );

  return { groups: groupRows, options: optionRows };
}

/** Suffix for the copy's name in each dashboard language. */
export const COPY_SUFFIX: Record<string, string> = { es: 'copia', en: 'copy' };

/**
 * Appends "(copy)"/"(copia)" to every translated name, so the copy is
 * distinguishable in each language, not only in the base one.
 */
export function suffixTranslatedNames(translations: unknown): unknown {
  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) return translations ?? null;
  const out: Record<string, unknown> = {};
  for (const [locale, value] of Object.entries(translations as Record<string, unknown>)) {
    if (value && typeof value === 'object' && typeof (value as { name?: unknown }).name === 'string' && (value as { name: string }).name.trim()) {
      const suffix = COPY_SUFFIX[locale] ?? COPY_SUFFIX.en;
      out[locale] = { ...(value as object), name: `${(value as { name: string }).name} (${suffix})` };
    } else {
      out[locale] = value;
    }
  }
  return out;
}
