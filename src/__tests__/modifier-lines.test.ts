import { describe, it, expect } from 'vitest';
import {
  buildModLines, renderTicketLabel, orderItemModLines, linesTotal, ticketModifierStrings, withTitle,
  type LineSelection,
} from '@/lib/modifier-lines';

const g = (id: string, sort: number, extra: Partial<LineSelection['group']> = {}) =>
  ({ id, name: id, sort_order: sort, ...extra });
const o = (id: string, price = 0) => ({ id, name: id, price_delta: price });

describe('renderTicketLabel', () => {
  it('reemplaza {option} y sin plantilla deja el nombre', () => {
    expect(renderTicketLabel('with {option} cheese', 'Swiss')).toBe('with Swiss cheese');
    expect(renderTicketLabel(null, 'Over Hard')).toBe('Over Hard');
    expect(renderTicketLabel('  ', 'Rye')).toBe('Rye');
    expect(renderTicketLabel('Side', 'Bacon')).toBe('Side Bacon');
  });
});

describe('buildModLines — el pedido de Pedro (Two Eggs, Any Style)', () => {
  const lines = buildModLines([
    // desordenado a propósito: manda sort_order, no el orden en que llegan
    { group: g('Side Bacon Style', 81, { depends_on_option_id: 'Bacon', ticket_layout: 'inline' }), options: [o('Crispy')] },
    { group: g('Side of Meat', 80, { ticket_label: 'Side {option}' }), options: [o('Bacon', 7.95), o('Sausage', 7.95)] },
    { group: g('Side Sausage Style', 82, { depends_on_option_id: 'Sausage', ticket_layout: 'inline' }), options: [o('Split')] },
    { group: g('Egg Style', 0, { ticket_label: 'Eggs: {option}' }), options: [o('Over Hard')] },
    { group: g('Cheese on Eggs', 1, { ticket_label: 'with {option} cheese', ticket_layout: 'indent' }), options: [o('Swiss', 1.5)] },
    { group: g('Potatoes or Side', 3), options: [o('Sweet Potato Fries', 1.5)] },
    { group: g('Cheese on Potatoes', 4, { ticket_label: 'with {option} cheese', ticket_layout: 'indent' }), options: [o('Mozzarella', 1.5)] },
  ]);

  it('una línea por cosa, en orden, con sangría y el punto pegado a la carne', () => {
    expect(lines).toEqual([
      { text: 'Eggs: Over Hard', price: 0, indent: false },
      { text: 'with Swiss cheese', price: 1.5, indent: true },
      { text: 'Sweet Potato Fries', price: 1.5, indent: false },
      { text: 'with Mozzarella cheese', price: 1.5, indent: true },
      { text: 'Side Bacon / Crispy', price: 7.95, indent: false },
      { text: 'Side Sausage / Split', price: 7.95, indent: false },
    ]);
  });

  it('la suma de las líneas es lo que se cobra por las opciones', () => {
    expect(linesTotal(lines)).toBe(20.4);
  });
});

describe('buildModLines — condicionales', () => {
  it('un grupo condicional va con sangría debajo de la opción que lo abre (cena: Potato & Vegetable)', () => {
    const lines = buildModLines([
      { group: g('Served With', 4), options: [o('Potato & Vegetable')] },
      { group: g('Potato', 5, { depends_on_option_id: 'Potato & Vegetable' }), options: [o('Mashed Potatoes')] },
      { group: g('Vegetable', 6, { depends_on_option_id: 'Potato & Vegetable' }), options: [o('Broccoli')] },
      { group: g('Soup or Salad', 3), options: [o('Caesar Salad')] },
    ]);
    expect(lines.map((l) => `${l.indent ? '  ' : ''}${l.text}`)).toEqual([
      'Caesar Salad', 'Potato & Vegetable', '  Mashed Potatoes', '  Broccoli',
    ]);
  });

  it('un condicional sin padre no se pierde', () => {
    const lines = buildModLines([
      { group: g('Bacon Style', 1, { depends_on_option_id: 'missing', ticket_layout: 'inline' }), options: [o('Crispy')] },
    ]);
    expect(lines).toEqual([{ text: 'Crispy', price: 0, indent: false }]);
  });
});

describe('Style al título (Pedro: "Cheeseburger Deluxe", "Cheeseburger Regular")', () => {
  const style = g('Style', 0, { ticket_layout: 'inline' });
  const deluxe = { id: 'Deluxe', name: 'Deluxe — lettuce, tomato & choice of side', price_delta: 4 };

  it('Deluxe se pega al nombre, suma su precio al plato y su side queda como línea', () => {
    const lines = buildModLines([
      { group: g('Cooking Temperature', 2), options: [o('Medium')] },
      { group: style, options: [deluxe] },
      { group: g('Choice of Side', 1, { depends_on_option_id: 'Deluxe' }), options: [o('French Fries')] },
    ]);
    const t = withTitle('Cheeseburger', lines);
    expect(t.name).toBe('Cheeseburger Deluxe');
    expect(t.price).toBe(4);
    expect(t.lines).toEqual([
      { text: 'French Fries', price: 0, indent: false },
      { text: 'Medium', price: 0, indent: false },
    ]);
  });

  it('Regular también va al título', () => {
    const t = withTitle('Cheeseburger', buildModLines([{ group: style, options: [o('Regular')] }]));
    expect(t).toEqual({ name: 'Cheeseburger Regular', lines: [], price: 0 });
  });

  it('la foto del pedido conserva la marca de título', () => {
    expect(withTitle('Cheeseburger', orderItemModLines({ modifier_lines: [{ text: 'Deluxe', price: 4, indent: false, title: true }] })).name)
      .toBe('Cheeseburger Deluxe');
  });
});

describe('orderItemModLines', () => {
  it('usa la foto del pedido si existe', () => {
    expect(orderItemModLines({ modifier_lines: [{ text: 'Side Bacon / Crispy', price: 7.95, indent: false }] }))
      .toEqual([{ text: 'Side Bacon / Crispy', price: 7.95, indent: false }]);
  });
  it('pedidos viejos: el nombre de la opción con su precio', () => {
    expect(orderItemModLines({ modifier_lines: null, order_item_modifiers: [{ group_name: 'Toast', option_name: 'Rye', price_delta: 0 }] }))
      .toEqual([{ text: 'Rye', price: 0, indent: false }]);
  });
});

describe('ticketModifierStrings', () => {
  it('texto\\tprecio, con sangría y sin precio cuando es $0', () => {
    expect(ticketModifierStrings(
      [{ text: 'Eggs: Over Hard', price: 0, indent: false }, { text: 'with Swiss cheese', price: 1.5, indent: true }],
      (n) => `$${n.toFixed(2)}`,
    )).toEqual(['Eggs: Over Hard', '  with Swiss cheese\t$1.50']);
  });
});
