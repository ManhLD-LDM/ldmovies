import NodeCache from 'node-cache';
import {
  scrapeComicChapter,
  scrapeComicDetails,
  scrapeComicsByGenre,
  scrapeGenres,
  scrapeLatestComics,
  scrapeSearchComics,
} from '../services/doctruyen3qScraper.js';

// Cache mặc định 5 phút cho danh sách mới, 10 phút cho chi tiết truyện, 24h cho chương
const myCache = new NodeCache({ stdTTL: 600, checkperiod: 620 });

const sendCached = (res, data, maxAge = 300) => {
  res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
  return res.json(data);
};

export const getLatestComics = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const cacheKey = `comics_latest_${page}`;

    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return sendCached(res, cachedData, 300);
    }

    const result = await scrapeLatestComics(page);
    if (result && result.data?.items?.length > 0) {
      myCache.set(cacheKey, result, 300); // Cache 5 phút để cập nhật truyện mới nhanh
      return sendCached(res, result, 300);
    }

    return res.status(404).json({ message: 'No comics found' });
  } catch (error) {
    console.error('Error fetching latest comics:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getComicDetails = async (req, res) => {
  try {
    const { slug } = req.params;
    const cacheKey = `comic_detail_${slug}`;

    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return sendCached(res, cachedData, 600);
    }

    const result = await scrapeComicDetails(slug);
    if (result) {
      myCache.set(cacheKey, result, 600);
      return sendCached(res, result, 600);
    }

    return res.status(404).json({ message: 'Comic not found' });
  } catch (error) {
    console.error('Error fetching comic details:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getComicChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const cacheKey = `comic_chapter_${chapterId}`;

    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return sendCached(res, cachedData, 86400);
    }

    const data = await scrapeComicChapter(chapterId);
    if (data) {
      myCache.set(cacheKey, data, 86400);
      return sendCached(res, data, 86400);
    }

    return res.status(404).json({ message: 'Chapter not found' });
  } catch (error) {
    console.error('Error fetching comic chapter:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getGenres = async (req, res) => {
  try {
    const cacheKey = 'comic_genres';
    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return sendCached(res, cachedData, 86400);
    }

    const data = await scrapeGenres();
    if (data && data.data?.items?.length > 0) {
      myCache.set(cacheKey, data, 86400);
      return sendCached(res, data, 86400);
    }

    return res.status(404).json({ message: 'Genres not found' });
  } catch (error) {
    console.error('Error fetching genres:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getComicsByGenre = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = req.query.page || 1;
    const cacheKey = `comic_genre_${slug}_${page}`;

    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return sendCached(res, cachedData, 600);
    }

    const data = await scrapeComicsByGenre(slug, page);
    if (data && data.data?.items?.length > 0) {
      myCache.set(cacheKey, data, 600);
      return sendCached(res, data, 600);
    }

    return res.status(404).json({ message: 'Category not found' });
  } catch (error) {
    console.error('Error fetching comics by genre:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const searchComics = async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) {
      return res.status(400).json({ message: 'Keyword is required' });
    }

    const data = await scrapeSearchComics(keyword);
    if (data && data.data?.items) {
      return res.json(data);
    }

    return res.status(404).json({ message: 'No comics found' });
  } catch (error) {
    console.error('Error searching comics:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};
