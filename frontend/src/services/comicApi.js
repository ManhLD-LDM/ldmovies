import axios from 'axios';

// Get base URL from environment or use relative path in production
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const comicApi = {
  getLatestComics: async (page = 1) => {
    const response = await axios.get(`${API_URL}/comics/latest?page=${page}`);
    return response.data;
  },

  getComicDetails: async (slug) => {
    const response = await axios.get(`${API_URL}/comics/${slug}`);
    return response.data;
  },

  getComicChapter: async (chapterId) => {
    const response = await axios.get(`${API_URL}/comics/chapter/${chapterId}`);
    return response.data;
  },

  getGenres: async () => {
    const response = await axios.get(`${API_URL}/comics/genres`);
    return response.data;
  },

  getComicsByGenre: async (slug, page = 1) => {
    const response = await axios.get(`${API_URL}/comics/genre/${slug}?page=${page}`);
    return response.data;
  },

  searchComics: async (keyword) => {
    const response = await axios.get(`${API_URL}/comics/search?keyword=${encodeURIComponent(keyword)}`);
    return response.data;
  }
};
