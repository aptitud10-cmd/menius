import { describe, it, expect } from 'vitest';
import { linkedOptionState, linkedProductIds, type LinkedProductState } from '@/lib/linked-options';

const products = new Map<string, LinkedProductState>([
  ['lentil', { id: 'lentil', is_active: true, in_stock: true }],
  ['spinach', { id: 'spinach', is_active: true, in_stock: false }],
  ['minestrone', { id: 'minestrone', is_active: false, in_stock: true }],
]);

describe('linkedOptionState (las sopas de "Which soup?")', () => {
  it('una opción común no depende de nada', () => {
    expect(linkedOptionState(null, products)).toBe('ok');
    expect(linkedOptionState(undefined, products)).toBe('ok');
  });

  it('puesta hoy y con stock: se ofrece', () => {
    expect(linkedOptionState('lentil', products)).toBe('ok');
  });

  it('agotada hoy: se ve en gris', () => {
    expect(linkedOptionState('spinach', products)).toBe('sold_out');
  });

  it('no puesta hoy, o que la RLS no devolvió: no se ofrece', () => {
    expect(linkedOptionState('minestrone', products)).toBe('hidden');
    expect(linkedOptionState('borrada', products)).toBe('hidden');
  });
});

describe('linkedProductIds', () => {
  it('junta los ids sin repetir y salta las comunes', () => {
    expect(
      linkedProductIds([
        { linked_product_id: 'a' },
        { linked_product_id: null },
        {},
        { linked_product_id: 'a' },
        { linked_product_id: 'b' },
      ]),
    ).toEqual(['a', 'b']);
  });
});

describe('ticket de la sopa elegida', () => {
  it('"Soup" + "Which soup?" en línea → "Soup / Lentil"', async () => {
    const { buildModLines } = await import('@/lib/modifier-lines');
    const lines = buildModLines([
      {
        group: { id: 'g1', name: 'Soup or salad?', sort_order: 3, ticket_layout: 'line' },
        options: [{ id: 'soup', name: 'Soup', price_delta: 0 }],
        allOptions: ['Soup', 'Tossed Salad', 'Caesar Salad'],
      },
      {
        group: { id: 'g2', name: 'Which soup?', sort_order: 4, depends_on_option_id: 'soup', ticket_layout: 'inline' },
        options: [{ id: 'lentil', name: 'Lentil', price_delta: 0 }],
      },
    ]);
    expect(lines.map((l) => l.text)).toEqual(['Soup / Lentil']);
  });
});

describe('recargo visible solo en agregados opcionales (carrito/checkout)', () => {
  it('"elegí uno" obligatorio sin addon; opcional con addon', async () => {
    const { buildModLines } = await import('@/lib/modifier-lines');
    const lines = buildModLines([
      {
        group: { id: 'size', name: 'Which size?', sort_order: 0, is_required: true },
        options: [{ id: 'bowl', name: 'Bowl', price_delta: 1.7 }],
      },
      {
        group: { id: 'bread', name: 'Would you like bread?', sort_order: 1, is_required: false },
        options: [{ id: 'b', name: 'Bread', price_delta: 0.5 }],
      },
    ]);
    expect(lines.find((l) => l.text === 'Bowl')?.addon).toBeUndefined();
    expect(lines.find((l) => l.text === 'Bread')?.addon).toBe(true);
  });
});
