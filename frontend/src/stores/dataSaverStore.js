import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const detectDefaultDataSaver = () => {
  if (typeof window === 'undefined') return false;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return false;
  return connection.saveData === true || ['slow-2g', '2g', '3g'].includes(connection.effectiveType);
};

const useDataSaverStore = create(
  persist(
    (set) => ({
      enabled: detectDefaultDataSaver(),
      toggle: () => set((state) => ({ enabled: !state.enabled })),
      setEnabled: (val) => set({ enabled: !!val }),
    }),
    {
      name: 'ldmovies-datasaver-store',
    }
  )
);

export default useDataSaverStore;
