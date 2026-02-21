import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, ProductVariant, ProductExtra, CartItem, ModifierSelection, ModifierOption, OrderType } from '@/types';

interface SavedOrderItem {
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  qty: number;
}

interface LastOrder {
  restaurantId: string;
  items: SavedOrderItem[];
  date: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  restaurantId: string | null;
  tableName: string | null;
  selectedOrderType: OrderType | null;
  lastOrder: LastOrder | null;
  addItem: (product: Product, variant: ProductVariant | null, extras: ProductExtra[], qty: number, notes: string, modifierSelections?: ModifierSelection[]) => void;
  replaceItem: (index: number, product: Product, variant: ProductVariant | null, extras: ProductExtra[], qty: number, notes: string, modifierSelections?: ModifierSelection[]) => void;
  removeItem: (index: number) => void;
  updateQty: (index: number, qty: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setOpen: (open: boolean) => void;
  setRestaurantId: (id: string) => void;
  setTableName: (name: string | null) => void;
  setSelectedOrderType: (type: OrderType | null) => void;
  saveLastOrder: () => void;
  reorder: (products: Product[]) => number;
  totalItems: () => number;
  totalPrice: () => number;
}

function calcModifiersDelta(selections: ModifierSelection[]): number {
  return selections.reduce((sum, sel) =>
    sum + sel.selectedOptions.reduce((s, opt) => s + Number(opt.price_delta), 0), 0);
}

function calcLineTotal(product: Product, variant: ProductVariant | null, extras: ProductExtra[], qty: number, modifierSelections: ModifierSelection[] = []): number {
  const basePrice = Number(product.price) + Number(variant?.price_delta ?? 0);
  const extrasTotal = extras.reduce((sum, e) => sum + Number(e.price), 0);
  const modifiersTotal = calcModifiersDelta(modifierSelections);
  return (basePrice + extrasTotal + modifiersTotal) * qty;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      restaurantId: null,
      tableName: null,
      selectedOrderType: null,
      lastOrder: null,

      setRestaurantId: (id) => {
        const current = get().restaurantId;
        if (current && current !== id) {
          set({ items: [], restaurantId: id });
        } else {
          set({ restaurantId: id });
        }
      },

      setTableName: (name) => set({ tableName: name }),
      setSelectedOrderType: (type) => set({ selectedOrderType: type }),

      addItem: (product, variant, extras, qty, notes, modifierSelections = []) => {
        const lineTotal = calcLineTotal(product, variant, extras, qty, modifierSelections);
        set((state) => ({
          items: [...state.items, { product, variant, extras, modifierSelections, qty, notes, lineTotal }],
        }));
      },

      replaceItem: (index, product, variant, extras, qty, notes, modifierSelections = []) => {
        set((state) => {
          const items = [...state.items];
          if (index < 0 || index >= items.length) return state;
          items[index] = {
            product,
            variant,
            extras,
            modifierSelections,
            qty,
            notes,
            lineTotal: calcLineTotal(product, variant, extras, qty, modifierSelections),
          };
          return { items };
        });
      },

      removeItem: (index) => {
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        }));
      },

      updateQty: (index, qty) => {
        set((state) => {
          const items = [...state.items];
          const item = items[index];
          if (qty <= 0) {
            items.splice(index, 1);
          } else {
            items[index] = {
              ...item,
              qty,
              lineTotal: calcLineTotal(item.product, item.variant, item.extras, qty, item.modifierSelections ?? []),
            };
          }
          return { items };
        });
      },

      saveLastOrder: () => {
        const { items, restaurantId } = get();
        if (!restaurantId || items.length === 0) return;
        set({
          lastOrder: {
            restaurantId,
            items: items.map((i) => ({
              productId: i.product.id,
              productName: i.product.name,
              variantId: i.variant?.id ?? null,
              variantName: i.variant?.name ?? null,
              qty: i.qty,
            })),
            date: new Date().toISOString(),
          },
        });
      },

      reorder: (products: Product[]) => {
        const { lastOrder } = get();
        if (!lastOrder) return 0;
        const productMap = new Map(products.map((p) => [p.id, p]));
        let added = 0;
        for (const saved of lastOrder.items) {
          const product = productMap.get(saved.productId);
          if (!product || !product.is_active) continue;
          const variant = saved.variantId
            ? product.variants?.find((v) => v.id === saved.variantId) ?? null
            : null;
          const lineTotal = calcLineTotal(product, variant, [], saved.qty);
          set((state) => ({
            items: [...state.items, { product, variant, extras: [], modifierSelections: [], qty: saved.qty, notes: '', lineTotal }],
          }));
          added++;
        }
        return added;
      },

      clearCart: () => set({ items: [] }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      setOpen: (open) => set({ isOpen: open }),
      totalItems: () => get().items.reduce((s, i) => s + i.qty, 0),
      totalPrice: () => get().items.reduce((s, i) => s + i.lineTotal, 0),
    }),
    {
      name: 'menius-cart',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        items: state.items,
        restaurantId: state.restaurantId,
        tableName: state.tableName,
        selectedOrderType: state.selectedOrderType,
        lastOrder: state.lastOrder,
      }),
    }
  )
);
