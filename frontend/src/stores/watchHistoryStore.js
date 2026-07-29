import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { historyApi } from '../services/api';

// Watch history store - saves to localStorage
const useWatchHistoryStore = create(
    persist(
        (set, get) => ({
            watchHistory: [],

            // Add or update watch history
            addToHistory: (item) => {
                const { watchHistory } = get();

                // Item should have: id, slug, name, poster, type (movie/anime), episodeName, progress, duration
                const existingIndex = watchHistory.findIndex(
                    (h) => h.slug === item.slug && h.episodeName === item.episodeName
                );

                const newEntry = {
                    ...item,
                    watchedAt: Date.now(),
                    progress: item.progress || 0,
                    duration: item.duration || 0,
                };

                let newHistory;
                if (existingIndex >= 0) {
                    // Update existing entry
                    newHistory = [...watchHistory];
                    newHistory[existingIndex] = newEntry;
                } else {
                    // Add new entry at the beginning
                    newHistory = [newEntry, ...watchHistory];
                }

                // Keep only last 20 items
                newHistory = newHistory.slice(0, 20);

                set({ watchHistory: newHistory });
            },

            // Update progress for an item
            updateProgress: (slug, episodeName, progress, duration) => {
                const { watchHistory } = get();
                const index = watchHistory.findIndex(
                    (h) => h.slug === slug && h.episodeName === episodeName
                );

                if (index >= 0) {
                    const newHistory = [...watchHistory];
                    newHistory[index] = {
                        ...newHistory[index],
                        progress,
                        duration,
                        watchedAt: Date.now(),
                    };
                    set({ watchHistory: newHistory });
                }
            },

            // Remove from history
            removeFromHistory: (slug, episodeName) => {
                const { watchHistory } = get();
                set({
                    watchHistory: watchHistory.filter(
                        (h) => !(h.slug === slug && h.episodeName === episodeName)
                    ),
                });
            },

            // Clear all history
            clearHistory: () => {
                set({ watchHistory: [] });
            },

            // Get watch progress percentage
            getProgress: (slug, episodeName) => {
                const { watchHistory } = get();
                const item = watchHistory.find(
                    (h) => h.slug === slug && h.episodeName === episodeName
                );
                if (item && item.duration > 0) {
                    return Math.round((item.progress / item.duration) * 100);
                }
                return 0;
            },

            // Get recent items (for Continue Watching section)
            getRecentItems: (limit = 10) => {
                const { watchHistory } = get();
                return watchHistory
                    .filter((item) => {
                        // Only show items with less than 90% progress
                        if (item.duration > 0) {
                            const progressPercent = (item.progress / item.duration) * 100;
                            return progressPercent < 90;
                        }
                        return true;
                    })
                    .slice(0, limit);
            },

            // Lấy lịch sử từ Backend (gọi sau khi đăng nhập)
            fetchHistoryFromBackend: async () => {
                try {
                    const token = localStorage.getItem('token');
                    if (!token) return;

                    const res = await historyApi.getHistory();
                    if (res.data && Array.isArray(res.data)) {
                        const { watchHistory } = get();
                        const backendHistory = res.data;
                        
                        // Merge: gộp backendHistory và watchHistory
                        // Ưu tiên item có watchedAt mới hơn
                        const mergedMap = new Map();
                        
                        // Đưa history ở local vào map
                        watchHistory.forEach(item => {
                            const key = `${item.slug}_${item.episodeName}`;
                            mergedMap.set(key, item);
                        });

                        // Ghi đè hoặc thêm history từ backend
                        backendHistory.forEach(bItem => {
                            const key = `${bItem.slug}_${bItem.episodeName}`;
                            const existing = mergedMap.get(key);
                            if (!existing || new Date(bItem.watchedAt) > new Date(existing.watchedAt)) {
                                mergedMap.set(key, bItem);
                            }
                        });

                        // Chuyển lại thành mảng và sắp xếp theo watchedAt mới nhất
                        let newHistory = Array.from(mergedMap.values());
                        newHistory.sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));
                        
                        // Cắt lấy 20
                        newHistory = newHistory.slice(0, 20);
                        set({ watchHistory: newHistory });
                    }
                } catch (error) {
                    console.error('Lỗi khi tải lịch sử từ server:', error);
                }
            },

            // Gửi 1 item lên Backend (khi tắt tab hoặc tắt video)
            syncHistoryItemToBackend: async (item) => {
                try {
                    const token = localStorage.getItem('token');
                    if (!token) return;
                    
                    if (!item || !item.slug || !item.episodeName) return;
                    await historyApi.syncItem(item);
                } catch (error) {
                    console.error('Lỗi khi đồng bộ tiến trình lên server:', error);
                }
            },
        }),
        {
            name: 'watch-history-storage',
        }
    )
);

export default useWatchHistoryStore;
