import axios from 'axios';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import https from 'https';
import NodeCache from 'node-cache';
import {
  checkDocTruyen3QHealth,
  DOCTRUYEN3Q_BASE_URL,
  scrapeComicChapter,
  scrapeComicDetails,
  scrapeComicsByGenre,
  scrapeGenres,
  scrapeLatestComics,
  scrapeSearchComics,
} from './services/doctruyen3qScraper.js';

dotenv.config();

const app = express();
const PORT = process.env.RELAY_PORT || 4000;
const RELAY_SECRET = process.env.COMIC_RELAY_SECRET || '';
const relayCache = new NodeCache({ stdTTL: 600, checkperiod: 620 });
const ipv4Agent = new https.Agent({ family: 4 });

const RAW_IMG_ALLOWED = (hostname = '') =>
  hostname === 'anhvip.xyz' ||
  hostname.endsWith('.anhvip.xyz') ||
  hostname === 'topcdnv1.art' ||
  hostname.endsWith('.topcdnv1.art') ||
  hostname === 'doctruyen3qhub.club' ||
  hostname.endsWith('.doctruyen3qhub.club');

app.use(compression());
app.use(cors());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ldmovies-comic-relay',
    source: DOCTRUYEN3Q_BASE_URL,
    timestamp: new Date().toISOString(),
  });
});

// Require shared secret for all /api/* requests when COMIC_RELAY_SECRET is configured
app.use('/api', (req, res, next) => {
  if (RELAY_SECRET) {
    const provided = req.get('x-relay-secret') || '';
    if (provided !== RELAY_SECRET) {
      return res.status(401).json({ message: 'Unauthorized relay request' });
    }
  }
  next();
});

app.get('/api/comics/source-status', async (req, res) => {
  const status = await checkDocTruyen3QHealth();
  return res.status(status.ok ? 200 : 502).json(status);
});

app.get('/api/comics/latest', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const key = `relay_latest_${page}`;
    const cached = relayCache.get(key);
    if (cached) return res.json(cached);

    const data = await scrapeLatestComics(page);
    if (data?.data?.items?.length > 0) {
      relayCache.set(key, data, 300);
      return res.json(data);
    }
    return res.status(404).json({ message: 'No comics found' });
  } catch (err) {
    console.error('[RELAY-LATEST]', err.message);
    return res.status(502).json({ message: err.message, upstreamStatus: err.upstreamStatus || null });
  }
});

app.get('/api/comics/genres', async (req, res) => {
  try {
    const key = 'relay_genres';
    const cached = relayCache.get(key);
    if (cached) return res.json(cached);

    const data = await scrapeGenres();
    if (data?.data?.items?.length > 0) {
      relayCache.set(key, data, 86400);
      return res.json(data);
    }
    return res.status(404).json({ message: 'Genres not found' });
  } catch (err) {
    console.error('[RELAY-GENRES]', err.message);
    return res.status(502).json({ message: err.message, upstreamStatus: err.upstreamStatus || null });
  }
});

app.get('/api/comics/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) return res.status(400).json({ message: 'Keyword is required' });

    const data = await scrapeSearchComics(keyword);
    return res.json(data);
  } catch (err) {
    console.error('[RELAY-SEARCH]', err.message);
    return res.status(502).json({ message: err.message, upstreamStatus: err.upstreamStatus || null });
  }
});

app.get('/api/comics/genre/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const page = req.query.page || 1;
    const key = `relay_genre_${slug}_${page}`;
    const cached = relayCache.get(key);
    if (cached) return res.json(cached);

    const data = await scrapeComicsByGenre(slug, page);
    if (data?.data?.items?.length > 0) {
      relayCache.set(key, data, 600);
      return res.json(data);
    }
    return res.status(404).json({ message: 'Category not found' });
  } catch (err) {
    console.error('[RELAY-BY-GENRE]', err.message);
    return res.status(502).json({ message: err.message, upstreamStatus: err.upstreamStatus || null });
  }
});

app.get('/api/comics/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const key = `relay_detail_${slug}`;
    const cached = relayCache.get(key);
    if (cached) return res.json(cached);

    const data = await scrapeComicDetails(slug);
    if (data) {
      relayCache.set(key, data, 600);
      return res.json(data);
    }
    return res.status(404).json({ message: 'Comic not found' });
  } catch (err) {
    console.error('[RELAY-DETAIL]', err.message);
    return res.status(502).json({ message: err.message, upstreamStatus: err.upstreamStatus || null });
  }
});

app.get('/api/comics/chapter/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const key = `relay_chap_${chapterId}`;
    const cached = relayCache.get(key);
    if (cached) return res.json(cached);

    const data = await scrapeComicChapter(chapterId);
    if (data) {
      relayCache.set(key, data, 86400);
      return res.json(data);
    }
    return res.status(404).json({ message: 'Chapter not found' });
  } catch (err) {
    console.error('[RELAY-CHAPTER]', err.message);
    return res.status(502).json({ message: err.message, upstreamStatus: err.upstreamStatus || null });
  }
});

app.get('/api/raw-img', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ message: 'Missing url' });

    let target;
    try {
      target = new URL(url);
    } catch {
      return res.status(400).json({ message: 'Invalid url' });
    }

    if (!RAW_IMG_ALLOWED(target.hostname)) {
      return res.status(403).json({ message: 'Host not allowed' });
    }

    const upstream = await axios.get(target.href, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 15 * 1024 * 1024,
      httpsAgent: ipv4Agent,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: `${DOCTRUYEN3Q_BASE_URL}/`,
      },
    });

    res.set({
      'Content-Type': upstream.headers['content-type'] || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    });
    return res.send(Buffer.from(upstream.data));
  } catch (err) {
    console.error('[RELAY-RAW-IMG]', err.response?.status || '', err.message);
    return res.status(502).json({ message: 'Failed to fetch upstream image' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[COMIC-RELAY] Running on http://0.0.0.0:${PORT} | Source: ${DOCTRUYEN3Q_BASE_URL} | Secret: ${RELAY_SECRET ? 'ENABLED' : 'DISABLED'}`);
});
