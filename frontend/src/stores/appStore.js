import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAppStore = create(
  persist(
    (set) => ({
      appMode: 'movie', // 'movie' or 'comic'
      setAppMode: (mode) => set({ appMode: mode }),
      toggleAppMode: () => set((state) => ({ appMode: state.appMode === 'movie' ? 'comic' : 'movie' })),
    }),
    {
      name: 'app-mode-storage', // name of the item in the storage (must be unique)
    }
  )
);

export default useAppStore;
