import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, ProductVariant, ProductExtra, CartItem, ModifierSelection, ModifierOption, OrderType } from '@/types';
import { toSavedModifiers, type SavedModifier } from '@/lib/reorder';

interface SavedOrderItem {
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  /** Snapshot of the variant surcharge. The slim pattern empties product.variants on
   *  large catalogs, so reorder can't look the delta up again — without this the
   *  reordered line silently drops it (e.g. a $20 wine bottle re-added at base price). */
  variantPriceDelta?: number | null;
  qty: number;
  /** What the diner chose (eggs, potatoes…) — re-checked against today's menu on reorder. */
  modifiers?: SavedModifier[];
  notes?: string;
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
  /** Platos del último "repetir" que necesitan elegir opciones de nuevo (no se persiste). */
  reorderSkipped: { productId: string; name: string }[];
  /** Dishes from the last order that can't be served right now (sold out, out of hours). */
  reorderUnavailable: string[];
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
  /**
   * Puts the last order back in the cart. `resolved` holds today's selections
   * for lines with options, by line index (see lib/reorder rebuildSelections);
   * a line with options and no entry there goes to reorderSkipped.
   */
  reorder: (products: Product[], resolved?: Record<number, ModifierSelection[]>) => number;
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
      reorderSkipped: [],
      reorderUnavailable: [],

      setRestaurantId: (id) => {
        const current = get().restaurantId;
        if (current && current !== id) {
          set({ items: [], restaurantId: id, tableName: null, selectedOrderType: null });
        } else {
          set({ restaurantId: id });
        }
      },

      setTableName: (name) => set({ tableName: name }),
      setSelectedOrderType: (type) => set({ selectedOrderType: type }),

      addItem: (product, variant, extras, qty, notes, modifierSelections = []) => {
        const lineTotal = calcLineTotal(product, variant, extras, qty, modifierSelections);
        const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((state) => ({
          items: [...state.items, { uid, product, variant, extras, modifierSelections, qty, notes, lineTotal }],
          // A reordered dish whose options were chosen again is no longer pending.
          reorderSkipped: state.reorderSkipped.filter((s) => s.productId !== product.id),
        }));
      },

      replaceItem: (index, product, variant, extras, qty, notes, modifierSelections = []) => {
        set((state) => {
          const items = [...state.items];
          if (index < 0 || index >= items.length) return state;
          items[index] = {
            uid: items[index].uid ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
              variantPriceDelta: i.variant?.price_delta ?? null,
              qty: i.qty,
              modifiers: toSavedModifiers(i.modifierSelections ?? []),
              notes: i.notes || undefined,
            })),
            date: new Date().toISOString(),
          },
        });
      },

      reorder: (products: Product[], resolved: Record<number, ModifierSelection[]> = {}) => {
        const { lastOrder } = get();
        if (!lastOrder) return 0;
        const productMap = new Map(products.map((p) => [p.id, p]));
        const newItems = [];
        const skipped: { productId: string; name: string }[] = [];
        const unavailable: string[] = [];
        for (let idx = 0; idx < lastOrder.items.length; idx++) {
          const saved = lastOrder.items[idx];
          const product = productMap.get(saved.productId);
          if (!product || !product.is_active) continue;
          // Agotado o fuera de horario (Oatmeal después de las 11): antes entraba
          // al carrito y el checkout lo rechazaba recién al pagar.
          if (product.in_stock === false) {
            const name = saved.productName || product.name;
            unavailable.push(product.unavailable_note ? `${name} (${product.unavailable_note})` : name);
            continue;
          }
          // Con opciones: se repite con lo que eligió la vez anterior si sigue
          // valiendo hoy (resolved). Si no (opción borrada, fuera de horario,
          // pregunta obligatoria nueva), se avisa para elegirlas de nuevo.
          const modifierSelections = resolved[idx];
          if (product.has_modifiers && !modifierSelections) {
            skipped.push({ productId: product.id, name: saved.productName || product.name });
            continue;
          }
          // product.variants is empty under the slim pattern, so fall back to the
          // snapshot saved with the order — otherwise the surcharge is lost.
          const variant: ProductVariant | null = saved.variantId
            ? (product.variants?.find((v) => v.id === saved.variantId) ?? {
                id: saved.variantId,
                product_id: product.id,
                name: saved.variantName ?? '',
                price_delta: saved.variantPriceDelta ?? 0,
                sort_order: 0,
              })
            : null;
          const mods = modifierSelections ?? [];
          const lineTotal = calcLineTotal(product, variant, [], saved.qty, mods);
          const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${idx}`;
          newItems.push({ uid, product, variant, extras: [], modifierSelections: mods, qty: saved.qty, notes: saved.notes ?? '', lineTotal });
        }
        // Se suma a lo que ya haya en el carrito (antes lo reemplazaba sin avisar).
        set({ items: [...get().items, ...newItems], reorderSkipped: skipped, reorderUnavailable: unavailable });
        return newItems.length + skipped.length + unavailable.length;
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
