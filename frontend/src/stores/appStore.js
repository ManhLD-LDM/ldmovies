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

// Gắn chế độ lên <html data-mode> để bảng màu `primary-*` (index.css) đổi violet ↔ teal.
// Chạy ngay khi module load (trước lần render đầu) để không bị nháy màu sai,
// với cùng quy tắc theo URL như Layout.
if (typeof document !== 'undefined') {
  const applyMode = (mode) => {
    document.documentElement.dataset.mode = mode === 'comic' ? 'comic' : 'movie';
  };
  const path = window.location.pathname;
  if (path.startsWith('/comics')) {
    useAppStore.setState({ appMode: 'comic' });
  } else if (path === '/' || /^\/(movies|anime|search)(\/|$)/.test(path)) {
    useAppStore.setState({ appMode: 'movie' });
  }
  applyMode(useAppStore.getState().appMode);
  useAppStore.subscribe((state) => applyMode(state.appMode));
}

export default useAppStore;
