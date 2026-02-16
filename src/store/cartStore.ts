import { create } from 'zustand';
import type { Product, ProductVariant, ProductExtra, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, variant: ProductVariant | null, extras: ProductExtra[], qty: number, notes: string) => void;
  removeItem: (index: number) => void;
  updateQty: (index: number, qty: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setOpen: (open: boolean) => void;
  totalItems: () => number;
  totalPrice: () => number;
}

function calcLineTotal(product: Product, variant: ProductVariant | null, extras: ProductExtra[], qty: number): number {
  const basePrice = product.price + (variant?.price_delta ?? 0);
  const extrasTotal = extras.reduce((sum, e) => sum + e.price, 0);
  return (basePrice + extrasTotal) * qty;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,

  addItem: (product, variant, extras, qty, notes) => {
    const lineTotal = calcLineTotal(product, variant, extras, qty);
    set((state) => ({
      items: [...state.items, { product, variant, extras, qty, notes, lineTotal }],
    }));
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
          lineTotal: calcLineTotal(item.product, item.variant, item.extras, qty),
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
}));
