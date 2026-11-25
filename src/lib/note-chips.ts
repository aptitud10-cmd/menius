/**
 * Quick-note chips under "Special instructions": one tap writes a common
 * request ("Cut in half", "1 sugar") into the item's note. They are for the
 * occasional ask; anything diners pick often belongs in a real option, which
 * prices and prints in its own line.
 */

export interface NoteChip {
  en: string;
  es: string;
  /** Hidden when the dish has a group whose name contains one of these
   *  (case-insensitive): it already asks that question as an option. */
  hideIfGroups?: string[];
}

export interface NoteChipRule {
  /** Applies to dishes in these categories... */
  categoryIds?: string[];
  /** ...or to any dish with a group whose name contains this text. */
  whenGroup?: string;
  /** Dishes the rule matches but where the chips make no sense
   *  (e.g. "Light sauce" on a pasta that is only oil and garlic). */
  exceptProductIds?: string[];
  chips: NoteChip[];
}

interface GroupLike {
  name: string;
}

/** Chip texts for this dish in the diner's language (first matching rule wins). */
export function pickNoteChips(
  rules: NoteChipRule[] | undefined,
  categoryId: string | null | undefined,
  groups: GroupLike[],
  locale: string,
  productId?: string,
): string[] {
  if (!rules?.length) return [];
  const names = groups.map((g) => g.name.toLowerCase());
  const has = (text: string) => names.some((n) => n.includes(text.toLowerCase()));
  const rule = rules.find(
    (r) =>
      (r.whenGroup ? has(r.whenGroup) : false) ||
      (!!categoryId && !!r.categoryIds?.includes(categoryId)),
  );
  if (!rule || (productId && rule.exceptProductIds?.includes(productId))) return [];
  return rule.chips
    .filter((c) => !c.hideIfGroups?.some(has))
    .map((c) => (locale === "es" ? c.es : c.en));
}

const splitNote = (notes: string) =>
  notes.split(",").map((s) => s.trim()).filter(Boolean);

export function noteHasChip(notes: string, chip: string): boolean {
  const c = chip.toLowerCase();
  return splitNote(notes).some((s) => s.toLowerCase() === c);
}

/** Adds the chip to the note ("…, Cut in half") or takes it out if it is there. */
export function toggleNoteChip(notes: string, chip: string, max = 200): string {
  const parts = splitNote(notes);
  if (noteHasChip(notes, chip)) {
    return parts.filter((s) => s.toLowerCase() !== chip.toLowerCase()).join(", ");
  }
  const next = [...parts, chip].join(", ");
  return next.length > max ? notes : next;
}
