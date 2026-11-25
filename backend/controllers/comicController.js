import axios from 'axios';
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
import { cleanKeyword, isSafeSlug, parsePage, safeCacheSet } from '../utils/cache.js';

// Cache mặc định 5 phút cho danh sách mới, 10 phút cho chi tiết truyện, 24h cho chương (giới hạn maxKeys tránh tràn RAM 512MB)
const myCache = new NodeCache({ stdTTL: 600, checkperiod: 120, maxKeys: 150, useClones: false });

const getRelayConfig = () => ({
  relayUrl: (process.env.COMIC_RELAY_URL || '').replace(/\/+$/, ''),
  relaySecret: process.env.COMIC_RELAY_SECRET || '',
});

async function fetchFromRelay(path, params = {}) {
  const { relayUrl, relaySecret } = getRelayConfig();
  const response = await axios.get(`${relayUrl}${path}`, {
    params,
    timeout: 20000,
    headers: relaySecret ? { 'x-relay-secret': relaySecret } : {},
  });
  return response.data;
}

const sendCached = (res, data, maxAge = 300) => {
  res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
  return res.json(data);
};

const handleUpstreamError = (res, label, error) => {
  const upstreamStatus =
    error.response?.data?.upstreamStatus ||
    error.upstreamStatus ||
    error.response?.status ||
    null;
  console.error(`[COMIC-${label}]`, upstreamStatus || '', error.message);
  return res.status(502).json({
    message: 'Không thể lấy dữ liệu từ doctruyen3qhub.club',
    upstreamStatus,
  });
};

export const getComicSourceStatus = async (req, res) => {
  const { relayUrl } = getRelayConfig();
  if (relayUrl) {
    try {
      const status = await fetchFromRelay('/api/comics/source-status');
      return res.status(status.ok ? 200 : 502).json({ ...status, viaRelay: true });
    } catch (error) {
      return res.status(502).json({
        ok: false,
        viaRelay: true,
        status: error.response?.status || 0,
        error: error.message,
      });
    }
  }
  const status = await checkDocTruyen3QHealth();
  return res.status(status.ok ? 200 : 502).json({ ...status, viaRelay: false });
};

export const getLatestComics = async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const cacheKey = `comics_latest_${page}`;

    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return sendCached(res, cachedData, 300);
    }

    const { relayUrl } = getRelayConfig();
    const result = relayUrl
      ? await fetchFromRelay('/api/comics/latest', { page })
      : await scrapeLatestComics(page);

    if (result && result.data?.items?.length > 0) {
      safeCacheSet(myCache, cacheKey, result, 300);
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
    if (!isSafeSlug(slug)) {
      return res.status(400).json({ message: 'Invalid comic slug' });
    }
    const cacheKey = `comic_detail_${slug}`;

    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return sendCached(res, cachedData, 600);
    }

    const { relayUrl } = getRelayConfig();
    const result = relayUrl
      ? await fetchFromRelay(`/api/comics/${encodeURIComponent(slug)}`)
      : await scrapeComicDetails(slug);

    if (result) {
      safeCacheSet(myCache, cacheKey, result, 600);
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
    if (!isSafeSlug(chapterId)) {
      return res.status(400).json({ message: 'Invalid chapter id' });
    }
    const cacheKey = `comic_chapter_${chapterId}`;

    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return sendCached(res, cachedData, 86400);
    }

    const { relayUrl } = getRelayConfig();
    const data = relayUrl
      ? await fetchFromRelay(`/api/comics/chapter/${encodeURIComponent(chapterId)}`)
      : await scrapeComicChapter(chapterId);

    if (data) {
      safeCacheSet(myCache, cacheKey, data, 86400);
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

    const { relayUrl } = getRelayConfig();
    const data = relayUrl
      ? await fetchFromRelay('/api/comics/genres')
      : await scrapeGenres();

    if (data && data.data?.items?.length > 0) {
      safeCacheSet(myCache, cacheKey, data, 86400);
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
    if (!isSafeSlug(slug)) {
      return res.status(400).json({ message: 'Invalid genre slug' });
    }
    const page = parsePage(req.query.page);
    const cacheKey = `comic_genre_${slug}_${page}`;

    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return sendCached(res, cachedData, 600);
    }

    const { relayUrl } = getRelayConfig();
    const data = relayUrl
      ? await fetchFromRelay(`/api/comics/genre/${encodeURIComponent(slug)}`, { page })
      : await scrapeComicsByGenre(slug, page);

    if (data && data.data?.items?.length > 0) {
      safeCacheSet(myCache, cacheKey, data, 600);
      return sendCached(res, data, 600);
    }

    return res.status(404).json({ message: 'Category not found' });
  } catch (error) {
    return handleUpstreamError(res, 'BY_GENRE', error);
  }
};

export const searchComics = async (req, res) => {
  try {
    const keyword = cleanKeyword(req.query.keyword);
    if (!keyword) {
      return res.status(400).json({ message: 'Keyword is required' });
    }

    const { relayUrl } = getRelayConfig();
    const data = relayUrl
      ? await fetchFromRelay('/api/comics/search', { keyword })
      : await scrapeSearchComics(keyword);

    if (data && data.data?.items) {
      return res.json(data);
    }

    return res.status(404).json({ message: 'No comics found' });
  } catch (error) {
    return handleUpstreamError(res, 'SEARCH', error);
  }
};
