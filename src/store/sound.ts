import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SoundState {
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      setSoundEnabled: (val) => set({ soundEnabled: val }),
    }),
    {
      name: 'menius-sound',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
