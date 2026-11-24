import { create } from 'zustand';
import { favoritesApi } from '../services/api';

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
  fetchFavoriteMovies: async () => {
    set({ loadingMovies: true, isLoading: true, error: null });
    try {
      const response = await favoritesApi.getFavoriteMovies();
      set((state) => ({
        favoriteMovies: response.data,
        loadingMovies: false,
        isLoading: state.loadingAnime || state.loadingComics,
      }));
    } catch (error) {
      set((state) => ({
        error: error.response?.data?.message || 'Failed to fetch favorites',
        loadingMovies: false,
        isLoading: state.loadingAnime || state.loadingComics,
      }));
    }
  },

  fetchFavoriteAnime: async () => {
    set({ loadingAnime: true, isLoading: true, error: null });
    try {
      const response = await favoritesApi.getFavoriteAnime();
      set((state) => ({
        favoriteAnime: response.data,
        loadingAnime: false,
        isLoading: state.loadingMovies || state.loadingComics,
      }));
    } catch (error) {
      set((state) => ({
        error: error.response?.data?.message || 'Failed to fetch favorites',
        loadingAnime: false,
        isLoading: state.loadingMovies || state.loadingComics,
      }));
    }
  },

  fetchFavoriteComics: async () => {
    set({ loadingComics: true, isLoading: true, error: null });
    try {
      const response = await favoritesApi.getFavoriteComics();
      set((state) => ({
        favoriteComics: response.data,
        loadingComics: false,
        isLoading: state.loadingMovies || state.loadingAnime,
      }));
    } catch (error) {
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

  clearFavorites: () => set({ favoriteMovies: [], favoriteAnime: [], favoriteComics: [], error: null }),
  clearError: () => set({ error: null }),
}));

export default useFavoritesStore;
