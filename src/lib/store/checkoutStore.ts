import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SavedCustomer {
  name: string;
  phone: string;
  email: string;
  lastOrderType: string;
  lastPaymentMethod: string;
  deliveryAddress?: string;
  savedAt: string;
}

interface CheckoutStoreState {
  customer: SavedCustomer | null;
  saveCustomer: (data: Omit<SavedCustomer, 'savedAt'>) => void;
  clearCustomer: () => void;
  isReturningCustomer: () => boolean;
}

export const useCheckoutStore = create<CheckoutStoreState>()(
  persist(
    (set, get) => ({
      customer: null,

      saveCustomer: (data) => set({
        customer: {
          ...data,
          savedAt: new Date().toISOString(),
        },
      }),

      clearCustomer: () => set({ customer: null }),

      isReturningCustomer: () => {
        const c = get().customer;
        if (!c) return false;
        const savedDate = new Date(c.savedAt);
        const daysSince = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince < 90;
      },
    }),
    {
      name: 'menius-checkout',
      partialize: (state) => ({ customer: state.customer }),
    }
  )
);
