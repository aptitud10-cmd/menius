import { describe, it, expect } from 'vitest';
import {
  buildModLines, renderTicketLabel, orderItemModLines, linesTotal, ticketModifierStrings, withTitle, customerItemLines, nameWithChoice,
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

  it('cadena de dos niveles (Deluxe → side → queso) no repite el queso (ORD-261118-007)', () => {
    const lines = buildModLines([
      { group: g('Style', 0, { ticket_layout: 'inline' }), options: [o('Deluxe', 4)] },
      { group: g('Side', 1, { depends_on_option_id: 'Deluxe' }), options: [o('French Fries')] },
      { group: g('Cheese on Fries', 2, { depends_on_option_id: 'French Fries', ticket_layout: 'indent' }), options: [o('Cheese on Fries', 1.5)] },
      { group: g('Cooking', 3), options: [o('Medium Rare')] },
    ]);
    expect(lines.filter((l) => l.text === 'Cheese on Fries')).toHaveLength(1);
    expect(linesTotal(lines)).toBe(5.5);
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

describe('customerItemLines (seguimiento del cliente)', () => {
  it('nombre con el estilo y líneas sin la marca de título', () => {
    expect(customerItemLines({
      product: { name: 'Cheeseburger' },
      modifier_lines: [{ text: 'Deluxe', price: 4, indent: false, title: true }, { text: 'Waffle Fries', price: 1.5, indent: false }],
    })).toEqual({ display_name: 'Cheeseburger Deluxe', lines: [{ text: 'Waffle Fries', price: 1.5, indent: false }] });
  });
});

describe('buildModLines — dependencia "cualquiera de estas"', () => {
  it('Cheese on Potatoes va debajo de la papa elegida, aunque no sea la primera de la lista', () => {
    const lines = buildModLines([
      { group: g('Potatoes or Side', 3), options: [o('French Fries')] },
      {
        group: g('Cheese on Potatoes', 4, {
          depends_on_option_id: 'Home Fries',
          depends_on_option_ids: ['Home Fries', 'French Fries'],
          ticket_label: 'with {option} cheese',
          ticket_layout: 'indent',
        }),
        options: [o('Swiss', 1.5)],
      },
      { group: g('Side of Meat', 80, { ticket_label: 'Side {option}' }), options: [o('Canadian Bacon', 8.45)] },
      {
        group: g('Side Canadian Bacon Style', 83, { depends_on_option_id: 'Canadian Bacon', ticket_layout: 'inline' }),
        options: [o('Crispy')],
      },
    ]);
    expect(lines).toEqual([
      { text: 'French Fries', price: 0, indent: false },
      { text: 'with Swiss cheese', price: 1.5, indent: true },
      { text: 'Side Canadian Bacon / Crispy', price: 8.45, indent: false },
    ]);
  });
});

// Pedro 2026-11-20: "Pastrami or Corned Beef Omelette" + Pastrami salía con "Pastrami" chico
// debajo; el plato tiene que llamarse por lo que se pidió. Los 10 casos reales de Buccaneer.
describe('nameWithChoice — el plato se llama por la alternativa elegida', () => {
  const cases: [string, string, string[], string][] = [
    ['Pastrami or Corned Beef Omelette', 'Pastrami', ['Pastrami', 'Corned Beef'], 'Pastrami Omelette'],
    ['Pastrami or Corned Beef Omelette', 'Corned Beef', ['Pastrami', 'Corned Beef'], 'Corned Beef Omelette'],
    ['Corned Beef or Pastrami Sandwich', 'Pastrami', ['Corned Beef', 'Pastrami'], 'Pastrami Sandwich'],
    ['Ham, Bacon or Sausage Omelette', 'Bacon', ['Ham', 'Bacon', 'Sausage'], 'Bacon Omelette'],
    ['Cereal with Seasonal Berries or Fruit Salad', 'Fruit Salad', ['Seasonal Berries', 'Fruit Salad'], 'Cereal with Fruit Salad'],
    ['Iced Coffee or Iced Tea', 'Iced Tea', ['Iced Coffee', 'Iced Tea'], 'Iced Tea'],
    ['Danish Pastry or Apple Turnover', 'Apple Turnover', ['Danish Pastry', 'Apple Turnover'], 'Apple Turnover'],
    ['Sundae with Nuts or Fruit', 'Fruit', ['Nuts', 'Fruit'], 'Sundae with Fruit'],
    ['Tomato or V8 Juice', 'Tomato Juice', ['Tomato Juice', 'V8 Juice'], 'Tomato Juice'],
    ['Tomato or V8 Juice', 'V8 Juice', ['Tomato Juice', 'V8 Juice'], 'V8 Juice'],
    ['Bacon, Sausage, Ham or Turkey Sausage', 'Ham', ['Bacon', 'Sausage', 'Ham', 'Turkey Sausage'], 'Ham'],
    ['Bacon, Sausage, Ham or Turkey Sausage', 'Turkey Sausage', ['Bacon', 'Sausage', 'Ham', 'Turkey Sausage'], 'Turkey Sausage'],
    ['Turkey Bacon or Canadian Bacon', 'Canadian Bacon', ['Turkey Bacon', 'Canadian Bacon'], 'Canadian Bacon'],
    ['Tacos de pollo o res', 'Res', ['Pollo', 'Res'], 'Tacos de Res'],
  ];
  for (const [name, chosen, alts, want] of cases) {
    it(`${name} + ${chosen} → ${want}`, () => expect(nameWithChoice(name, chosen, alts)).toBe(want));
  }

  it('si las opciones no están en el nombre, no toca nada', () => {
    expect(nameWithChoice('Corned Beef or Pastrami Sandwich', 'Rye', ['White', 'Whole Wheat', 'Rye'])).toBeNull();
    expect(nameWithChoice('Cheeseburger', 'Deluxe — lettuce, tomato & choice of side', ['Regular', 'Deluxe — lettuce, tomato & choice of side'])).toBeNull();
    // Están en el nombre pero no como lista de alternativas.
    expect(nameWithChoice('Bacon Egg and Cheese with Ham', 'Ham', ['Bacon', 'Ham'])).toBeNull();
  });

  it('de punta a punta: la línea sale del ticket y el nombre cambia; el recargo no se pierde', () => {
    const lines = buildModLines([
      { group: g('Which meat would you like?', 0), options: [o('Pastrami', 1)], allOptions: ['Pastrami', 'Corned Beef'] },
      { group: g('Would you like extra eggs?', 1), options: [o('Add 1 Egg', 1.25)], allOptions: ['Add 1 Egg', 'Add 2 Eggs'] },
    ]);
    // Guardado en order_items.modifier_lines y leído de vuelta (Counter, ticket, KDS, mails).
    const stored = orderItemModLines({ modifier_lines: JSON.parse(JSON.stringify(lines)) });
    expect(withTitle('Pastrami or Corned Beef Omelette', stored)).toEqual({
      name: 'Pastrami Omelette',
      lines: [expect.objectContaining({ text: 'Add 1 Egg', price: 1.25 })],
      price: 1,
    });
  });

  it('pedidos viejos sin la marca: igual que antes', () => {
    const r = withTitle('Pastrami or Corned Beef Omelette', [{ text: 'Pastrami', price: 0, indent: false }]);
    expect(r.name).toBe('Pastrami or Corned Beef Omelette');
    expect(r.lines).toHaveLength(1);
  });
});

// Pedro 2026-11-26: el KDS decía "Bacon" aunque el cliente lo pidió crispy, y "Regular"
// en la cocción de la carne era ruido. El Regular de las burgers sí se queda.
describe('cocción de la carne elegida', () => {
  const meat = g('Which meat would you like?', 0, { is_required: true });
  const cook = g('How would you like your bacon?', 1, { ticket_layout: 'inline', is_required: true, depends_on_option_id: 'Bacon' });
  const alts = ['Bacon', 'Sausage', 'Ham', 'Turkey Sausage'];
  const order = (how: string, of = alts) => orderItemModLines({ modifier_lines: JSON.parse(JSON.stringify(buildModLines([
    { group: meat, options: [o('Bacon')], allOptions: of },
    { group: cook, options: [o(how)], allOptions: ['Soft', 'Regular', 'Crispy', 'Extra Crispy'] },
  ]))) });

  it('la cocción queda en el nombre del plato', () => {
    expect(withTitle('Side of Bacon, Sausage, Ham or Turkey Sausage', order('Crispy')))
      .toEqual({ name: 'Side of Bacon / Crispy', lines: [], price: 0 });
    expect(withTitle('Ham, Bacon or Sausage Omelette', order('Extra Crispy', ['Ham', 'Bacon', 'Sausage'])).name).toBe('Bacon Omelette / Extra Crispy');
  });

  it('Regular no se escribe', () => {
    expect(withTitle('Side of Bacon, Sausage, Ham or Turkey Sausage', order('Regular')).name).toBe('Side of Bacon');
  });

  it('el Regular de la burger (pregunta del plato) se sigue escribiendo', () => {
    const style = g('Regular or Deluxe?', 0, { ticket_layout: 'inline' });
    expect(withTitle('Cheeseburger', buildModLines([{ group: style, options: [o('Regular')] }])).name).toBe('Cheeseburger Regular');
  });
});
