import axios from 'axios';

const NGUONC_BASE_URL = 'https://phim.nguonc.com/api';
export const NGUONC_SLUG_PREFIX = 'nc--';

// Map slug thể loại từ KKPhim sang slug tương ứng của NguonC
const CATEGORY_SLUG_MAP = {
  'hai-huoc': 'phim-hai',
  'am-nhac': 'phim-nhac',
  'vien-tuong': 'khoa-hoc-vien-tuong',
  'khoa-hoc': 'khoa-hoc-vien-tuong',
  'than-thoai': 'gia-tuong',
};

const nguoncClient = axios.create({
  baseURL: NGUONC_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const nguoncCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const getWithCache = async (url, config = {}) => {
  const key = url + JSON.stringify(config.params || {});
  const cached = nguoncCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  const response = await nguoncClient.get(url, config);
  nguoncCache.set(key, { timestamp: Date.now(), response });
  return response;
};

const toSlug = (str = '') =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

function extractCategoryInfo(categoryObj) {
  if (!categoryObj || typeof categoryObj !== 'object') {
    return { formatNames: [], categoryNames: [], categoryList: [], countryNames: [] };
  }
  const groups = Object.values(categoryObj);
  const formatNames = [];
  const categoryNames = [];
  const categoryList = [];
  const countryNames = [];

  for (const grp of groups) {
    const grpName = (grp?.group?.name || '').toLowerCase();
    const list = Array.isArray(grp?.list) ? grp.list : [];
    for (const entry of list) {
      const name = entry?.name;
      if (!name) continue;
      if (grpName.includes('định dạng')) {
        formatNames.push(name);
      } else if (grpName.includes('quốc gia')) {
        countryNames.push(name);
      } else if (grpName.includes('thể loại')) {
        categoryNames.push(name);
        categoryList.push({ name, slug: toSlug(name) });
      }
    }
  }

  return { formatNames, categoryNames, categoryList, countryNames };
}

function detectTypeFromNguonC(item, fallbackType = 'single') {
  const { formatNames, categoryNames } = extractCategoryInfo(item?.category);
  const allLabels = [...formatNames, ...categoryNames].map((s) => s.toLowerCase());

  if (allLabels.some((s) => s.includes('hoạt hình') || s.includes('anime'))) {
    return 'hoathinh';
  }
  if (allLabels.some((s) => s.includes('phim bộ'))) {
    return 'series';
  }
  if (allLabels.some((s) => s.includes('phim lẻ'))) {
    return 'single';
  }
  if (Number(item?.total_episodes) > 1) {
    return 'series';
  }
  return fallbackType;
}

const transformNguonCItem = (item, fallbackType = 'single') => {
  const { categoryNames, categoryList, countryNames } = extractCategoryInfo(item.category);
  return {
    id: item.id || `nc-${item.slug}`,
    slug: `${NGUONC_SLUG_PREFIX}${item.slug}`,
    rawSlug: item.slug,
    name: item.name,
    origin_name: item.original_name || '',
    poster: item.thumb_url_webp || item.thumb_url || item.poster_url_webp || item.poster_url || null,
    thumb_url: item.poster_url_webp || item.poster_url || item.thumb_url_webp || item.thumb_url || null,
    year: item.year ? Number(item.year) || item.year : '',
    quality: item.quality || 'HD',
    lang: item.language || 'Vietsub',
    time: item.time || '',
    episode_current: item.current_episode || '',
    category: categoryNames,
    categoryList,
    country: countryNames,
    type: detectTypeFromNguonC(item, fallbackType),
    tmdb: item.tmdb || null,
    imdb: item.imdb || null,
    source: 'nguonc',
    modifiedTime: item.modified || item.created || null,
  };
};

export const nguoncApi = {
  search: async (keyword) => {
    const res = await getWithCache('/films/search', { params: { keyword, page: 1 } });
    let items = res.data?.items || [];
    const paginate = res.data?.paginate || {};
    const totalPages = Math.min(Number(paginate.total_page) || 1, 3);

    if (totalPages > 1) {
      const extraPages = [];
      for (let p = 2; p <= totalPages; p += 1) {
        extraPages.push(
          getWithCache('/films/search', { params: { keyword, page: p } })
            .then((r) => r.data?.items || [])
            .catch(() => [])
        );
      }
      const extraResults = await Promise.all(extraPages);
      for (const list of extraResults) {
        items = items.concat(list);
      }
    }

    return {
      data: items.map((item) => transformNguonCItem(item, 'single')),
      paginate,
    };
  },

  getLatest: async (page = 1) => {
    const res = await getWithCache('/films/phim-moi-cap-nhat', { params: { page } });
    const items = res.data?.items || [];
    return {
      data: items.map((item) => transformNguonCItem(item, 'single')),
      paginate: res.data?.paginate || {},
    };
  },

  getMovies: async (page = 1) => {
    const res = await getWithCache('/films/danh-sach/phim-le', { params: { page } });
    const items = res.data?.items || [];
    return {
      data: items.map((item) => transformNguonCItem(item, 'single')),
      paginate: res.data?.paginate || {},
    };
  },

  getTVSeries: async (page = 1) => {
    const res = await getWithCache('/films/danh-sach/phim-bo', { params: { page } });
    const items = res.data?.items || [];
    return {
      data: items.map((item) => transformNguonCItem(item, 'series')),
      paginate: res.data?.paginate || {},
    };
  },

  getAnime: async (page = 1) => {
    const res = await getWithCache('/films/the-loai/hoat-hinh', { params: { page } });
    const items = res.data?.items || [];
    return {
      data: items.map((item) => ({ ...transformNguonCItem(item, 'hoathinh'), type: 'hoathinh' })),
      paginate: res.data?.paginate || {},
    };
  },

  getByCategory: async (catSlug, page = 1, pagesCount = 1) => {
    const mappedSlug = CATEGORY_SLUG_MAP[catSlug] || catSlug;
    const count = Math.max(1, Number(pagesCount) || 1);
    const startPage = (Math.max(1, Number(page) || 1) - 1) * count + 1;
    const pageNums = Array.from({ length: count }, (_, idx) => startPage + idx);

    const responses = await Promise.all(
      pageNums.map((p) =>
        getWithCache(`/films/the-loai/${encodeURIComponent(mappedSlug)}`, {
          params: { page: p },
        })
          .then((r) => r.data || null)
          .catch(() => null)
      )
    );

    const firstSuccess = responses.find((d) => d && Array.isArray(d.items));
    const paginate = firstSuccess?.paginate || {};
    const items = responses.flatMap((d) => (Array.isArray(d?.items) ? d.items : []));
    const fallbackType = mappedSlug === 'hoat-hinh' ? 'hoathinh' : 'single';

    return {
      data: items.map((item) => transformNguonCItem(item, fallbackType)),
      paginate,
    };
  },

  getDetail: async (rawSlug) => {
    const cleanSlug = String(rawSlug || '').replace(/^nc--/, '');
    const res = await getWithCache(`/film/${encodeURIComponent(cleanSlug)}`);
    const movie = res.data?.movie;
    if (!movie) return { data: null };

    const { categoryNames, categoryList, countryNames } = extractCategoryInfo(movie.category);
    const detectedType = detectTypeFromNguonC(movie, 'single');

    const episodesMap = new Map();
    const serverGroups = Array.isArray(movie.episodes) ? movie.episodes : [];
    for (const server of serverGroups) {
      const items = Array.isArray(server?.items) ? server.items : [];
      for (const ep of items) {
        const epName = String(ep?.name || '').trim();
        if (!epName) continue;
        const m3u8 = ep.m3u8 || '';
        const embed = ep.embed || '';
        const existing = episodesMap.get(epName);
        if (!existing || (!existing.link_m3u8 && m3u8)) {
          episodesMap.set(epName, {
            name: epName,
            slug: ep.slug || `tap-${epName}`,
            filename: epName,
            link_embed: embed,
            link_m3u8: m3u8,
          });
        }
      }
    }

    return {
      data: {
        id: movie.id || `nc-${movie.slug}`,
        slug: `${NGUONC_SLUG_PREFIX}${movie.slug}`,
        rawSlug: movie.slug,
        name: movie.name,
        origin_name: movie.original_name || '',
        content: movie.description || '',
        type: detectedType,
        poster: movie.thumb_url_webp || movie.thumb_url || movie.poster_url_webp || movie.poster_url || null,
        poster_url: movie.thumb_url_webp || movie.thumb_url || movie.poster_url_webp || movie.poster_url || null,
        thumb_url: movie.poster_url_webp || movie.poster_url || movie.thumb_url_webp || movie.thumb_url || null,
        year: movie.year ? Number(movie.year) || movie.year : '',
        quality: movie.quality || 'HD',
        lang: movie.language || 'Vietsub',
        time: movie.time || '',
        episode_current: movie.current_episode || '',
        episode_total: movie.total_episodes || '',
        director: movie.director ? [movie.director] : [],
        actor: movie.casts ? String(movie.casts).split(',').map((s) => s.trim()).filter(Boolean) : [],
        category: categoryNames,
        categoryList,
        country: countryNames,
        episodes: Array.from(episodesMap.values()),
        source: 'nguonc',
      },
    };
  },
};
