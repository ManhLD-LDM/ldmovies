import { create } from 'zustand';
import { authApi, userApi } from '../services/api';
import useComicHistoryStore from './comicHistoryStore';
import useFavoritesStore from './favoritesStore';
import useWatchHistoryStore from './watchHistoryStore';

function safeParseUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

const useAuthStore = create((set) => ({
  user: safeParseUser(),
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(credentials);
      const { token, _id, username, email, avatar, bio } = response.data;
      
      const user = { _id, username, email, avatar, bio };
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({ 
        user, 
        token, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Đăng nhập thất bại';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(data);
      const { token, _id, username, email, avatar, bio } = response.data;
      
      const user = { _id, username, email, avatar, bio };
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({ 
        user, 
        token, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response);
      
      let message = 'Đăng ký thất bại';
      
      if (error.response) {
        // Server responded with error
        message = error.response.data?.message || `Lỗi ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        // Request made but no response
        message = 'Không thể kết nối đến server. Kiểm tra backend đã chạy chưa?';
      } else {
        // Something else happened
        message = error.message || 'Đã xảy ra lỗi không xác định';
      }
      
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await userApi.updateProfile(data);
      const user = response.data;
      
      localStorage.setItem('user', JSON.stringify(user));
      
      set({ 
        user, 
        isLoading: false 
      });
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Cập nhật thất bại';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    useFavoritesStore.getState().clearFavorites();
    useComicHistoryStore.getState().clearComicHistory();
    // Watch history is persisted in localStorage — clear it so the next account
    // on this device does not see (or merge) the previous user's history.
    useWatchHistoryStore.getState().clearHistory();
    try {
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith('watching_'))
        .forEach((key) => sessionStorage.removeItem(key));
    } catch {
      // sessionStorage may be unavailable in restricted contexts
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));

if (typeof window !== 'undefined' && !window.__authUnauthorizedListenerAttached) {
  window.__authUnauthorizedListenerAttached = true;
  window.addEventListener('auth:unauthorized', () => {
    useAuthStore.getState().logout();
  });
}

export default useAuthStore;
