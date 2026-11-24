import axios from 'axios';

const MANGADEX_API = 'https://api.mangadex.org';
const MANGADEX_HEADERS = {
  'User-Agent': 'LDMovies/1.0 (https://ldmovies.onrender.com)',
  Accept: 'application/json',
};

function pickLocalizedText(obj = {}) {
  if (!obj || typeof obj !== 'object') return '';
  return (
    obj.vi ||
    obj['vi-vn'] ||
    obj.en ||
    obj['ja-ro'] ||
    obj.ja ||
    Object.values(obj)[0] ||
    ''
  );
}

function buildProxiedCoverUrl(mangaId, relationships = []) {
  const coverRel = relationships.find((r) => r.type === 'cover_art');
  const fileName = coverRel?.attributes?.fileName;
  if (!fileName) return '';
  const rawCoverUrl = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}`;
  return `/api/img?url=${encodeURIComponent(rawCoverUrl)}&w=400&q=75`;
}

function mapMangaListItem(manga) {
  const attrs = manga.attributes || {};
  const title = pickLocalizedText(attrs.title) || 'Không rõ tên';
  const altTitleObj = (attrs.altTitles || []).find((t) => t.vi || t.en);
  const originName = altTitleObj ? pickLocalizedText(altTitleObj) : '';
  const lastChap = attrs.lastChapter || '';

  return {
    _id: manga.id,
    id: manga.id,
    name: title,
    slug: `md--${manga.id}`,
    origin_name: originName ? [originName] : [],
    thumb_url: buildProxiedCoverUrl(manga.id, manga.relationships),
    updatedAt: attrs.updatedAt || attrs.createdAt || new Date().toISOString(),
    chaptersLatest: lastChap ? [{ chapter_name: String(lastChap) }] : [],
  };
}

export async function mdGetLatestComics(page = 1) {
  const numPage = Math.max(1, Number(page) || 1);
  const limit = 24;
  const chapOffset = (numPage - 1) * 60;

  // Query recent readable Vietnamese chapters directly so every comic has real chapters & latest updates
  const { data: chapRes } = await axios.get(`${MANGADEX_API}/chapter`, {
    timeout: 12000,
    headers: MANGADEX_HEADERS,
    params: {
      limit: 100,
      offset: chapOffset,
      'translatedLanguage[]': 'vi',
      'order[readableAt]': 'desc',
      includeExternalUrl: 0,
      'contentRating[]': ['safe', 'suggestive'],
    },
  });

  const latestByManga = new Map();
  for (const chap of chapRes?.data || []) {
    const cAttrs = chap.attributes || {};
    if (!cAttrs.pages || cAttrs.pages <= 0) continue;
    const mangaRel = (chap.relationships || []).find((r) => r.type === 'manga');
    if (!mangaRel?.id) continue;
    if (!latestByManga.has(mangaRel.id)) {
      latestByManga.set(mangaRel.id, {
        chapterName: cAttrs.chapter ? String(cAttrs.chapter) : 'Oneshot',
        updatedAt: cAttrs.readableAt || cAttrs.publishAt || new Date().toISOString(),
      });
    }
    if (latestByManga.size >= limit) break;
  }

  const mangaIds = Array.from(latestByManga.keys());
  if (mangaIds.length === 0) {
    return {
      status: 'success',
      data: {
        items: [],
        pagination: { totalItems: 0, totalItemsPerPage: limit, currentPage: numPage },
      },
    };
  }

  const { data: mangaRes } = await axios.get(`${MANGADEX_API}/manga`, {
    timeout: 12000,
    headers: MANGADEX_HEADERS,
    params: {
      'ids[]': mangaIds,
      limit: 100,
      'includes[]': 'cover_art',
      'contentRating[]': ['safe', 'suggestive'],
    },
  });

  const mangaById = new Map((mangaRes?.data || []).map((m) => [m.id, m]));
  const items = [];
  for (const id of mangaIds) {
    const manga = mangaById.get(id);
    if (!manga) continue;
    const mapped = mapMangaListItem(manga);
    const chapInfo = latestByManga.get(id);
    mapped.updatedAt = chapInfo.updatedAt;
    mapped.chaptersLatest = [{ chapter_name: chapInfo.chapterName }];
    items.push(mapped);
  }

  const totalChapters = Math.min(chapRes?.total || 2400, 10000);
  const estimatedPages = Math.max(numPage, Math.ceil(totalChapters / 60));

  return {
    status: 'success',
    data: {
      items,
      pagination: {
        totalItems: estimatedPages * limit,
        totalItemsPerPage: limit,
        currentPage: numPage,
      },
    },
  };
}

export async function mdGetGenres() {
  const { data } = await axios.get(`${MANGADEX_API}/manga/tag`, {
    timeout: 12000,
    headers: MANGADEX_HEADERS,
  });

  const items = (data?.data || [])
    .filter((tag) => {
      const grp = tag.attributes?.group;
      return grp === 'genre' || grp === 'theme';
    })
    .map((tag) => ({
      _id: tag.id,
      slug: `md--${tag.id}`,
      name: pickLocalizedText(tag.attributes?.name) || tag.id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    status: 'success',
    data: { items },
  };
}

export async function mdGetComicsByGenre(genreSlug, page = 1) {
  const tagId = String(genreSlug || '').replace(/^md--/, '');
  const numPage = Math.max(1, Number(page) || 1);
  const limit = 24;
  const offset = (numPage - 1) * limit;

  const { data } = await axios.get(`${MANGADEX_API}/manga`, {
    timeout: 12000,
    headers: MANGADEX_HEADERS,
    params: {
      limit,
      offset,
      'includedTags[]': tagId,
      'availableTranslatedLanguage[]': 'vi',
      'order[followedCount]': 'desc',
      'includes[]': 'cover_art',
      'contentRating[]': ['safe', 'suggestive'],
    },
  });

  const items = (data?.data || []).map(mapMangaListItem);
  const totalItems = Math.min(data?.total || items.length, 10000);

  return {
    status: 'success',
    data: {
      items,
      pagination: {
        totalItems,
        totalItemsPerPage: limit,
        currentPage: numPage,
      },
    },
  };
}

export async function mdSearchComics(keyword) {
  const { data } = await axios.get(`${MANGADEX_API}/manga`, {
    timeout: 12000,
    headers: MANGADEX_HEADERS,
    params: {
      title: keyword,
      limit: 24,
      'availableTranslatedLanguage[]': 'vi',
      'order[relevance]': 'desc',
      'includes[]': 'cover_art',
      'contentRating[]': ['safe', 'suggestive'],
    },
  });

  const items = (data?.data || []).map(mapMangaListItem);
  return {
    status: 'success',
    data: {
      items,
      pagination: {
        totalItems: items.length,
        totalItemsPerPage: 24,
        currentPage: 1,
      },
    },
  };
}

export async function mdGetComicDetails(compositeSlug) {
  const mangaId = String(compositeSlug || '').replace(/^md--/, '');

  const [mangaRes, feedRes] = await Promise.all([
    axios.get(`${MANGADEX_API}/manga/${encodeURIComponent(mangaId)}`, {
      timeout: 12000,
      headers: MANGADEX_HEADERS,
      params: { 'includes[]': ['cover_art', 'author'] },
    }),
    axios.get(`${MANGADEX_API}/manga/${encodeURIComponent(mangaId)}/feed`, {
      timeout: 12000,
      headers: MANGADEX_HEADERS,
      params: {
        'translatedLanguage[]': 'vi',
        includeExternalUrl: 0,
        limit: 500,
        'order[chapter]': 'asc',
        'contentRating[]': ['safe', 'suggestive'],
      },
    }),
  ]);

  const manga = mangaRes.data?.data;
  if (!manga) return null;

  let feedData = feedRes.data?.data || [];

  // Fallback to English readable chapters if Vietnamese feed has 0 direct readable chapters
  if (!feedData.some((c) => c.attributes?.pages > 0)) {
    const enFeedRes = await axios.get(`${MANGADEX_API}/manga/${encodeURIComponent(mangaId)}/feed`, {
      timeout: 12000,
      headers: MANGADEX_HEADERS,
      params: {
        'translatedLanguage[]': 'en',
        includeExternalUrl: 0,
        limit: 500,
        'order[chapter]': 'asc',
        'contentRating[]': ['safe', 'suggestive'],
      },
    });
    feedData = enFeedRes.data?.data || [];
  }

  const attrs = manga.attributes || {};
  const name = pickLocalizedText(attrs.title) || 'Không rõ tên';
  const altTitleObj = (attrs.altTitles || []).find((t) => t.vi || t.en);
  const origin_name = altTitleObj ? pickLocalizedText(altTitleObj) : '';
  const content = pickLocalizedText(attrs.description) || '';
  const status = attrs.status === 'completed' ? 'completed' : 'ongoing';

  const authors = (manga.relationships || [])
    .filter((r) => r.type === 'author' && r.attributes?.name)
    .map((r) => r.attributes.name);

  const category = (attrs.tags || []).map((tag) => ({
    id: tag.id,
    slug: `md--${tag.id}`,
    name: pickLocalizedText(tag.attributes?.name) || tag.id,
  }));

  // Deduplicate chapters by chapter number, preferring entries with pages > 0
  const chapMap = new Map();
  for (const chap of feedData) {
    const cAttrs = chap.attributes || {};
    if (!cAttrs.pages || cAttrs.pages <= 0) continue;
    const chapNum = cAttrs.chapter || 'Oneshot';
    if (!chapMap.has(chapNum)) {
      chapMap.set(chapNum, {
        chapter_name: String(chapNum),
        chapter_title: cAttrs.title || '',
        chapter_api_data: `${MANGADEX_API}/chapter/md--${chap.id}`,
      });
    }
  }

  return {
    status: 'success',
    data: {
      id: manga.id,
      name,
      slug: `md--${manga.id}`,
      origin_name,
      content,
      status,
      thumb_url: buildProxiedCoverUrl(manga.id, manga.relationships),
      author: authors.length > 0 ? authors : ['Đang cập nhật'],
      category,
      chapters: Array.from(chapMap.values()),
      updatedAt: attrs.updatedAt || new Date().toISOString(),
      domain_cdn: '',
    },
  };
}

export async function mdGetComicChapter(compositeChapterId) {
  const chapUuid = String(compositeChapterId || '').replace(/^md--/, '');

  const [atHomeRes, chapRes] = await Promise.all([
    axios.get(`${MANGADEX_API}/at-home/server/${encodeURIComponent(chapUuid)}`, {
      timeout: 12000,
      headers: MANGADEX_HEADERS,
    }),
    axios.get(`${MANGADEX_API}/chapter/${encodeURIComponent(chapUuid)}`, {
      timeout: 12000,
      headers: MANGADEX_HEADERS,
      params: { 'includes[]': 'manga' },
    }),
  ]);

  const atHome = atHomeRes.data;
  const chapData = chapRes.data?.data;
  if (!atHome?.baseUrl || !atHome?.chapter?.hash) return null;

  const mangaRel = (chapData?.relationships || []).find((r) => r.type === 'manga');
  const comic_name = pickLocalizedText(mangaRel?.attributes?.title) || 'Truyện Tranh';
  const chapter_name = String(chapData?.attributes?.chapter || '1');

  const hash = atHome.chapter.hash;
  const useDataSaver = Array.isArray(atHome.chapter.dataSaver) && atHome.chapter.dataSaver.length > 0;
  const files = useDataSaver ? atHome.chapter.dataSaver : (atHome.chapter.data || []);
  const qualityPath = useDataSaver ? 'data-saver' : 'data';

  const images = files.map((file, idx) => ({
    image_page: idx + 1,
    image_file: `${atHome.baseUrl}/${qualityPath}/${hash}/${file}`,
  }));

  if (images.length === 0) return null;

  return {
    status: 'success',
    data: {
      domain_cdn: '',
      item: {
        comic_name,
        chapter_name,
        chapter_path: '',
        chapter_image: images,
      },
    },
  };
}
