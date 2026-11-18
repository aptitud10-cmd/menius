import type { ModifierGroup } from '@/types';

/**
 * How a modifier group is drawn in the item sheet, derived from its data so it
 * works for every restaurant without per-store settings (DoorDash does the
 * same: the format follows the group, not a setting).
 *
 * - `chips`: short options that flow and wrap (cooking temperature, cheeses,
 *   "No pickle", sauces). Two chips fit where one grid card did.
 * - `list`:  add-ons with a price, one row each with a checkbox and the price
 *   aligned right — the price is what the diner compares.
 * - `toggle`: a required either/or between the plain dish and a paid
 *   upgrade (Regular | Deluxe +$4.00) — one 52px segmented control with the
 *   upgrade's description on a line underneath, instead of two ~114px cards.
 * - `cards`: options carrying a description after an em dash ("Deluxe —
 *   lettuce, tomato & choice of side") that don't fit a toggle.
 */
export type GroupFormat = 'chips' | 'list' | 'cards' | 'toggle';

/** Longest label (before " — ") that still fits half a phone-width toggle. */
export const TOGGLE_MAX_LABEL = 16;

/** "Deluxe — lettuce, tomato & choice of side" → title + detail. */
export function splitOptionName(name: string): { title: string; detail: string | null } {
  const i = name.indexOf(' — ');
  if (i < 0) return { title: name, detail: null };
  return { title: name.slice(0, i).trim(), detail: name.slice(i + 3).trim() || null };
}

/** Required single choice of exactly two: one free, one with a surcharge. */
export function isUpgradeToggle(g: ModifierGroup): boolean {
  const options = g.options ?? [];
  if (g.selection_type !== 'single' || options.length !== 2) return false;
  if (!g.is_required && (g.min_select ?? 0) < 1) return false;
  const prices = options.map((o) => Number(o.price_delta));
  if (prices.filter((p) => p === 0).length !== 1 || prices.filter((p) => p > 0).length !== 1) return false;
  return options.every((o) => splitOptionName(o.name).title.length <= TOGGLE_MAX_LABEL);
}

/** Multi-select groups with this many priced options or fewer read as a list. */
export const LIST_MAX_OPTIONS = 4;

const hasDescription = (name: string) => name.includes(' — ');

export function groupFormat(g: ModifierGroup): GroupFormat {
  const options = g.options ?? [];
  if (isUpgradeToggle(g)) return 'toggle';
  if (options.some((o) => hasDescription(o.name))) return 'cards';
  if (g.display_type === 'list') return 'list';
  const allPriced = options.length > 0 && options.every((o) => Number(o.price_delta) !== 0);
  if (g.selection_type === 'multi' && allPriced && options.length <= LIST_MAX_OPTIONS) return 'list';
  // A lone optional add-on ("Extra cheese? +$1.50") is a checkbox, not a chip.
  if (isLoneAddOn(g)) return 'list';
  return 'chips';
}

/** Optional group with a single option: the question is the option. */
export function isLoneAddOn(g: ModifierGroup): boolean {
  return !g.is_required && (g.min_select ?? 0) === 0 && (g.options?.length ?? 0) === 1;
}

export interface GroupLayout {
  format: Map<string, GroupFormat>;
  /** host group id → lone add-on groups drawn as extra rows of its list */
  guests: Map<string, ModifierGroup[]>;
  /** groups drawn inside another group's list (render nothing themselves) */
  absorbed: Set<string>;
}

/**
 * Lone add-ons that follow an optional multi-select list join that list as
 * extra rows: Buccaneer's burger asked "Would you like lettuce & tomato?",
 * "…extra cheese?" and "…cheese on your fries?" as three blocks of ~190px,
 * each with one button, right after a list of add-ons. They stay separate
 * groups in the data — own rules, own selections — only the drawing merges.
 */
export function planGroupLayout(groups: ModifierGroup[]): GroupLayout {
  const format = new Map<string, GroupFormat>();
  const guests = new Map<string, ModifierGroup[]>();
  const absorbed = new Set<string>();
  let host: ModifierGroup | null = null;

  for (const g of groups) {
    const f = groupFormat(g);
    format.set(g.id, f);
    if (host && isLoneAddOn(g)) {
      guests.get(host.id)!.push(g);
      absorbed.add(g.id);
      continue;
    }
    const canHost = f === 'list' && g.selection_type === 'multi' && !g.is_required;
    host = canHost ? g : null;
    if (host) guests.set(host.id, []);
  }
  return { format, guests, absorbed };
}
