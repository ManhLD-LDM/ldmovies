import axios from 'axios';
import crypto from 'crypto';
import dns from 'dns';
import fs from 'fs/promises';
import https from 'https';
import net from 'net';
import path from 'path';
import sharp from 'sharp';

// Tắt cache nội bộ của libvips và giới hạn thread để giữ RAM thấp ổn định
sharp.cache(false);
sharp.concurrency(1);

// Ép IPv4 + Keep-Alive giúp kết nối nhanh & ổn định tới các CDN truyện tại Việt Nam
const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 16, family: 4 });

const ALLOWED_HOSTS = new Set([
  'sv1.otruyencdn.com',
  'img.otruyenapi.com',
  'phimimg.com',
  'otruyenapi.com',
  'doctruyen3qhub.club',
  'anhvip.xyz',
  'topcdnv1.art',
  'uploads.mangadex.org',
  'mangadex.org',
]);

const isAllowedHost = (hostname = '') => {
  if (ALLOWED_HOSTS.has(hostname)) return true;
  return (
    hostname.endsWith('.anhvip.xyz') ||
    hostname.endsWith('.topcdnv1.art') ||
    hostname.endsWith('.doctruyen3qhub.club') ||
    hostname.endsWith('.mangadex.org') ||
    hostname.endsWith('.mangadex.network')
  );
};

function isPrivateOrReservedIp(ip = '') {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT / Tailscale
    if (a >= 224) return true;
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
    if (isPrivateOrReservedIp(hostname)) throw new Error('Blocked private IP');
    return;
  }
  const records = await dns.promises.lookup(hostname, { all: true });
  if (!records || records.length === 0) throw new Error('DNS lookup returned no addresses');
  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      throw new Error('Blocked private/internal resolved IP');
    }
  }
}

const CACHE_DIR = path.join(process.cwd(), '.cache', 'img');
const MAX_CACHE_FILES = 500;
const EVICT_TARGET_FILES = 350;
let cacheWriteCount = 0;

// Giới hạn tối đa 2 tác vụ sharp chạy đồng thời để tránh tăng vọt RAM khi bật Data Saver
const MAX_SHARP_CONCURRENCY = 2;
let activeSharpJobs = 0;
const sharpWaitQueue = [];

const withSharpSlot = async (fn) => {
  if (activeSharpJobs >= MAX_SHARP_CONCURRENCY) {
    await new Promise((resolve) => sharpWaitQueue.push(resolve));
  }
  activeSharpJobs += 1;
  try {
    return await fn();
  } finally {
    activeSharpJobs -= 1;
    const next = sharpWaitQueue.shift();
    if (next) next();
  }
};

// Gom các request nén ảnh trùng nhau đang tải để chỉ fetch upstream 1 lần
const inFlightRequests = new Map();

const SAFE_IMAGE_TYPE_MAP = {
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
};

const EXT_TO_MIME = {
  webp: 'image/webp',
  avif: 'image/avif',
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
};

const getCacheHash = (url, width, quality, format, isRaw) =>
  crypto
    .createHash('sha256')
    .update(`${url}|${width}|${quality}|${format}|${isRaw ? 'raw' : 'opt'}`)
    .digest('hex');

const pruneDiskCache = async () => {
  try {
    const files = await fs.readdir(CACHE_DIR);
    if (files.length <= MAX_CACHE_FILES) return;
    const stats = await Promise.all(
      files.map(async (name) => {
        const fullPath = path.join(CACHE_DIR, name);
        const st = await fs.stat(fullPath).catch(() => null);
        return st ? { fullPath, mtimeMs: st.mtimeMs } : null;
      })
    );
    const sorted = stats.filter(Boolean).sort((a, b) => a.mtimeMs - b.mtimeMs);
    const toDelete = sorted.slice(0, Math.max(0, sorted.length - EVICT_TARGET_FILES));
    await Promise.all(toDelete.map((f) => fs.unlink(f.fullPath).catch(() => {})));
  } catch {
    // Ignore cache pruning errors
  }
};

const readFromDiskCache = async (hash, format, isRaw) => {
  const exts = isRaw ? ['webp', 'jpg', 'png', 'avif', 'gif'] : [format];
  for (const ext of exts) {
    const filePath = path.join(CACHE_DIR, `${hash}.${ext}`);
    try {
      const buffer = await fs.readFile(filePath);
      return { buffer, contentType: EXT_TO_MIME[ext] || `image/${ext}` };
    } catch {
      // Cache miss for this extension
    }
  }
  return null;
};

