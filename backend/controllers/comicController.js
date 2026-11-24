import NodeCache from 'node-cache';
import {
  scrapeComicChapter,
  scrapeComicDetails,
  scrapeComicsByGenre,
  scrapeGenres,
  scrapeLatestComics,
  scrapeSearchComics,
} from '../services/doctruyen3qScraper.js';
import {
  mdGetComicChapter,
  mdGetComicDetails,
  mdGetComicsByGenre,
  mdGetGenres,
  mdGetLatestComics,
  mdSearchComics,
} from '../services/mangadexAdapter.js';

// Cache mặc định 5 phút cho danh sách mới, 10 phút cho chi tiết truyện, 24h cho chương
const myCache = new NodeCache({ stdTTL: 600, checkperiod: 620 });

// Nếu nguồn chính (doctruyen3qhub) bị chặn IP cloud (ví dụ trên Render), tạm bỏ qua trong 5 phút
let primaryDownUntil = 0;

async function fetchWithFallback(label, primaryFn, fallbackFn) {
  const now = Date.now();
  if (now >= primaryDownUntil) {
    try {
      const primaryResult = await primaryFn();
      if (primaryResult && (primaryResult.data?.items?.length > 0 || primaryResult.data?.chapters)) {
        return primaryResult;
      }
      console.warn(`[COMIC] Nguồn chính (${label}) trả dữ liệu rỗng, chuyển sang MangaDex fallback.`);
    } catch (err) {
      const status = err.response?.status;
      console.warn(`[COMIC] Nguồn chính (${label}) lỗi (${status || err.message}), tạm dùng MangaDex fallback 5 phút.`);
      primaryDownUntil = now + 5 * 60 * 1000;
    }
  }
  return fallbackFn();
}

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

    const result = await fetchWithFallback(
      'latest',
      () => scrapeLatestComics(page),
      () => mdGetLatestComics(page)
    );

    if (result && result.data?.items?.length > 0) {
      myCache.set(cacheKey, result, 300);
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

    const result = slug.startsWith('md--')
      ? await mdGetComicDetails(slug)
      : await scrapeComicDetails(slug);

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

    const data = chapterId.startsWith('md--')
      ? await mdGetComicChapter(chapterId)
      : await scrapeComicChapter(chapterId);

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

    const data = await fetchWithFallback(
      'genres',
      () => scrapeGenres(),
      () => mdGetGenres()
    );

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

    const data = slug.startsWith('md--')
      ? await mdGetComicsByGenre(slug, page)
      : await fetchWithFallback(
          `genre:${slug}`,
          () => scrapeComicsByGenre(slug, page),
          () => mdGetComicsByGenre(slug, page)
        );

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

    const data = await fetchWithFallback(
      `search:${keyword}`,
      () => scrapeSearchComics(keyword),
      () => mdSearchComics(keyword)
    );

    if (data && data.data?.items) {
      return res.json(data);
    }

    return res.status(404).json({ message: 'No comics found' });
  } catch (error) {
    console.error('Error searching comics:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};
