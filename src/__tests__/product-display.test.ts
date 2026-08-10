import { describe, it, expect } from 'vitest';
import { showsAsRow, splitByDisplay } from '@/lib/product-display';

const p = (over: Partial<{ id: string; image_url: string | null; hide_image: boolean }>) =>
  ({ id: 'x', image_url: null, ...over }) as any;

describe('showsAsRow', () => {
  it('rows a product with no image', () => {
    expect(showsAsRow(p({ image_url: null }))).toBe(true);
  });

  it('treats an empty image_url as no image', () => {
    // An empty string is truthy-adjacent enough to slip through a naive check and
    // would render <Image src=""> — a broken image next to real photos.
    expect(showsAsRow(p({ image_url: '' }))).toBe(true);
  });

  it('cards a product with an image', () => {
    expect(showsAsRow(p({ image_url: 'https://x/a.jpg' }))).toBe(false);
  });

  it('rows a product whose owner hid the photo, keeping the file', () => {
    expect(showsAsRow(p({ image_url: 'https://x/a.jpg', hide_image: true }))).toBe(true);
  });

  it('cards when hide_image is explicitly false', () => {
    expect(showsAsRow(p({ image_url: 'https://x/a.jpg', hide_image: false }))).toBe(false);
  });

  it('cards when hide_image is missing on an older row', () => {
    // Products fetched before the column existed arrive without the field.
    expect(showsAsRow({ image_url: 'https://x/a.jpg' } as any)).toBe(false);
  });
});

describe('splitByDisplay', () => {
  it('separates cards from rows', () => {
    const { cards, rows } = splitByDisplay([
      p({ id: 'burger', image_url: 'https://x/b.jpg' }),
      p({ id: 'pepsi' }),
      p({ id: 'fries', image_url: 'https://x/f.jpg' }),
      p({ id: 'sprite' }),
    ]);
    expect(cards.map((c) => c.id)).toEqual(['burger', 'fries']);
    expect(rows.map((r) => r.id)).toEqual(['pepsi', 'sprite']);
  });

  it('preserves the owner sort order within each side', () => {
    // The split must be stable: reordering inside a block would silently
    // override the sort_order the restaurant set in the dashboard.
    const { cards, rows } = splitByDisplay([
      p({ id: 'c1', image_url: 'https://x/1.jpg' }),
      p({ id: 'r1' }),
      p({ id: 'c2', image_url: 'https://x/2.jpg' }),
      p({ id: 'r2' }),
      p({ id: 'c3', image_url: 'https://x/3.jpg' }),
    ]);
    expect(cards.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
    expect(rows.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('handles a category where nothing has a photo', () => {
    const { cards, rows } = splitByDisplay([p({ id: 'corona' }), p({ id: 'heineken' })]);
    expect(cards).toEqual([]);
    expect(rows).toHaveLength(2);
  });

  it('handles a category where everything has a photo', () => {
    const { cards, rows } = splitByDisplay([
      p({ id: 'a', image_url: 'https://x/a.jpg' }),
      p({ id: 'b', image_url: 'https://x/b.jpg' }),
    ]);
    expect(cards).toHaveLength(2);
    expect(rows).toEqual([]);
  });

  it('handles an empty list', () => {
    expect(splitByDisplay([])).toEqual({ cards: [], rows: [] });
  });
});
