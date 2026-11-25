import axios from 'axios';
import compression from 'compression';
import crypto from 'crypto';
import dns from 'dns';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import https from 'https';
import net from 'net';
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
import { isSafeSlug, parsePage, safeCacheSet } from './utils/cache.js';

dotenv.config();

const PORT = Number(process.env.RELAY_PORT) || 4123;
const RELAY_SECRET = process.env.COMIC_RELAY_SECRET || '';

// Fail-closed: never start relay without a strong shared secret
if (!RELAY_SECRET || RELAY_SECRET.length < 32) {
  console.error('[COMIC-RELAY][FATAL] COMIC_RELAY_SECRET must be at least 32 characters.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const relayCache = new NodeCache({ stdTTL: 600, checkperiod: 120, maxKeys: 200, useClones: false });
const ipv4Agent = new https.Agent({ family: 4 });

const RAW_IMG_ALLOWED = (hostname = '') =>
  hostname === 'anhvip.xyz' ||
  hostname.endsWith('.anhvip.xyz') ||
  hostname === 'topcdnv1.art' ||
  hostname.endsWith('.topcdnv1.art') ||
  hostname === 'doctruyen3qhub.club' ||
  hostname.endsWith('.doctruyen3qhub.club');

// Same allow-list as the backend image proxy (no SVG / HTML passthrough)
const RAW_IMG_SAFE_TYPES = new Set(['image/webp', 'image/avif', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif']);
const RAW_IMG_MAX_BYTES = 15 * 1024 * 1024;

function isPrivateOrReservedIp(ip = '') {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true; // 0.0.0.0/8, 10.0.0.0/8, loopback
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT / Tailscale)
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
      return true;
    }
    if (lower.startsWith('::ffff:')) {
      return isPrivateOrReservedIp(lower.slice(7));
    }
    return false;
  }
  return true;
}

async function assertPublicDns(hostname) {
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error('Blocked private IP');
    }
    return;
  }
  const records = await dns.promises.lookup(hostname, { all: true });
  if (!records || records.length === 0) {
    throw new Error('DNS lookup returned no addresses');
  }
  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      throw new Error('Blocked private/internal resolved IP');
    }
  }
}

