import NodeCache from 'node-cache';
import {
  checkDocTruyen3QHealth,
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

const handleUpstreamError = (res, label, error) => {
  const upstreamStatus = error.upstreamStatus || error.response?.status || null;
  console.error(`[COMIC-${label}]`, upstreamStatus || '', error.message);
  return res.status(502).json({
    message: 'Không thể lấy dữ liệu từ doctruyen3qhub.club',
    upstreamStatus,
  });
};

export const getComicSourceStatus = async (req, res) => {
  const status = await checkDocTruyen3QHealth();
  return res.status(status.ok ? 200 : 502).json(status);
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
      myCache.set(cacheKey, result, 300);
      return sendCached(res, result, 300);
    }

    return res.status(404).json({ message: 'No comics found' });
  } catch (error) {
    return handleUpstreamError(res, 'LATEST', error);
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
    return handleUpstreamError(res, 'DETAIL', error);
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
    return handleUpstreamError(res, 'CHAPTER', error);
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
    return handleUpstreamError(res, 'GENRES', error);
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
    return handleUpstreamError(res, 'BY_GENRE', error);
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
    return handleUpstreamError(res, 'SEARCH', error);
  }
};
