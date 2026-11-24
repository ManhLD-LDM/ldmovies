import axios from 'axios';

// Sử dụng /api để proxy qua Vite, hoặc full URL nếu được set
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export const userApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),
};

export const favoritesApi = {
  // Movies
  getFavoriteMovies: () => api.get('/favorites/movies'),
  addFavoriteMovie: (movieData) => api.post('/favorites/movies', movieData),
  removeFavoriteMovie: (movieId) => api.delete(`/favorites/movies/${movieId}`),
  // Anime
  getFavoriteAnime: () => api.get('/favorites/anime'),
  addFavoriteAnime: (animeData) => api.post('/favorites/anime', animeData),
  removeFavoriteAnime: (animeId) => api.delete(`/favorites/anime/${animeId}`),
  // Comics
  getFavoriteComics: () => api.get('/favorites/comics'),
  addFavoriteComic: (comicData) => api.post('/favorites/comics', comicData),
  removeFavoriteComic: (comicId) => api.delete(`/favorites/comics/${comicId}`),
};

export const historyApi = {
  // Watch history (movies & anime)
  getHistory: () => api.get('/history'),
  syncItem: (itemData) => api.post('/history', itemData),
  deleteItem: (slug, episodeName) => api.delete(`/history/${slug}/${episodeName}`),
  // Comic history
  getComicHistory: () => api.get('/history/comics'),
  syncComicItem: (itemData) => api.post('/history/comics', itemData),
  deleteComicItem: (slug) => api.delete(`/history/comics/${slug}`),
};

export default api;
