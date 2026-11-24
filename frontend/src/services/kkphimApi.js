import axios from 'axios';
import { nguoncApi, NGUONC_SLUG_PREFIX } from './nguoncApi.js';

// PhimAPI - Primary Movie & Anime API (merged with NguonC)
const PHIMAPI_BASE_URL = 'https://phimapi.com';
const CDN_IMAGE_URL = 'https://phimimg.com';

const phimApiClient = axios.create({
  baseURL: PHIMAPI_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simple in-memory cache for API responses
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getWithCache = async (url, config = {}) => {
  const cacheKey = url + JSON.stringify(config.params || {});
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  
  const response = await phimApiClient.get(url, config);
  apiCache.set(cacheKey, { timestamp: Date.now(), response });
  return response;
};

// Chuẩn hóa URL ảnh từ PhimAPI
export const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${CDN_IMAGE_URL}/${url.replace(/^\/+/, '')}`;
};

// Tạo slug chuẩn tiếng Việt (hỗ trợ đ/Đ)
export const toCategorySlug = (str = '') =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

// Chuẩn hóa slug/tiêu đề phần 1 để khử trùng lặp giữa KKPhim và NguonC (giữ nguyên Phần 2, 3...)
const normalizeBaseSlug = (slug = '') =>
  String(slug || '')
    .replace(/^nc--/, '')
    .replace(/-(?:phan|season|mua)-1$/i, '');

const normalizeBaseTitle = (str = '') =>
  toCategorySlug(str).replace(/-(?:phan|season|mua)-1$/i, '');

// Gộp và khử trùng lặp danh sách phim từ KKPhim (ưu tiên) và NguonC
function mergeUniqueContent(primaryItems = [], secondaryItems = []) {
  const seenSlugs = new Set();
  const seenTitles = new Set();
  const seenOrigins = new Set();
  const seenTmdb = new Set();
  const seenImdb = new Set();
  const merged = [];

  const addItem = (item) => {
    if (!item) return;
    const baseSlug = normalizeBaseSlug(item.rawSlug || item.slug || '');
    const baseTitle = normalizeBaseTitle(item.name || '');
    const baseOrigin = normalizeBaseTitle(item.origin_name || '');
    const year = item.year || '';
    const titleKey = baseTitle ? `${baseTitle}|${year}` : '';
    const originKey = baseOrigin ? `${baseOrigin}|${year}` : '';
    const tmdbKey = item.tmdb?.id
      ? `${String(item.tmdb.type || '').toLowerCase()}:${item.tmdb.id}:s${Number(item.tmdb.season) || 1}`
      : '';
    const imdbKey =
      item.imdb?.id && (item.type === 'single' || item.tmdb?.type === 'movie')
        ? String(item.imdb.id).toLowerCase()
        : '';

    if (baseSlug && seenSlugs.has(baseSlug)) return;
    if (titleKey && seenTitles.has(titleKey)) return;
    if (originKey && seenOrigins.has(originKey)) return;
    if (tmdbKey && seenTmdb.has(tmdbKey)) return;
    if (imdbKey && seenImdb.has(imdbKey)) return;

    if (baseSlug) seenSlugs.add(baseSlug);
    if (titleKey) seenTitles.add(titleKey);
    if (originKey) seenOrigins.add(originKey);
    if (tmdbKey) seenTmdb.add(tmdbKey);
    if (imdbKey) seenImdb.add(imdbKey);
    merged.push(item);
  };

  primaryItems.forEach(addItem);
  secondaryItems.forEach(addItem);
  return merged;
}

const sortByModifiedDesc = (items = []) =>
  [...items].sort((a, b) => new Date(b.modifiedTime || 0) - new Date(a.modifiedTime || 0));

const buildMergedPagination = (kkPagination, ncPaginate, page, ncPagesPerUiPage = 1) => {
  const kkTotalPages = Number(kkPagination?.totalPages) || 0;
  const ncTotalPages = ncPaginate?.total_page
    ? Math.ceil(Number(ncPaginate.total_page) / ncPagesPerUiPage)
    : 0;
  const totalPages = Math.max(1, kkTotalPages, ncTotalPages);
  const totalItems = Math.max(
    Number(kkPagination?.totalItems) || 0,
    Number(ncPaginate?.total_items) || 0
  );
  return {
    ...(kkPagination || {}),
    currentPage: page,
    totalPages,
    totalItems,
  };
};

// Transform data to consistent format
const transformAnime = (item) => ({
  id: item._id,
  slug: item.slug,
  name: item.name,
  origin_name: item.origin_name,
  poster: formatImageUrl(item.poster_url),
  thumb_url: formatImageUrl(item.thumb_url),
  year: item.year,
  quality: item.quality,
  lang: item.lang,
  time: item.time,
  episode_current: item.episode_current,
  category: item.category?.map(c => c.name) || [],
  categoryList: item.category?.map(c => ({
    name: c.name,
    slug: c.slug || toCategorySlug(c.name),
  })) || [],
  country: item.country?.map(c => c.name) || [],
  type: item.type || 'single', // Store original type from API
  tmdb: item.tmdb || null,
  imdb: item.imdb || null,
  modifiedTime: item.modified?.time || null,
});

// Predefined categories list
const CATEGORIES = [
  {"_id":"9822be111d2ccc29c7172c78b8af8ff5","name":"Hành Động","slug":"hanh-dong"},
  {"_id":"d111447ee87ec1a46a31182ce4623662","name":"Miền Tây","slug":"mien-tay"},
  {"_id":"0c853f6238e0997ee318b646bb1978bc","name":"Trẻ Em","slug":"tre-em"},
  {"_id":"f8ec3e9b77c509fdf64f0c387119b916","name":"Lịch Sử","slug":"lich-su"},
  {"_id":"3a17c7283b71fa84e5a8d76fb790ed3e","name":"Cổ Trang","slug":"co-trang"},
  {"_id":"1bae5183d681b7649f9bf349177f7123","name":"Chiến Tranh","slug":"chien-tranh"},
  {"_id":"68564911f00849030f9c9c144ea1b931","name":"Viễn Tưởng","slug":"vien-tuong"},
  {"_id":"4db8d7d4b9873981e3eeb76d02997d58","name":"Kinh Dị","slug":"kinh-di"},
  {"_id":"1645fa23fa33651cef84428b0dcc2130","name":"Tài Liệu","slug":"tai-lieu"},
  {"_id":"2fb53017b3be83cd754a08adab3e916c","name":"Bí Ẩn","slug":"bi-an"},
  {"_id":"4b4457a1af8554c282dc8ac41fd7b4a1","name":"Phim 18+","slug":"phim-18"},
  {"_id":"bb2b4b030608ca5984c8dd0770f5b40b","name":"Tình Cảm","slug":"tinh-cam"},
  {"_id":"a7b065b92ad356387ef2e075dee66529","name":"Tâm Lý","slug":"tam-ly"},
  {"_id":"591bbb2abfe03f5aa13c08f16dfb69a2","name":"Thể Thao","slug":"the-thao"},
  {"_id":"66c78b23908113d478d8d85390a244b4","name":"Phiêu Lưu","slug":"phieu-luu"},
  {"_id":"252e74b4c832ddb4233d7499f5ed122e","name":"Âm Nhạc","slug":"am-nhac"},
  {"_id":"a2492d6cbc4d58f115406ca14e5ec7b6","name":"Gia Đình","slug":"gia-dinh"},
  {"_id":"01c8abbb7796a1cf1989616ca5c175e6","name":"Học Đường","slug":"hoc-duong"},
  {"_id":"ba6fd52e5a3aca80eaaf1a3b50a182db","name":"Hài Hước","slug":"hai-huoc"},
  {"_id":"7a035ac0b37f5854f0f6979260899c90","name":"Hình Sự","slug":"hinh-su"},
  {"_id":"578f80eb493b08d175c7a0c29687cbdf","name":"Võ Thuật","slug":"vo-thuat"},
  {"_id":"0bcf4077916678de9b48c89221fcf8ae","name":"Khoa Học","slug":"khoa-hoc"},
  {"_id":"2276b29204c46f75064735477890afd6","name":"Thần Thoại","slug":"than-thoai"},
  {"_id":"37a7b38b6184a5ebd3c43015aa20709d","name":"Chính Kịch","slug":"chinh-kich"},
  {"_id":"268385d0de78827ff7bb25c35036ee2a","name":"Kinh Điển","slug":"kinh-dien"},
  {"_id":"4f02d28224c0747511790d57fbb63a62","name":"Phim Ngắn","slug":"phim-ngan"},
  {"_id":"nc-gay-can","name":"Gây Cấn","slug":"gay-can"},
  {"_id":"nc-gia-tuong","name":"Giả Tưởng","slug":"gia-tuong"},
  {"_id":"nc-lang-man","name":"Lãng Mạn","slug":"lang-man"},
  {"_id":"kk-tv-shows","name":"TV Shows","slug":"tv-shows"}
];

export const kkphimApi = {
  // Get latest updated anime (newest first) - KKPhim + NguonC
  getLatestAnime: async (page = 1, limit = 24) => {
    const [kkRes, ncRes] = await Promise.allSettled([
      getWithCache(`/v1/api/danh-sach/hoat-hinh`, {
        params: { page, limit, sort_field: 'modified.time', sort_type: 'desc' },
      }),
      nguoncApi.getByCategory('hoat-hinh', page, 2),
    ]);
    const kkItems =
      kkRes.status === 'fulfilled'
        ? kkRes.value.data?.data?.items?.map((item) => ({ ...transformAnime(item), type: item.type || 'hoathinh' })) || []
        : [];
    const ncItems = ncRes.status === 'fulfilled' ? ncRes.value.data || [] : [];
    const merged = sortByModifiedDesc(mergeUniqueContent(kkItems, ncItems));
    return {
      data: merged.slice(0, limit),
      pagination: kkRes.status === 'fulfilled' ? kkRes.value.data?.data?.params?.pagination || {} : {},
    };
  },

  // Get latest updated movies (newest first) - KKPhim + NguonC
  getLatestMovies: async (page = 1, limit = 24) => {
    try {
      const [moviesRes, seriesRes, ncMoviesRes, ncSeriesRes] = await Promise.allSettled([
        getWithCache(`/v1/api/danh-sach/phim-le`, { params: { page, limit: Math.ceil(limit / 2), sort_field: 'modified.time', sort_type: 'desc' } }),
        getWithCache(`/v1/api/danh-sach/phim-bo`, { params: { page, limit: Math.ceil(limit / 2), sort_field: 'modified.time', sort_type: 'desc' } }),
        nguoncApi.getMovies(page),
        nguoncApi.getTVSeries(page),
      ]);

      const moviesData =
        moviesRes.status === 'fulfilled'
          ? moviesRes.value.data?.data?.items?.map((item) => ({ ...transformAnime(item), type: 'single', modifiedTime: item.modified?.time })) || []
          : [];
      const seriesData =
        seriesRes.status === 'fulfilled'
          ? seriesRes.value.data?.data?.items?.map((item) => ({ ...transformAnime(item), type: 'series', modifiedTime: item.modified?.time })) || []
          : [];
      const ncMovies = ncMoviesRes.status === 'fulfilled' ? ncMoviesRes.value.data || [] : [];
      const ncSeries = ncSeriesRes.status === 'fulfilled' ? ncSeriesRes.value.data || [] : [];

      const kkCombined = sortByModifiedDesc([...moviesData, ...seriesData]);
      const ncCombined = [...ncMovies, ...ncSeries];
      const merged = sortByModifiedDesc(mergeUniqueContent(kkCombined, ncCombined));

      return {
        data: merged.slice(0, limit),
        pagination: moviesRes.status === 'fulfilled' ? moviesRes.value.data?.data?.params?.pagination || {} : {},
      };
    } catch (error) {
      console.error('Error fetching latest movies:', error);
      return { data: [], pagination: {} };
    }
  },

  // Get all anime (paginated + sortable) - KKPhim + NguonC
  getAllAnime: async (page = 1, limit = 24, sort = 'updated') => {
    const sortParams =
      sort === 'year_desc'
        ? { sort_field: 'year', sort_type: 'desc' }
        : sort === 'year_asc'
          ? { sort_field: 'year', sort_type: 'asc' }
          : { sort_field: 'modified.time', sort_type: 'desc' };

    const [kkRes, ncRes] = await Promise.allSettled([
      getWithCache(`/v1/api/danh-sach/hoat-hinh`, { params: { page, limit, ...sortParams } }),
      sort === 'year_asc'
        ? Promise.resolve({ data: [], paginate: null })
        : nguoncApi.getByCategory('hoat-hinh', page, 2),
    ]);

    const kkData = kkRes.status === 'fulfilled' ? kkRes.value.data?.data : null;
    const kkItems = kkData?.items?.map((item) => ({ ...transformAnime(item), type: item.type || 'hoathinh' })) || [];
    const ncItems = ncRes.status === 'fulfilled' ? ncRes.value.data || [] : [];
    const merged = mergeUniqueContent(kkItems, ncItems);

    const sorted =
      sort === 'year_asc'
        ? merged
        : sort === 'year_desc'
          ? [...merged].sort((a, b) => {
              const yDiff = (Number(b.year) || 0) - (Number(a.year) || 0);
              if (yDiff !== 0) return yDiff;
              return new Date(b.modifiedTime || 0) - new Date(a.modifiedTime || 0);
            })
          : sortByModifiedDesc(merged);

    const kkPagination = kkData?.params?.pagination || null;
    const ncPaginate = ncRes.status === 'fulfilled' ? ncRes.value.paginate : null;

    return {
      data: sorted.slice(0, limit),
      pagination:
        sort === 'year_asc'
          ? { ...(kkPagination || {}), currentPage: page }
          : buildMergedPagination(kkPagination, ncPaginate, page, 2),
    };
  },

  // Get all movies - phim lẻ (single movies) - KKPhim + NguonC
  getAllMovies: async (page = 1, limit = 24) => {
    const [kkRes, ncRes] = await Promise.allSettled([
      getWithCache(`/v1/api/danh-sach/phim-le`, { params: { page, limit } }),
      nguoncApi.getMovies(page),
    ]);
    const kkData = kkRes.status === 'fulfilled' ? kkRes.value.data?.data : null;
    const kkItems = kkData?.items?.map((item) => ({ ...transformAnime(item), type: item.type || 'single' })) || [];
    const ncItems = ncRes.status === 'fulfilled' ? ncRes.value.data || [] : [];
    const merged = sortByModifiedDesc(mergeUniqueContent(kkItems, ncItems));
    const kkPagination = kkData?.params?.pagination || null;
    const ncPaginate = ncRes.status === 'fulfilled' ? ncRes.value.paginate : null;
    return {
      data: merged.slice(0, limit),
      pagination: buildMergedPagination(kkPagination, ncPaginate, page, 1),
    };
  },

  // Get all TV series - phim bộ - KKPhim + NguonC
  getAllTVSeries: async (page = 1, limit = 24) => {
    const [kkRes, ncRes] = await Promise.allSettled([
      getWithCache(`/v1/api/danh-sach/phim-bo`, { params: { page, limit } }),
      nguoncApi.getTVSeries(page),
    ]);
    const kkData = kkRes.status === 'fulfilled' ? kkRes.value.data?.data : null;
    const kkItems = kkData?.items?.map((item) => ({ ...transformAnime(item), type: item.type || 'series' })) || [];
    const ncItems = ncRes.status === 'fulfilled' ? ncRes.value.data || [] : [];
    const merged = sortByModifiedDesc(mergeUniqueContent(kkItems, ncItems));
    const kkPagination = kkData?.params?.pagination || null;
    const ncPaginate = ncRes.status === 'fulfilled' ? ncRes.value.paginate : null;
    return {
      data: merged.slice(0, limit),
      pagination: buildMergedPagination(kkPagination, ncPaginate, page, 1),
    };
  },

  // Get all movies (both phim lẻ and phim bộ combined) - KKPhim + NguonC
  getAllMoviesAndSeries: async (page = 1, limit = 24) => {
    try {
      const [moviesRes, seriesRes, ncMoviesRes, ncSeriesRes] = await Promise.allSettled([
        getWithCache(`/v1/api/danh-sach/phim-le`, { params: { page, limit: Math.ceil(limit / 2) } }),
        getWithCache(`/v1/api/danh-sach/phim-bo`, { params: { page, limit: Math.ceil(limit / 2) } }),
        nguoncApi.getMovies(page),
        nguoncApi.getTVSeries(page),
      ]);

      const moviesData =
        moviesRes.status === 'fulfilled'
          ? moviesRes.value.data?.data?.items?.map((item) => ({ ...transformAnime(item), type: 'single' })) || []
          : [];
      const seriesData =
        seriesRes.status === 'fulfilled'
          ? seriesRes.value.data?.data?.items?.map((item) => ({ ...transformAnime(item), type: 'series' })) || []
          : [];
      const ncMovies = ncMoviesRes.status === 'fulfilled' ? ncMoviesRes.value.data || [] : [];
      const ncSeries = ncSeriesRes.status === 'fulfilled' ? ncSeriesRes.value.data || [] : [];

      const merged = sortByModifiedDesc(mergeUniqueContent([...moviesData, ...seriesData], [...ncMovies, ...ncSeries]));
      const kkPagination =
        moviesRes.status === 'fulfilled' ? moviesRes.value.data?.data?.params?.pagination || null : null;
      const ncMoviesPaginate = ncMoviesRes.status === 'fulfilled' ? ncMoviesRes.value.paginate : null;
      const ncSeriesPaginate = ncSeriesRes.status === 'fulfilled' ? ncSeriesRes.value.paginate : null;
      const maxNcPaginate =
        (Number(ncSeriesPaginate?.total_page) || 0) > (Number(ncMoviesPaginate?.total_page) || 0)
          ? ncSeriesPaginate
          : ncMoviesPaginate;

      return {
        data: merged.slice(0, limit),
        pagination: buildMergedPagination(kkPagination, maxNcPaginate, page, 1),
      };
    } catch (error) {
      console.error('Error fetching movies and series:', error);
      return { data: [], pagination: {} };
    }
  },

  // Search movies & anime by keyword (KKPhim + NguonC parallel)
  searchAnime: async (keyword) => {
    const [kkRes, ncRes] = await Promise.allSettled([
      getWithCache(`/v1/api/tim-kiem`, { params: { keyword } }),
      nguoncApi.search(keyword),
    ]);

    const kkData = kkRes.status === 'fulfilled' ? kkRes.value.data?.data : null;
    const kkItems = kkData?.items?.map(transformAnime) || [];
    const ncItems = ncRes.status === 'fulfilled' ? ncRes.value.data || [] : [];

    return {
      data: mergeUniqueContent(kkItems, ncItems),
      pagination: kkData?.params?.pagination || {},
    };
  },

  // Get movie/anime detail by slug (supports nc-- prefix and automatic NguonC fallback)
  getAnimeDetail: async (slug) => {
    if (String(slug || '').startsWith(NGUONC_SLUG_PREFIX)) {
      return nguoncApi.getDetail(slug);
    }

    try {
      const response = await getWithCache(`/phim/${slug}`);
      const movie = response.data?.movie;
      const episodes = response.data?.episodes || [];

      if (movie) {
        const transformedEpisodes = [];
        episodes.forEach((server) => {
          const serverData = server.server_data || [];
          serverData.forEach((ep) => {
            const exists = transformedEpisodes.find((e) => e.name === ep.name);
            if (!exists) {
              transformedEpisodes.push({
                name: ep.name,
                slug: ep.slug,
                filename: ep.filename,
                link_embed: ep.link_embed,
                link_m3u8: ep.link_m3u8,
              });
            }
          });
        });

        return {
          data: {
            id: movie._id,
            slug: movie.slug,
            name: movie.name,
            origin_name: movie.origin_name,
            content: movie.content,
            type: movie.type,
            poster: formatImageUrl(movie.poster_url || movie.thumb_url),
            thumb_url: formatImageUrl(movie.thumb_url || movie.poster_url),
            poster_url: formatImageUrl(movie.poster_url || movie.thumb_url),
            year: movie.year,
            quality: movie.quality,
            lang: movie.lang,
            time: movie.time,
            episode_current: movie.episode_current,
            episode_total: movie.episode_total,
            category: movie.category?.map((c) => c.name) || [],
            categoryList:
              movie.category?.map((c) => ({
                name: c.name,
                slug: c.slug || toCategorySlug(c.name),
              })) || [],
            country: movie.country?.map((c) => c.name) || [],
            actor: movie.actor || [],
            director: movie.director || [],
            episodes: transformedEpisodes,
          },
        };
      }
    } catch {
      // Fallback to NguonC if KKPhim fails or lacks the slug
    }

    return nguoncApi.getDetail(slug).catch(() => ({ data: null }));
  },

  // Get all categories/tags
  getAllCategories: async () => {
    try {
      // Return predefined categories list
      return [...CATEGORIES].sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  // Filter anime by categories
  filterAnimeByCategories: async (categoryObjects, page = 1, limit = 24) => {
    try {
      if (!categoryObjects || categoryObjects.length === 0) {
        return kkphimApi.getAllAnime(page, limit);
      }

      return await fetchAndFilterByCategories(
        categoryObjects,
        page,
        limit,
        (item) => item.type === 'hoathinh'
      );
    } catch (error) {
      console.error('Error filtering anime:', error);
      return {
        data: [],
        pagination: { totalItems: 0, totalItemsPerPage: limit, currentPage: page, totalPages: 1 },
      };
    }
  },

  // Get all categories/tags for movies
  // NOTE: Delegate sang getAllCategories vì dùng cùng dữ liệu CATEGORIES.
  getAllMovieCategories: async () => {
    return kkphimApi.getAllCategories();
  },

  // Filter movies by categories
  filterMoviesByCategories: async (categoryObjects, page = 1, limit = 24) => {
    try {
      if (!categoryObjects || categoryObjects.length === 0) {
        return kkphimApi.getAllMoviesAndSeries(page, limit);
      }

      return await fetchAndFilterByCategories(
        categoryObjects,
        page,
        limit,
        (item) => item.type === 'single' || item.type === 'series' || item.type === 'tvshows'
      );
    } catch (error) {
      console.error('Error filtering movies:', error);
      return {
        data: [],
        pagination: { totalItems: 0, totalItemsPerPage: limit, currentPage: page, totalPages: 1 },
      };
    }
  },
};

// Helper chung lấy song song 3 trang từ /v1/api/the-loai/:slug (hoặc tv-shows), gộp NguonC, khử trùng lặp và lọc theo loại + nhiều thể loại
async function fetchAndFilterByCategories(categoryObjects, page = 1, limit = 24, typeFilter) {
  const firstSlug = categoryObjects[0].slug;
  const startApiPage = (page - 1) * 3 + 1;
  const pagesToFetch = [startApiPage, startApiPage + 1, startApiPage + 2];
  const kkEndpoint = firstSlug === 'tv-shows' ? '/v1/api/danh-sach/tv-shows' : `/v1/api/the-loai/${firstSlug}`;

  const [responses, ncRes] = await Promise.all([
    Promise.all(
      pagesToFetch.map((apiPage) =>
        getWithCache(kkEndpoint, {
          params: { page: apiPage, limit: 64 },
        }).catch(() => null)
      )
    ),
    categoryObjects.length === 1
      ? nguoncApi.getByCategory(firstSlug, page, 3).catch(() => ({ data: [], paginate: {} }))
      : Promise.resolve({ data: [], paginate: {} }),
  ]);

  const seenKeys = new Set();
  const rawItems = [];
  let firstPagination = null;

  responses.forEach((res) => {
    const rawData = res?.data?.data;
    if (!rawData) return;
    if (!firstPagination && rawData.params?.pagination) {
      firstPagination = rawData.params.pagination;
    }
    const items = rawData.items || [];
    items.forEach((item) => {
      const uniqueKey = item._id || item.slug;
      if (uniqueKey && !seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        rawItems.push(item);
      }
    });
  });

  let filteredItems = rawItems.filter(typeFilter);

  if (categoryObjects.length > 1) {
    filteredItems = filteredItems.filter((item) => {
      const itemSlugs = (item.category || []).map((c) => c.slug || toCategorySlug(c.name));
      return categoryObjects.every((cat) => itemSlugs.includes(cat.slug));
    });
  }

  const apiTotalPages = firstPagination?.totalPages || 0;
  const kkTotalPages = apiTotalPages > 0 ? Math.max(1, Math.ceil(apiTotalPages / 3)) : 0;
  const ncTotalPages = ncRes?.paginate?.total_page
    ? Math.max(1, Math.ceil(Number(ncRes.paginate.total_page) / 3))
    : 0;
  const totalPages = Math.max(1, kkTotalPages, ncTotalPages);

  const rawCount = rawItems.length;
  const kkTotalItems =
    filteredItems.length === 0
      ? 0
      : kkTotalPages <= 1
        ? filteredItems.length
        : Math.max(
            filteredItems.length,
            Math.round((firstPagination?.totalItems || rawCount) * (filteredItems.length / Math.max(rawCount, 1)))
          );

  const kkTransformed = filteredItems.map(transformAnime);
  const ncFiltered = (ncRes?.data || []).filter(typeFilter);
  const finalData = mergeUniqueContent(kkTransformed, ncFiltered);
  const ncTotalItems = Number(ncRes?.paginate?.total_items) || 0;

  return {
    data: finalData,
    pagination: {
      totalItems: Math.max(kkTotalItems, ncTotalItems, finalData.length),
      totalItemsPerPage: finalData.length || limit,
      currentPage: page,
      totalPages,
    },
  };
}
