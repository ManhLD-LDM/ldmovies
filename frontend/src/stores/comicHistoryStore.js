import { create } from 'zustand';
import { historyApi } from '../services/api';

const useComicHistoryStore = create((set) => ({
  comicHistory: [],
  isLoading: false,
  error: null,

  fetchComicHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await historyApi.getComicHistory();
      set({ comicHistory: Array.isArray(response.data) ? response.data : [], isLoading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch history', isLoading: false });
    }
  },

  syncComicHistory: async (itemData) => {
    try {
      // Backend replies 204 (no body) — update the local list optimistically.
      await historyApi.syncComicItem(itemData);
      set((state) => {
        const current = Array.isArray(state.comicHistory) ? state.comicHistory : [];
        const entry = { ...itemData, watchedAt: new Date().toISOString() };
        return {
          comicHistory: [entry, ...current.filter((item) => item.slug !== itemData.slug)].slice(0, 50),
        };
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to sync history';
      return { success: false, message };
    }
  },

  removeComicHistoryItem: async (slug) => {
    try {
      await historyApi.deleteComicItem(slug);
      set((state) => ({
        comicHistory: state.comicHistory.filter((item) => item.slug !== slug),
      }));
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove history item';
      return { success: false, message };
    }
  },

  clearComicHistory: () => set({ comicHistory: [], error: null }),
  clearError: () => set({ error: null }),
}));

export default useComicHistoryStore;