const writeToDiskCache = (hash, ext, buffer) => {
  cacheWriteCount += 1;
  const shouldPrune = cacheWriteCount % 50 === 0;
  const filePath = path.join(CACHE_DIR, `${hash}.${ext}`);
  fs.mkdir(CACHE_DIR, { recursive: true })
    .then(() => fs.writeFile(filePath, buffer))
    .then(() => (shouldPrune ? pruneDiskCache() : null))
    .catch(() => {});
};

function buildUpstreamContext(target) {
  const upstreamHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  };
  const isMangaDexHost =
    target.hostname === 'uploads.mangadex.org' ||
    target.hostname === 'mangadex.org' ||
    target.hostname.endsWith('.mangadex.org') ||
    target.hostname.endsWith('.mangadex.network');

  const isDocTruyen3QHost =
    target.hostname === 'anhvip.xyz' ||
    target.hostname.endsWith('.anhvip.xyz') ||
    target.hostname === 'topcdnv1.art' ||
    target.hostname.endsWith('.topcdnv1.art') ||
    target.hostname === 'doctruyen3qhub.club' ||
    target.hostname.endsWith('.doctruyen3qhub.club');

  if (isDocTruyen3QHost) {
    upstreamHeaders.Referer = 'https://doctruyen3qhub.club/';
  } else if (isMangaDexHost) {
    upstreamHeaders.Referer = 'https://mangadex.org/';
    upstreamHeaders.Origin = 'https://mangadex.org';
  }

  return { upstreamHeaders, isMangaDexHost, isDocTruyen3QHost };
}

async function streamRawImage(target, res) {
  await assertPublicDns(target.hostname);
  const { upstreamHeaders, isDocTruyen3QHost } = buildUpstreamContext(target);
  const relayUrl = (process.env.COMIC_RELAY_URL || '').replace(/\/+$/, '');
  const relaySecret = process.env.COMIC_RELAY_SECRET || '';

  const useRelay = isDocTruyen3QHost && Boolean(relayUrl);
  const upstream = await axios.get(useRelay ? `${relayUrl}/api/raw-img` : target.href, {
    ...(useRelay ? { params: { url: target.href } } : {}),
    responseType: 'stream',
    timeout: 45000,
    maxContentLength: 15 * 1024 * 1024,
    maxRedirects: 0,
    httpsAgent: keepAliveAgent,
    headers: useRelay ? (relaySecret ? { 'x-relay-secret': relaySecret } : {}) : upstreamHeaders,
  });

  const rawContentType = String(upstream.headers['content-type'] || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const safeExt = SAFE_IMAGE_TYPE_MAP[rawContentType];
  if (!safeExt) {
    upstream.data.destroy();
    throw new Error(`Unsupported upstream content-type: ${rawContentType || 'unknown'}`);
  }

  const outHeaders = {
    'Content-Type': EXT_TO_MIME[safeExt],
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Cache': 'STREAM',
  };
  if (upstream.headers['content-length']) {
    outHeaders['Content-Length'] = upstream.headers['content-length'];
  }

  res.set(outHeaders);
  res.on('close', () => {
    if (!res.writableEnded) upstream.data.destroy();
  });
  upstream.data.on('error', () => {
    if (!res.headersSent) {
      res.status(502).end();
    } else {
      res.end();
    }
  });
  upstream.data.pipe(res);
}

async function fetchAndProcessImage({ target, width, quality, format, isRaw, cacheHash }) {
  await assertPublicDns(target.hostname);
  const { upstreamHeaders, isMangaDexHost, isDocTruyen3QHost } = buildUpstreamContext(target);

  const relayUrl = (process.env.COMIC_RELAY_URL || '').replace(/\/+$/, '');
  const relaySecret = process.env.COMIC_RELAY_SECRET || '';

  let upstream;
  if (isDocTruyen3QHost && relayUrl) {
    upstream = await axios.get(`${relayUrl}/api/raw-img`, {
      params: { url: target.href },
      responseType: 'arraybuffer',
      timeout: 45000,
      maxContentLength: 15 * 1024 * 1024,
      maxRedirects: 0,
      httpsAgent: keepAliveAgent,
      headers: relaySecret ? { 'x-relay-secret': relaySecret } : {},
    });
  } else {
    try {
      upstream = await axios.get(target.href, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 15 * 1024 * 1024,
        maxRedirects: 0,
        httpsAgent: keepAliveAgent,
        headers: upstreamHeaders,
      });
    } catch (fetchErr) {
      const fallbackUrl = target.href.replace(/\.(512|256)\.jpg$/i, '');
      if (isMangaDexHost && fallbackUrl !== target.href) {
        upstream = await axios.get(fallbackUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
          maxContentLength: 15 * 1024 * 1024,
          maxRedirects: 0,
          httpsAgent: keepAliveAgent,
          headers: upstreamHeaders,
        });
      } else {
        throw fetchErr;
      }
    }
  }

  const rawContentType = String(upstream.headers['content-type'] || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const safeExt = SAFE_IMAGE_TYPE_MAP[rawContentType];
  if (!safeExt) {
    throw new Error(`Unsupported upstream content-type: ${rawContentType || 'unknown'}`);
  }

  const rawBuffer = Buffer.from(upstream.data);
  const canPassthrough =
    isRaw ||
    ((safeExt === 'webp' || safeExt === 'avif') && rawBuffer.byteLength <= 600 * 1024 && quality >= 55);

  if (canPassthrough) {
    writeToDiskCache(cacheHash, safeExt, rawBuffer);
    return { buffer: rawBuffer, contentType: EXT_TO_MIME[safeExt] };
  }

  const outputBuffer = await withSharpSlot(async () => {
    const pipeline = sharp(rawBuffer, { limitInputPixels: 25_000_000 }).resize({
      width,
      withoutEnlargement: true,
    });
    return format === 'avif'
      ? pipeline.avif({ quality: Math.max(quality - 10, 20) }).toBuffer()
      : pipeline.webp({ quality }).toBuffer();
  });

  writeToDiskCache(cacheHash, format, outputBuffer);
  return { buffer: outputBuffer, contentType: `image/${format}` };
}

