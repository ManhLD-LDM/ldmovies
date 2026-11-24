import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const ALLOWED_HOSTS = new Set([
  'sv1.otruyencdn.com',
  'img.otruyenapi.com',
  'phimimg.com',
  'otruyenapi.com',
  'doctruyen3qhub.club',
  'anhvip.xyz',
]);

const isAllowedHost = (hostname = '') => {
  if (ALLOWED_HOSTS.has(hostname)) return true;
  return (
    hostname.endsWith('.anhvip.xyz') ||
    hostname.endsWith('.doctruyen3qhub.club')
  );
};

const CACHE_DIR = path.join(process.cwd(), '.cache', 'img');

const getCacheKey = (url, width, quality, format) => {
  return crypto.createHash('sha1').update(`${url}|${width}|${quality}|${format}`).digest('hex') + '.' + format;
};

export const proxyImage = async (req, res) => {
  try {
    const { url, w = 720, q = 60, fmt = 'webp' } = req.query;

    if (!url) {
      return res.status(400).json({ message: 'Thiếu tham số url' });
    }

    let target;
    try {
      target = new URL(url);
    } catch {
      return res.status(400).json({ message: 'URL không hợp lệ' });
    }

    // SSRF Protection: Whitelist trusted image domains only
    if (!isAllowedHost(target.hostname)) {
      return res.status(403).json({ message: 'Domain nguồn không được phép' });
    }

    const width = Math.min(Math.max(parseInt(w, 10) || 720, 100), 1280);
    const quality = Math.min(Math.max(parseInt(q, 10) || 60, 20), 85);
    const format = fmt === 'avif' ? 'avif' : 'webp';

    const cacheFilename = getCacheKey(target.href, width, quality, format);
    const cacheFilePath = path.join(CACHE_DIR, cacheFilename);

    // Try serving from disk cache first
    try {
      const cached = await fs.readFile(cacheFilePath);
      res.set({
        'Content-Type': `image/${format}`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'HIT',
      });
      return res.end(cached);
    } catch {
      // Cache miss -> fetch from upstream
    }

    const upstreamHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    };
    if (
      target.hostname === 'anhvip.xyz' ||
      target.hostname.endsWith('.anhvip.xyz') ||
      target.hostname === 'doctruyen3qhub.club' ||
      target.hostname.endsWith('.doctruyen3qhub.club')
    ) {
      upstreamHeaders.Referer = 'https://doctruyen3qhub.club/';
    }

    const upstream = await axios.get(target.href, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 15 * 1024 * 1024, // 15MB limit
      headers: upstreamHeaders,
    });

    const pipeline = sharp(upstream.data).resize({ width, withoutEnlargement: true });
    const outputBuffer = format === 'avif'
      ? await pipeline.avif({ quality: Math.max(quality - 10, 20) }).toBuffer()
      : await pipeline.webp({ quality }).toBuffer();

    // Async write to disk cache (fire and forget)
    fs.mkdir(CACHE_DIR, { recursive: true })
      .then(() => fs.writeFile(cacheFilePath, outputBuffer))
      .catch(() => {});

    res.set({
      'Content-Type': `image/${format}`,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Cache': 'MISS',
      'Content-Length': outputBuffer.length,
    });

    return res.end(outputBuffer);
  } catch (err) {
    console.error('[IMG-PROXY-ERROR]', err.message);
    return res.status(502).json({ message: 'Không thể xử lý hoặc tải ảnh từ nguồn' });
  }
};
