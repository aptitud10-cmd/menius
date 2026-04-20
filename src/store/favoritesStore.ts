import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface FavoritesState {
  byRestaurant: Record<string, string[]>;
  toggle: (restaurantId: string, productId: string) => void;
  isFav: (restaurantId: string, productId: string) => boolean;
  getIds: (restaurantId: string) => string[];
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      byRestaurant: {},
      toggle: (restaurantId, productId) =>
        set((s) => {
          const current = s.byRestaurant[restaurantId] ?? [];
          return {
            byRestaurant: {
              ...s.byRestaurant,
              [restaurantId]: current.includes(productId)
                ? current.filter((id) => id !== productId)
                : [...current, productId],
            },
          };
        }),
      isFav: (restaurantId, productId) =>
        (get().byRestaurant[restaurantId] ?? []).includes(productId),
      getIds: (restaurantId) => get().byRestaurant[restaurantId] ?? [],
    }),
    {
      name: 'menius-favs',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
        return localStorage;
      }),
      partialize: (s) => ({ byRestaurant: s.byRestaurant }),
    }
  )
);