export const proxyImage = async (req, res) => {
  try {
    const { url, w = 720, q = 60, fmt = 'webp', raw = '0' } = req.query;

    if (!url) {
      return res.status(400).json({ message: 'Thiếu tham số url' });
    }

    let target;
    try {
      target = new URL(url);
    } catch {
      return res.status(400).json({ message: 'URL không hợp lệ' });
    }

    // SSRF Protection: HTTPS only + whitelist trusted image domains
    if (target.protocol !== 'https:' || !isAllowedHost(target.hostname)) {
      return res.status(403).json({ message: 'Domain hoặc giao thức nguồn không được phép' });
    }

    const isRaw = raw === '1';

    // Chế độ raw=1: stream trực tiếp từ upstream ra client (gần như 0MB RAM, không đệm buffer lớn)
    if (isRaw) {
      await streamRawImage(target, res);
      return;
    }

    const width = Math.min(Math.max(parseInt(w, 10) || 720, 100), 1280);
    const quality = Math.min(Math.max(parseInt(q, 10) || 60, 20), 85);
    const format = fmt === 'avif' ? 'avif' : 'webp';

    const cacheHash = getCacheHash(target.href, width, quality, format, isRaw);

    const cached = await readFromDiskCache(cacheHash, format, isRaw);
    if (cached) {
      res.set({
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'X-Content-Type-Options': 'nosniff',
        'X-Cache': 'HIT',
      });
      return res.end(cached.buffer);
    }

    let pendingPromise = inFlightRequests.get(cacheHash);
    if (!pendingPromise) {
      pendingPromise = fetchAndProcessImage({ target, width, quality, format, isRaw, cacheHash }).finally(() => {
        inFlightRequests.delete(cacheHash);
      });
      inFlightRequests.set(cacheHash, pendingPromise);
    }

    const { buffer, contentType } = await pendingPromise;

    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Cache': 'MISS',
      'Content-Length': buffer.length,
    });

    return res.end(buffer);
  } catch (err) {
    console.error('[IMG-PROXY-ERROR]', err.response?.status || '', req.query.url, err.message);
    if (!res.headersSent) {
      return res.status(502).json({ message: 'Không thể xử lý hoặc tải ảnh từ nguồn' });
    }
    return res.end();
  }
};