function verifyRelaySecret(provided = '') {
  const a = Buffer.from(String(provided), 'utf8');
  const b = Buffer.from(RELAY_SECRET, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

// Rate-limit all requests to prevent abuse/DoS on home server
const relayLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests' },
});
app.use(relayLimiter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Require constant-time verified secret for all /api/* requests
app.use('/api', (req, res, next) => {
  const provided = req.get('x-relay-secret') || '';
  if (!verifyRelaySecret(provided)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
});

app.get('/api/comics/source-status', async (req, res) => {
  const status = await checkDocTruyen3QHealth();
  return res.status(status.ok ? 200 : 502).json(status);
});

app.get('/api/comics/latest', async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const key = `relay_latest_${page}`;
    const cached = relayCache.get(key);
    if (cached) return res.json(cached);

    const data = await scrapeLatestComics(page);
    if (data?.data?.items?.length > 0) {
      safeCacheSet(relayCache, key, data, 300);
      return res.json(data);
    }
    return res.status(404).json({ message: 'No comics found' });
  } catch (err) {
    console.error('[RELAY-LATEST]', err.message);
    return res.status(502).json({ message: 'Upstream error', upstreamStatus: err.upstreamStatus || null });
  }
});

app.get('/api/comics/genres', async (req, res) => {
  try {
    const key = 'relay_genres';
    const cached = relayCache.get(key);
    if (cached) return res.json(cached);

    const data = await scrapeGenres();
    if (data?.data?.items?.length > 0) {
      safeCacheSet(relayCache, key, data, 86400);
      return res.json(data);
    }
    return res.status(404).json({ message: 'Genres not found' });
  } catch (err) {
    console.error('[RELAY-GENRES]', err.message);
    return res.status(502).json({ message: 'Upstream error', upstreamStatus: err.upstreamStatus || null });
  }
});

app.get('/api/comics/search', async (req, res) => {
  try {
    const keyword = String(req.query.keyword || '').trim().slice(0, 120);
    if (!keyword) return res.status(400).json({ message: 'Keyword is required' });

    const data = await scrapeSearchComics(keyword);
    return res.json(data);
  } catch (err) {
    console.error('[RELAY-SEARCH]', err.message);
    return res.status(502).json({ message: 'Upstream error', upstreamStatus: err.upstreamStatus || null });
  }
});

app.get('/api/comics/genre/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!isSafeSlug(slug)) return res.status(400).json({ message: 'Invalid id' });
    const page = parsePage(req.query.page);
    const key = `relay_genre_${slug}_${page}`;
    const cached = relayCache.get(key);
    if (cached) return res.json(cached);

    const data = await scrapeComicsByGenre(slug, page);
    if (data?.data?.items?.length > 0) {
      safeCacheSet(relayCache, key, data, 600);
      return res.json(data);
    }
    return res.status(404).json({ message: 'Category not found' });
  } catch (err) {
    console.error('[RELAY-BY-GENRE]', err.message);
    return res.status(502).json({ message: 'Upstream error', upstreamStatus: err.upstreamStatus || null });
  }
});

app.get('/api/comics/chapter/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    if (!isSafeSlug(chapterId)) return res.status(400).json({ message: 'Invalid id' });
    const key = `relay_chap_${chapterId}`;
    const cached = relayCache.get(key);
    if (cached) return res.json(cached);

    const data = await scrapeComicChapter(chapterId);
    if (data) {
      safeCacheSet(relayCache, key, data, 86400);
      return res.json(data);
    }
    return res.status(404).json({ message: 'Chapter not found' });
  } catch (err) {
    console.error('[RELAY-CHAPTER]', err.message);
    return res.status(502).json({ message: 'Upstream error', upstreamStatus: err.upstreamStatus || null });
  }
});

app.get('/api/comics/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!isSafeSlug(slug)) return res.status(400).json({ message: 'Invalid id' });
    const key = `relay_detail_${slug}`;
    const cached = relayCache.get(key);
    if (cached) return res.json(cached);

    const data = await scrapeComicDetails(slug);
    if (data) {
      safeCacheSet(relayCache, key, data, 600);
      return res.json(data);
    }
    return res.status(404).json({ message: 'Comic not found' });
  } catch (err) {
    console.error('[RELAY-DETAIL]', err.message);
    return res.status(502).json({ message: 'Upstream error', upstreamStatus: err.upstreamStatus || null });
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

    if (target.protocol !== 'https:' || !RAW_IMG_ALLOWED(target.hostname)) {
      return res.status(403).json({ message: 'Host or protocol not allowed' });
    }

    // Block private/internal/Tailscale IPs to protect co-located services
    await assertPublicDns(target.hostname);

    // Stream thay vì buffer cả ảnh (3–4MB) vào RAM; timeout khớp với backend (45s)
    const upstream = await axios.get(target.href, {
      responseType: 'stream',
      timeout: 45000,
      maxRedirects: 0, // Prevent open redirect SSRF into internal services
      httpsAgent: ipv4Agent,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: `${DOCTRUYEN3Q_BASE_URL}/`,
      },
    });

    const contentType = String(upstream.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const declaredLength = Number(upstream.headers['content-length']) || 0;
    if (!RAW_IMG_SAFE_TYPES.has(contentType) || declaredLength > RAW_IMG_MAX_BYTES) {
      upstream.data.destroy();
      return res.status(502).json({ message: 'Upstream did not return an acceptable image' });
    }

    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      ...(declaredLength > 0 ? { 'Content-Length': String(declaredLength) } : {}),
    });

    let streamedBytes = 0;
    upstream.data.on('data', (chunk) => {
      streamedBytes += chunk.length;
      if (streamedBytes > RAW_IMG_MAX_BYTES) {
        upstream.data.destroy(new Error('Upstream image exceeded size limit'));
      }
    });
    upstream.data.setTimeout?.(60000, () => {
      upstream.data.destroy(new Error('Upstream image stream idle timeout'));
    });
    res.on('close', () => {
      if (!res.writableEnded) upstream.data.destroy();
    });
    upstream.data.on('error', (streamErr) => {
      console.error('[RELAY-RAW-IMG] stream', streamErr.message);
      if (!res.headersSent) res.status(502).end();
      else res.end();
    });
    return upstream.data.pipe(res);
  } catch (err) {
    console.error('[RELAY-RAW-IMG]', err.response?.status || '', err.message);
    if (res.headersSent) return res.end();
    return res.status(502).json({ message: 'Failed to fetch upstream image' });
  }
});

// Bind strictly to 127.0.0.1 so only Tailscale Funnel on loopback can reach it
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[COMIC-RELAY] Hardened relay listening on 127.0.0.1:${PORT}`);
});
