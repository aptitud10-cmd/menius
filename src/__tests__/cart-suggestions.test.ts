import { describe, it, expect } from 'vitest';
import { cartSuggestions, wantedKinds, type ItemKind } from '@/lib/cart-suggestions';

interface P { id: string; kind: ItemKind; is_featured?: boolean; stock?: boolean }

const menu: P[] = [
  { id: 'burger', kind: 'main' },
  { id: 'pancakes', kind: 'main' },
  { id: 'oj', kind: 'drink' },
  { id: 'coffee', kind: 'drink' },
  { id: 'soda', kind: 'drink' },
  { id: 'lemonade', kind: 'drink' },
  { id: 'fries', kind: 'side' },
  { id: 'bacon', kind: 'side' },
  { id: 'cheesecake', kind: 'dessert' },
];
const pairings = new Map<string, string[]>([
  ['burger', ['soda', 'fries', 'lemonade']],
  ['pancakes', ['coffee', 'oj']],
]);
const run = (cart: string[], extra: Partial<Parameters<typeof cartSuggestions<P>>[0]> = {}) =>
  cartSuggestions<P>({
    cartProductIds: cart,
    products: menu,
    kindOf: (p) => p.kind,
    pairings,
    isAllowed: (p) => p.stock !== false,
    ...extra,
  }).map((p) => p.id);

describe('wantedKinds', () => {
  it('con un plato fuerte: bebida, side, postre; nunca otro plato', () => {
    expect(wantedKinds(new Set<ItemKind>(['main']))).toEqual(['drink', 'side', 'dessert']);
  });
  it('lo que ya está en el carrito no se vuelve a ofrecer', () => {
    expect(wantedKinds(new Set<ItemKind>(['main', 'drink']))).toEqual(['side', 'dessert']);
    expect(wantedKinds(new Set<ItemKind>(['main', 'drink', 'side', 'dessert']))).toEqual([]);
  });
  it('solo una bebida: lo natural es un plato', () => {
    expect(wantedKinds(new Set<ItemKind>(['drink']))).toEqual(['dessert', 'main']);
  });
  it('carrito vacío: nada', () => {
    expect(wantedKinds(new Set())).toEqual([]);
  });
});

describe('cartSuggestions', () => {
  it('hamburguesa: primero las bebidas de sus pairings, después fries y postre', () => {
    expect(run(['burger'])).toEqual(['soda', 'lemonade', 'fries', 'cheesecake']);
  });

  it('con bebida en el carrito ya no ofrece bebidas', () => {
    const r = run(['burger', 'soda']);
    expect(r).not.toContain('lemonade');
    expect(r[0]).toBe('fries');
  });

  it('el plato agregado último manda en el orden de sus pairings', () => {
    expect(run(['burger', 'pancakes']).slice(0, 2)).toEqual(['coffee', 'oj']);
  });

  it('nunca ofrece otro plato fuerte ni algo que ya está en el carrito', () => {
    const r = run(['burger']);
    expect(r).not.toContain('pancakes');
    expect(r).not.toContain('burger');
  });

  it('sin pairings completa con el menú, respetando stock', () => {
    const r = run(['pancakes'], {
      pairings: new Map(),
      products: menu.map((p) => (p.id === 'oj' ? { ...p, stock: false } : p)),
    });
    expect(r[0]).toBe('coffee');
    expect(r).not.toContain('oj');
  });

  it('carrito completo o vacío: nada', () => {
    expect(run([])).toEqual([]);
    expect(run(['burger', 'soda', 'fries', 'cheesecake'])).toEqual([]);
  });

  it('los lugares que sobran se llenan solo con pairings, no con el resto del menú', () => {
    // burger + soda: faltan side y postre → fries (pairing), cheesecake; sobra 1 lugar y
    // bacon (side del menú, sin pairing) no entra.
    expect(run(['burger', 'soda'])).toEqual(['fries', 'cheesecake']);
  });

  it('respeta el límite', () => {
    expect(run(['burger'], { limit: 2 })).toHaveLength(2);
  });
});
