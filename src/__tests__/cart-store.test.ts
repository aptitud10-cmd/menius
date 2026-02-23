import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '@/store/cartStore';
import type { Product, ProductVariant, ProductExtra, ModifierSelection, ModifierGroup, ModifierOption } from '@/types';

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  restaurant_id: 'rest-1',
  category_id: 'cat-1',
  name: 'Hamburguesa',
  description: '',
  price: 10,
  image_url: '',
  is_active: true,
  sort_order: 0,
  created_at: new Date().toISOString(),
  ...overrides,
});

const makeVariant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
  id: 'var-1',
  product_id: 'prod-1',
  name: 'Grande',
  price_delta: 3,
  sort_order: 0,
  ...overrides,
});

const makeExtra = (overrides: Partial<ProductExtra> = {}): ProductExtra => ({
  id: 'ext-1',
  product_id: 'prod-1',
  name: 'Queso extra',
  price: 2,
  sort_order: 0,
  ...overrides,
});

const makeModifier = (priceDelta: number): ModifierSelection => ({
  group: {
    id: 'grp-1',
    product_id: 'prod-1',
    name: 'Salsa',
    selection_type: 'single',
    min_select: 1,
    max_select: 1,
    is_required: true,
    sort_order: 0,
    options: [],
  } as ModifierGroup,
  selectedOptions: [{
    id: 'opt-1',
    group_id: 'grp-1',
    name: 'Picante',
    price_delta: priceDelta,
    is_default: false,
    sort_order: 0,
  }],
});

beforeEach(() => {
  useCartStore.setState({
    items: [],
    isOpen: false,
    restaurantId: null,
    tableName: null,
    selectedOrderType: null,
    lastOrder: null,
  });
});

describe('Cart Store — addItem', () => {
  it('adds a simple product', () => {
    const store = useCartStore.getState();
    const product = makeProduct();

    store.addItem(product, null, [], 1, '');

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].product.id).toBe('prod-1');
    expect(state.items[0].qty).toBe(1);
    expect(state.items[0].lineTotal).toBe(10);
  });

  it('calculates lineTotal with variant price_delta', () => {
    const store = useCartStore.getState();
    const product = makeProduct({ price: 10 });
    const variant = makeVariant({ price_delta: 3 });

    store.addItem(product, variant, [], 2, '');

    const item = useCartStore.getState().items[0];
    expect(item.lineTotal).toBe(26); // (10 + 3) * 2
  });

  it('calculates lineTotal with extras', () => {
    const store = useCartStore.getState();
    const product = makeProduct({ price: 10 });
    const extras = [makeExtra({ price: 2 }), makeExtra({ id: 'ext-2', price: 1.5 })];

    store.addItem(product, null, extras, 1, '');

    const item = useCartStore.getState().items[0];
    expect(item.lineTotal).toBe(13.5); // 10 + 2 + 1.5
  });

  it('calculates lineTotal with variant + extras + modifiers', () => {
    const store = useCartStore.getState();
    const product = makeProduct({ price: 10 });
    const variant = makeVariant({ price_delta: 3 });
    const extras = [makeExtra({ price: 2 })];
    const modifiers = [makeModifier(1.5)];

    store.addItem(product, variant, extras, 2, '', modifiers);

    const item = useCartStore.getState().items[0];
    // (10 + 3 + 2 + 1.5) * 2 = 33
    expect(item.lineTotal).toBe(33);
  });

  it('adds multiple items', () => {
    const store = useCartStore.getState();
    store.addItem(makeProduct({ id: 'p1', price: 5 }), null, [], 1, '');
    store.addItem(makeProduct({ id: 'p2', price: 8 }), null, [], 3, '');

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(2);
  });

  it('preserves notes', () => {
    const store = useCartStore.getState();
    store.addItem(makeProduct(), null, [], 1, 'Sin cebolla');

    const item = useCartStore.getState().items[0];
    expect(item.notes).toBe('Sin cebolla');
  });
});

