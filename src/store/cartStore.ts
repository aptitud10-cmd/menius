import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, ProductVariant, ProductExtra, CartItem, ModifierSelection, ModifierOption, OrderType } from '@/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  restaurantId: string | null;
  tableName: string | null;
  selectedOrderType: OrderType | null;
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
      }),
    }
  )
);
