import { create } from 'zustand';
import { favoritesApi } from '../services/api';

// Không gọi lại API danh sách yêu thích nếu vừa tải trong 60s (trang chi tiết mount liên tục).
// Thêm/xoá đã cập nhật danh sách từ response nên không cần refetch.
const FAVORITES_FRESH_MS = 60 * 1000;
const fetchedAt = { movies: 0, anime: 0, comics: 0 };
const isFresh = (key, force) => !force && Date.now() - fetchedAt[key] < FAVORITES_FRESH_MS;

const useFavoritesStore = create((set, get) => ({
  favoriteMovies: [],
  favoriteAnime: [],
  favoriteComics: [],
  loadingMovies: false,
  loadingAnime: false,
  loadingComics: false,
  isLoading: false,
  error: null,

  // Fetch favorites
  fetchFavoriteMovies: async (force = false) => {
    if (isFresh('movies', force)) return;
    fetchedAt.movies = Date.now();
    set({ loadingMovies: true, isLoading: true, error: null });
    try {
      const response = await favoritesApi.getFavoriteMovies();
      set((state) => ({
        favoriteMovies: Array.isArray(response.data) ? response.data : [],
        loadingMovies: false,
        isLoading: state.loadingAnime || state.loadingComics,
      }));
    } catch (error) {
      fetchedAt.movies = 0;
      set((state) => ({
        error: error.response?.data?.message || 'Failed to fetch favorites',
        loadingMovies: false,
        isLoading: state.loadingAnime || state.loadingComics,
      }));
    }
  },

  fetchFavoriteAnime: async (force = false) => {
    if (isFresh('anime', force)) return;
    fetchedAt.anime = Date.now();
    set({ loadingAnime: true, isLoading: true, error: null });
    try {
      const response = await favoritesApi.getFavoriteAnime();
      set((state) => ({
        favoriteAnime: Array.isArray(response.data) ? response.data : [],
        loadingAnime: false,
        isLoading: state.loadingMovies || state.loadingComics,
      }));
    } catch (error) {
      fetchedAt.anime = 0;
      set((state) => ({
        error: error.response?.data?.message || 'Failed to fetch favorites',
        loadingAnime: false,
        isLoading: state.loadingMovies || state.loadingComics,
      }));
    }
  },

  fetchFavoriteComics: async (force = false) => {
    if (isFresh('comics', force)) return;
    fetchedAt.comics = Date.now();
    set({ loadingComics: true, isLoading: true, error: null });
    try {
      const response = await favoritesApi.getFavoriteComics();
      set((state) => ({
        favoriteComics: Array.isArray(response.data) ? response.data : [],
        loadingComics: false,
        isLoading: state.loadingMovies || state.loadingAnime,
      }));
    } catch (error) {
      fetchedAt.comics = 0;
      set((state) => ({
        error: error.response?.data?.message || 'Failed to fetch favorites',
        loadingComics: false,
        isLoading: state.loadingMovies || state.loadingAnime,
      }));
    }
  },

  // Add to favorites
  addFavoriteMovie: async (movieData) => {
    try {
      const response = await favoritesApi.addFavoriteMovie(movieData);
      set({ favoriteMovies: response.data.favorites });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add favorite';
      return { success: false, message };
    }
  },

  addFavoriteAnime: async (animeData) => {
    try {
      const response = await favoritesApi.addFavoriteAnime(animeData);
      set({ favoriteAnime: response.data.favorites });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add favorite';
      return { success: false, message };
    }
  },

  addFavoriteComic: async (comicData) => {
    try {
      const response = await favoritesApi.addFavoriteComic(comicData);
      set({ favoriteComics: response.data.favorites });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add favorite';
      return { success: false, message };
    }
  },

  // Remove from favorites
  removeFavoriteMovie: async (movieId) => {
    try {
      const response = await favoritesApi.removeFavoriteMovie(movieId);
      set({ favoriteMovies: response.data.favorites });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove favorite';
      return { success: false, message };
    }
  },

  removeFavoriteAnime: async (animeId) => {
    try {
      const response = await favoritesApi.removeFavoriteAnime(animeId);
      set({ favoriteAnime: response.data.favorites });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove favorite';
      return { success: false, message };
    }
  },

  removeFavoriteComic: async (comicId) => {
    try {
      const response = await favoritesApi.removeFavoriteComic(comicId);
      set({ favoriteComics: response.data.favorites });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove favorite';
      return { success: false, message };
    }
  },

  // Check if item is favorited
  isMovieFavorited: (movieId) => {
    const { favoriteMovies } = get();
    return favoriteMovies.some(movie => movie.movieId === movieId);
  },

  isAnimeFavorited: (animeId) => {
    const { favoriteAnime } = get();
    return favoriteAnime.some(anime => anime.animeId === animeId);
  },

  isComicFavorited: (comicId) => {
    const { favoriteComics } = get();
    return favoriteComics.some(comic => comic.comicId === comicId);
  },

  clearFavorites: () => {
    fetchedAt.movies = 0;
    fetchedAt.anime = 0;
    fetchedAt.comics = 0;
    set({ favoriteMovies: [], favoriteAnime: [], favoriteComics: [], error: null });
  },
  clearError: () => set({ error: null }),
}));

export default useFavoritesStore;
