import type { Product } from '@/types';

/**
 * Whether a product is listed as a compact row instead of a photo card.
 *
 * Some products don't gain anything from a picture: a Pepsi, a Sprite, a bottled
 * beer. The customer already knows what those look like, so the photo carries no
 * information the name doesn't — and an AI-generated stand-in for one carries
 * worse than none. The research is blunt about it: a bad photo depresses orders
 * more than a missing photo does.
 *
 * Two independent triggers, deliberately:
 *   - no image_url  → nothing to show, so showing a grey cutlery icon in a
 *                     full-size card only reads as "the photo failed to load".
 *   - hide_image    → owner keeps the file but doesn't want it on the menu.
 *
 * Every surface that decides between photo and row must call this, or the menu
 * and the cart will disagree about the same product.
 */
export function showsAsRow(product: Pick<Product, 'image_url' | 'hide_image'>): boolean {
  return product.hide_image === true || !product.image_url;
}

/**
 * Splits a category's products into the ones that carry photos and the ones
 * listed as rows, preserving the owner's sort_order within each side.
 *
 * Cards come first and rows follow, because interleaving the two makes the grid
 * ragged: a full-height card next to a one-line row leaves a hole, and the eye
 * reads the hole as a rendering bug. Grouping them also does the thing photos are
 * for — when only the dishes have pictures, the dishes are what stands out.
 */
export function splitByDisplay<T extends Pick<Product, 'image_url' | 'hide_image'>>(
  products: T[],
): { cards: T[]; rows: T[] } {
  const cards: T[] = [];
  const rows: T[] = [];
  for (const p of products) {
    (showsAsRow(p) ? rows : cards).push(p);
  }
  return { cards, rows };
}