describe('Cart Store — removeItem', () => {
  it('removes item by index', () => {
    const store = useCartStore.getState();
    store.addItem(makeProduct({ id: 'p1' }), null, [], 1, '');
    store.addItem(makeProduct({ id: 'p2' }), null, [], 1, '');

    useCartStore.getState().removeItem(0);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].product.id).toBe('p2');
  });

  it('handles removing last item gracefully', () => {
    const store = useCartStore.getState();
    store.addItem(makeProduct(), null, [], 1, '');

    useCartStore.getState().removeItem(0);

    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe('Cart Store — updateQty', () => {
  it('updates quantity and recalculates lineTotal', () => {
    const store = useCartStore.getState();
    store.addItem(makeProduct({ price: 10 }), null, [], 1, '');

    useCartStore.getState().updateQty(0, 5);

    const item = useCartStore.getState().items[0];
    expect(item.qty).toBe(5);
    expect(item.lineTotal).toBe(50);
  });

  it('removes item when qty is set to 0', () => {
    const store = useCartStore.getState();
    store.addItem(makeProduct(), null, [], 1, '');

    useCartStore.getState().updateQty(0, 0);

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('removes item when qty is negative', () => {
    const store = useCartStore.getState();
    store.addItem(makeProduct(), null, [], 3, '');

    useCartStore.getState().updateQty(0, -1);

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('recalculates lineTotal with variant and extras', () => {
    const store = useCartStore.getState();
    store.addItem(makeProduct({ price: 10 }), makeVariant({ price_delta: 5 }), [makeExtra({ price: 2 })], 1, '');

    useCartStore.getState().updateQty(0, 3);

    const item = useCartStore.getState().items[0];
    expect(item.lineTotal).toBe(51); // (10 + 5 + 2) * 3
  });
});

describe('Cart Store — replaceItem', () => {
  it('replaces item at index', () => {
    const store = useCartStore.getState();
    store.addItem(makeProduct({ id: 'p1', price: 5 }), null, [], 1, '');

    useCartStore.getState().replaceItem(0, makeProduct({ id: 'p2', price: 20 }), null, [], 2, 'Updated');

    const item = useCartStore.getState().items[0];
    expect(item.product.id).toBe('p2');
    expect(item.qty).toBe(2);
    expect(item.lineTotal).toBe(40);
    expect(item.notes).toBe('Updated');
  });

  it('ignores out-of-bounds index', () => {
    const store = useCartStore.getState();
    store.addItem(makeProduct(), null, [], 1, '');

    useCartStore.getState().replaceItem(5, makeProduct({ id: 'p2' }), null, [], 1, '');

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].product.id).toBe('prod-1');
  });
});

describe('Cart Store — totalItems & totalPrice', () => {
  it('totalItems sums quantities', () => {
    const store = useCartStore.getState();
    store.addItem(makeProduct({ id: 'p1' }), null, [], 2, '');
    store.addItem(makeProduct({ id: 'p2' }), null, [], 3, '');

    expect(useCartStore.getState().totalItems()).toBe(5);
  });

  it('totalPrice sums line totals', () => {
    const store = useCartStore.getState();
    store.addItem(makeProduct({ id: 'p1', price: 10 }), null, [], 2, '');
    store.addItem(makeProduct({ id: 'p2', price: 5 }), null, [], 1, '');

    expect(useCartStore.getState().totalPrice()).toBe(25); // 20 + 5
  });

  it('returns 0 for empty cart', () => {
    expect(useCartStore.getState().totalItems()).toBe(0);
    expect(useCartStore.getState().totalPrice()).toBe(0);
  });
});

describe('Cart Store — clearCart', () => {
  it('removes all items', () => {
    const store = useCartStore.getState();
    store.addItem(makeProduct({ id: 'p1' }), null, [], 1, '');
    store.addItem(makeProduct({ id: 'p2' }), null, [], 2, '');

    useCartStore.getState().clearCart();

    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe('Cart Store — setRestaurantId', () => {
  it('clears cart when switching restaurants', () => {
    const store = useCartStore.getState();
    store.setRestaurantId('rest-1');
    store.addItem(makeProduct(), null, [], 1, '');

    expect(useCartStore.getState().items).toHaveLength(1);

    useCartStore.getState().setRestaurantId('rest-2');

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().restaurantId).toBe('rest-2');
  });

  it('keeps cart when setting same restaurant', () => {
    const store = useCartStore.getState();
    store.setRestaurantId('rest-1');
    store.addItem(makeProduct(), null, [], 1, '');

    useCartStore.getState().setRestaurantId('rest-1');

    expect(useCartStore.getState().items).toHaveLength(1);
  });
});

describe('Cart Store — saveLastOrder & reorder', () => {
  it('saves current items as last order', () => {
    const store = useCartStore.getState();
    store.setRestaurantId('rest-1');
    store.addItem(makeProduct({ id: 'p1', name: 'Burger' }), null, [], 2, '');

    useCartStore.getState().saveLastOrder();

    const lastOrder = useCartStore.getState().lastOrder;
    expect(lastOrder).not.toBeNull();
    expect(lastOrder!.restaurantId).toBe('rest-1');
    expect(lastOrder!.items).toHaveLength(1);
    expect(lastOrder!.items[0].productName).toBe('Burger');
    expect(lastOrder!.items[0].qty).toBe(2);
  });

  it('reorder restores items from last order', () => {
    const store = useCartStore.getState();
    store.setRestaurantId('rest-1');
    store.addItem(makeProduct({ id: 'p1', name: 'Burger', price: 10 }), null, [], 2, '');
    useCartStore.getState().saveLastOrder();
    useCartStore.getState().clearCart();

    const availableProducts = [makeProduct({ id: 'p1', name: 'Burger', price: 10 })];
    const added = useCartStore.getState().reorder(availableProducts);

    expect(added).toBe(1);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].qty).toBe(2);
  });

  it('reorder skips inactive products', () => {
    const store = useCartStore.getState();
    store.setRestaurantId('rest-1');
    store.addItem(makeProduct({ id: 'p1' }), null, [], 1, '');
    useCartStore.getState().saveLastOrder();
    useCartStore.getState().clearCart();

    const products = [makeProduct({ id: 'p1', is_active: false })];
    const added = useCartStore.getState().reorder(products);

    expect(added).toBe(0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('reorder skips products not found', () => {
    const store = useCartStore.getState();
    store.setRestaurantId('rest-1');
    store.addItem(makeProduct({ id: 'p1' }), null, [], 1, '');
    useCartStore.getState().saveLastOrder();
    useCartStore.getState().clearCart();

    const products = [makeProduct({ id: 'p-different' })];
    const added = useCartStore.getState().reorder(products);

    expect(added).toBe(0);
  });

  it('does not save if no restaurantId', () => {
    const store = useCartStore.getState();
    store.addItem(makeProduct(), null, [], 1, '');
    useCartStore.getState().saveLastOrder();

    expect(useCartStore.getState().lastOrder).toBeNull();
  });
});
