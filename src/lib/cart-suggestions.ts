/**
 * "Complete your order": what to offer next, looking at the WHOLE cart.
 *
 * Rules (Pedro, Buccaneer 2026-11-24 — "depende de lo que se vea en el carrito"):
 *  - a kind already in the cart is not offered again (a drink in the cart → no more drinks);
 *  - with a main in the cart: drink first, then a side, then dessert; never another main;
 *  - the restaurant's own pairings of the dishes in the cart go first (most recent dish first),
 *    the menu order of each wanted kind fills what is left.
 * Plain rules on purpose: predictable, free per order, and the owner can steer them with pairings.
 */

export type ItemKind = 'drink' | 'dessert' | 'side' | 'main';

export interface SuggestableProduct {
  id: string;
  is_featured?: boolean | null;
}

export interface CartSuggestionsInput<P extends SuggestableProduct> {
  /** Product ids in the cart, in the order they were added. */
  cartProductIds: string[];
  /** Every product on the menu (live, in menu order). */
  products: P[];
  /** Kind of a product (by its category). */
  kindOf: (p: P) => ItemKind;
  /** Owner pairings: product id → paired ids, best first. */
  pairings: Map<string, string[]>;
  /** Stock, time-of-day and similar filters. */
  isAllowed: (p: P) => boolean;
  limit?: number;
}

/** Kinds worth offering for a cart, best first. */
export function wantedKinds(cartKinds: Set<ItemKind>): ItemKind[] {
  if (cartKinds.size === 0) return [];
  const hasMain = cartKinds.has('main');
  const out: ItemKind[] = [];
  if (!cartKinds.has('drink')) out.push('drink');
  if (hasMain && !cartKinds.has('side')) out.push('side');
  if (!cartKinds.has('dessert')) out.push('dessert');
  // Only drinks / desserts / sides in the cart: a main is the natural next step.
  if (!hasMain) out.push('main');
  return out;
}

export function cartSuggestions<P extends SuggestableProduct>({
  cartProductIds,
  products,
  kindOf,
  pairings,
  isAllowed,
  limit = 4,
}: CartSuggestionsInput<P>): P[] {
  if (cartProductIds.length === 0) return [];

  const byId = new Map(products.map((p) => [p.id, p]));
  const inCart = new Set(cartProductIds);
  const cartKinds = new Set<ItemKind>();
  for (const id of cartProductIds) {
    const p = byId.get(id);
    if (p) cartKinds.add(kindOf(p));
  }
  const wanted = wantedKinds(cartKinds);
  if (wanted.length === 0) return [];

  const eligible = (p: P | undefined): p is P =>
    !!p && !inCart.has(p.id) && wanted.includes(kindOf(p)) && isAllowed(p);

  // One queue per wanted kind: pairings first (most recent dish first), then menu order.
  const queues = new Map<ItemKind, P[]>(wanted.map((k) => [k, []]));
  const queued = new Set<string>();
  const paired = new Set<string>();
  const push = (p: P) => {
    if (queued.has(p.id)) return;
    queued.add(p.id);
    queues.get(kindOf(p))?.push(p);
  };

  for (const id of [...cartProductIds].reverse()) {
    for (const pairedId of pairings.get(id) ?? []) {
      const p = byId.get(pairedId);
      if (eligible(p)) {
        paired.add(p.id);
        push(p);
      }
    }
  }
  const byFeatured = (a: P, b: P) => Number(!!b.is_featured) - Number(!!a.is_featured);
  for (const p of products.filter(eligible).sort(byFeatured)) push(p);

  // One of each missing kind first (best: pairing, else menu order). Every extra
  // slot comes only from the owner's pairings — filling them from menu order put a
  // $19.95 appetizer sampler next to a sandwich and a soda. Shown grouped by kind,
  // most-missing kind first (a burger: soda, lemonade, fries, dessert).
  const picks = new Map<ItemKind, P[]>(wanted.map((k) => [k, []]));
  let count = 0;
  const take = (k: ItemKind, onlyPaired: boolean): boolean => {
    const q = queues.get(k) ?? [];
    const i = onlyPaired ? q.findIndex((p) => paired.has(p.id)) : q.length > 0 ? 0 : -1;
    if (i === -1 || count >= limit) return false;
    picks.get(k)?.push(q.splice(i, 1)[0]);
    count++;
    return true;
  };
  for (const k of wanted) take(k, false);
  let more = true;
  while (more && count < limit) {
    more = false;
    for (const k of wanted) if (take(k, true)) more = true;
  }
  return wanted.flatMap((k) => picks.get(k) ?? []);
}
