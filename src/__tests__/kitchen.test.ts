import { describe, it, expect } from 'vitest';
import {
  isKitchenItem, kitchenItems, counterItems, lineKind, shortOrderNumber, shortCustomerName, kitchenTiming,
} from '@/lib/kitchen';

const burger = {
  qty: 2,
  product: { id: 'p1', name: 'Cheeseburger', station_id: null, category: { send_to_kitchen: true } },
  modifier_lines: [
    { text: 'Deluxe', price: 4, indent: false, title: true },
    { text: 'French Fries', price: 0, indent: false },
    { text: 'No Lettuce', price: 0, indent: false },
    { text: 'Ranch on the side', price: 0, indent: false },
  ],
};
const soda = {
  qty: 2,
  product: { id: 'p2', name: 'Assorted Sodas & Diet Sodas', category: { send_to_kitchen: false } },
  modifier_lines: [{ text: 'Pepsi', price: 0, indent: false }],
};
const cake = { qty: 1, product: { id: 'p3', name: 'Cheesecake', category: { send_to_kitchen: false } }, modifier_lines: [] };

describe('qué va a cocina', () => {
  it('sin dato de categoría va a cocina (mejor de más que perder un plato)', () => {
    expect(isKitchenItem({ qty: 1, product: { name: 'X' } })).toBe(true);
    expect(isKitchenItem(soda)).toBe(false);
  });

  it('la cocina ve solo sus platos, con el estilo en el nombre y cada línea clasificada', () => {
    const items = kitchenItems([burger, soda, cake]);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Cheeseburger Deluxe');
    expect(items[0].lines).toEqual([
      { text: 'French Fries', indent: false, kind: 'normal' },
      { text: 'No Lettuce', indent: false, kind: 'no' },
      { text: 'Ranch on the side', indent: false, kind: 'side' },
    ]);
  });

  it('el mostrador: por el nombre del producto (una opción como "Regular" sola no dice nada)', () => {
    expect(counterItems([burger, soda, cake])).toEqual([{ qty: 2, name: 'Assorted Sodas & Diet Sodas' }, { qty: 1, name: 'Cheesecake' }]);
  });

  it('filtro por estación', () => {
    const grill = { ...burger, product: { ...burger.product, station_id: 'grill' } };
    expect(kitchenItems([grill], 'grill')).toHaveLength(1);
    expect(kitchenItems([grill], 'fry')).toHaveLength(0);
  });
});

describe('formato', () => {
  it('lineKind', () => {
    expect(lineKind('No Onion')).toBe('no');
    expect(lineKind('Sin cebolla')).toBe('no');
    expect(lineKind('Extra BBQ on the side')).toBe('side');
    expect(lineKind('Northern Style')).toBe('normal');
  });
  it('número y nombre cortos', () => {
    expect(shortOrderNumber('ORD-261113-021')).toBe('021');
    expect(shortCustomerName('Maria  Gonzalez')).toBe('Maria G.');
    expect(shortCustomerName('Ana')).toBe('Ana');
    expect(shortCustomerName('  ')).toBeNull();
  });
  it('tiempo contra lo prometido: ámbar al 75%, rojo al pasarse', () => {
    const start = '2026-11-13T10:00:00.000Z';
    const at = (min: number) => new Date(start).getTime() + min * 60_000;
    expect(kitchenTiming(start, 20, at(10)).state).toBe('ok');
    expect(kitchenTiming(start, 20, at(15)).state).toBe('warn');
    expect(kitchenTiming(start, 20, at(23))).toMatchObject({ state: 'late', lateMin: 3, timer: '23:00' });
  });
});
