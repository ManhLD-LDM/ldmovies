// Shared helpers for NodeCache usage and request input validation.

// node-cache throws ECACHEFULL when maxKeys is reached. Evict the oldest key
// first and never let a cache failure break the HTTP response.
export const safeCacheSet = (cache, key, value, ttl) => {
  try {
    const maxKeys = cache.options?.maxKeys ?? -1;
    if (maxKeys > -1) {
      const keys = cache.keys();
      if (keys.length >= maxKeys) {
        cache.del(keys.slice(0, keys.length - maxKeys + 1));
      }
    }
    cache.set(key, value, ttl);
  } catch (err) {
    console.error('[CACHE] set failed:', err.message);
  }
};

export const MAX_PAGE = 500;

export const parsePage = (value) => {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_PAGE);
};

// Slugs / composite ids produced by the scraper only use these characters.
const SAFE_SLUG_RE = /^[A-Za-z0-9._-]{1,300}$/;

export const isSafeSlug = (value) =>
  typeof value === 'string' && SAFE_SLUG_RE.test(value) && !value.includes('..');

export const cleanKeyword = (value) => String(value || '').trim().slice(0, 120);
