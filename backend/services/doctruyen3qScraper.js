import axios from 'axios';

export const DOCTRUYEN3Q_BASE_URL = (
  process.env.COMIC_SOURCE_URL || 'https://doctruyen3qhub.club'
).replace(/\/+$/, '');

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  Referer: `${DOCTRUYEN3Q_BASE_URL}/`,
};

const HTML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
  '&#39;': "'",
  '&#x27;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…',
};

function decodeHtmlEntities(str = '') {
  if (!str) return '';
  return String(str)
    .replace(
      /&(amp|lt|gt|quot|#039|#39|#x27|apos|nbsp|ndash|mdash|hellip);/gi,
      (m) => HTML_ENTITIES[m.toLowerCase()] || m
    )
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

function stripTags(html = '') {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(url = '') {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return `${DOCTRUYEN3Q_BASE_URL}${trimmed}`;
  return `${DOCTRUYEN3Q_BASE_URL}/${trimmed}`;
}

function parseRelativeTime(text = '') {
  const now = Date.now();
  const clean = stripTags(text).toLowerCase();

  const minMatch = clean.match(/(\d+)\s*phút/);
  if (minMatch) return new Date(now - Number(minMatch[1]) * 60 * 1000).toISOString();

  const hourMatch = clean.match(/(\d+)\s*giờ/);
  if (hourMatch) return new Date(now - Number(hourMatch[1]) * 3600 * 1000).toISOString();

  const dayMatch = clean.match(/(\d+)\s*ngày/);
  if (dayMatch) return new Date(now - Number(dayMatch[1]) * 86400 * 1000).toISOString();

  const weekMatch = clean.match(/(\d+)\s*tuần/);
  if (weekMatch) return new Date(now - Number(weekMatch[1]) * 7 * 86400 * 1000).toISOString();

  const monthMatch = clean.match(/(\d+)\s*tháng/);
  if (monthMatch) return new Date(now - Number(monthMatch[1]) * 30 * 86400 * 1000).toISOString();

  const dmyMatch = clean.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]) - 1;
    const yearRaw = Number(dmyMatch[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const parsed = new Date(year, month, day);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return new Date(now).toISOString();
}

function encodeComicSlug(slug, id) {
  return id ? `${slug}--${id}` : slug;
}

function decodeComicSlug(composite = '') {
  const idx = composite.lastIndexOf('--');
  if (idx !== -1) {
    return {
      slug: composite.slice(0, idx),
      id: composite.slice(idx + 2),
    };
  }
  return { slug: composite, id: '' };
}

function encodeChapterId(comicSlug, chapterSlug, chapId) {
  return `${comicSlug}--${chapterSlug}--${chapId}`;
}

function decodeChapterId(composite = '') {
  const parts = composite.split('--');
  if (parts.length >= 3) {
    const chapId = parts.pop();
    const chapterSlug = parts.pop();
    const comicSlug = parts.join('--');
    return { comicSlug, chapterSlug, chapId };
  }
  return null;
}

function cleanChapterName(raw = '') {
  return stripTags(raw)
    .replace(/^(chapter|chương|chap)[\s:-]*/i, '')
    .trim();
}

async function fetchHtml(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: REQUEST_HEADERS,
    responseType: 'text',
  });
  return response.data;
}

function parseComicListPage(html, page = 1) {
  const items = [];
  const blocks = html.split('<div class="item-manga">').slice(1);

  for (const block of blocks) {
    const cardHtml = block.split('<div class="pop-up"')[0] || block;

    const linkMatch = cardHtml.match(/href="(?:https?:\/\/[^/]+)?\/truyen-tranh\/([^"/]+)\/(\d+)"/i);
    if (!linkMatch) continue;

    const rawSlug = linkMatch[1];
    const comicId = linkMatch[2];
    const compositeSlug = encodeComicSlug(rawSlug, comicId);

    const titleMatch =
      cardHtml.match(/<a[^>]+class="[^"]*title-manga[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ||
      cardHtml.match(/title="([^"]+)"/i);
    const name = titleMatch ? stripTags(titleMatch[1]) : rawSlug;

    const imgMatch =
      cardHtml.match(/<div[^>]+class="[^"]*image-item[^"]*"[^>]*>[\s\S]*?<img[^>]+(?:data-original|data-src|src)="([^"]+)"/i) ||
      cardHtml.match(/<img[^>]+class="[^"]*image-item[^"]*"[^>]+(?:data-original|data-src|src)="([^"]+)"/i);
    const thumbUrl = imgMatch ? normalizeUrl(imgMatch[1]) : '';

    const chapMatch = cardHtml.match(
      /<li[^>]+class="[^"]*chapter-detail[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>(?:[\s\S]*?<i[^>]+class="[^"]*time[^"]*"[^>]*>([\s\S]*?)<\/i>)?/i
    );
    const latestChapterName = chapMatch ? cleanChapterName(chapMatch[1]) : '';
    const updatedAt = chapMatch && chapMatch[2] ? parseRelativeTime(chapMatch[2]) : new Date().toISOString();

    items.push({
      _id: comicId,
      id: comicId,
      name,
      slug: compositeSlug,
      origin_name: [],
      thumb_url: thumbUrl,
      updatedAt,
      chaptersLatest: latestChapterName
        ? [{ chapter_name: latestChapterName }]
        : [],
    });
  }

  let totalPages = Number(page) || 1;
  const paginationMatch = html.match(/<ul[^>]+class="[^"]*pagination[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
  if (paginationMatch) {
    const pageNums = [...paginationMatch[1].matchAll(/(?:\?|&)page=(\d+)/g)].map((m) => Number(m[1]));
    const textNums = [...paginationMatch[1].matchAll(/>(\d+)<\//g)].map((m) => Number(m[1]));
    const maxFound = Math.max(totalPages, ...pageNums, ...textNums);
    if (Number.isFinite(maxFound) && maxFound > 0) {
      totalPages = maxFound;
    }
  }

  const perPage = items.length > 0 ? items.length : 36;
  return {
    status: 'success',
    data: {
      items,
      pagination: {
        totalItems: totalPages * perPage,
        totalItemsPerPage: perPage,
        currentPage: Number(page) || 1,
      },
    },
  };
}

export async function scrapeLatestComics(page = 1) {
  const numPage = Math.max(1, Number(page) || 1);
  const url = numPage === 1 ? `${DOCTRUYEN3Q_BASE_URL}/` : `${DOCTRUYEN3Q_BASE_URL}/?page=${numPage}`;
  const html = await fetchHtml(url);
  return parseComicListPage(html, numPage);
}

export async function scrapeGenres() {
  const html = await fetchHtml(`${DOCTRUYEN3Q_BASE_URL}/`);
  const genreMap = new Map();

  const matches = html.matchAll(
    /<a[^>]+href="(?:https?:\/\/[^/]+)?\/tim-truyen\/([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/gi
  );
  for (const m of matches) {
    const slug = m[1].trim();
    const name = stripTags(m[2]);
    if (!slug || !name || name.length > 40) continue;
    if (!genreMap.has(slug)) {
      genreMap.set(slug, { _id: slug, slug, name });
    }
  }

  return {
    status: 'success',
    data: {
      items: Array.from(genreMap.values()),
    },
  };
}

export async function scrapeComicsByGenre(genreSlug, page = 1) {
  const numPage = Math.max(1, Number(page) || 1);
  const url =
    numPage === 1
      ? `${DOCTRUYEN3Q_BASE_URL}/tim-truyen/${encodeURIComponent(genreSlug)}`
      : `${DOCTRUYEN3Q_BASE_URL}/tim-truyen/${encodeURIComponent(genreSlug)}?page=${numPage}`;
  const html = await fetchHtml(url);
  return parseComicListPage(html, numPage);
}

export async function scrapeSearchComics(keyword) {
  const url = `${DOCTRUYEN3Q_BASE_URL}/tim-truyen?keyword=${encodeURIComponent(keyword)}`;
  const html = await fetchHtml(url);
  return parseComicListPage(html, 1);
}

export async function scrapeComicDetails(compositeSlug) {
  const { slug, id } = decodeComicSlug(compositeSlug);
  const targetUrl = id
    ? `${DOCTRUYEN3Q_BASE_URL}/truyen-tranh/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`
    : `${DOCTRUYEN3Q_BASE_URL}/truyen-tranh/${encodeURIComponent(slug)}`;

  const html = await fetchHtml(targetUrl);

  const nameMatch = html.match(/<h1[^>]+class="[^"]*title-manga[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  if (!nameMatch) {
    return null;
  }
  const name = stripTags(nameMatch[1]);

  const originMatch = html.match(
    /<li[^>]+class="[^"]*name-other[^"]*"[^>]*>[\s\S]*?<p[^>]+class="[^"]*detail-info[^"]*"[^>]*>([\s\S]*?)<\/p>/i
  );
  const origin_name = originMatch ? stripTags(originMatch[1]) : '';

  const authorMatch = html.match(
    /<li[^>]+class="[^"]*author[^"]*"[^>]*>[\s\S]*?<p[^>]+class="[^"]*detail-info[^"]*"[^>]*>([\s\S]*?)<\/p>/i
  );
  const authorText = authorMatch ? stripTags(authorMatch[1]) : '';
  const author = authorText
    ? authorText.split(/[,/]/).map((s) => s.trim()).filter(Boolean)
    : ['Đang cập nhật'];

  const statusMatch = html.match(
    /<li[^>]+class="[^"]*status[^"]*"[^>]*>[\s\S]*?<p[^>]+class="[^"]*detail-info[^"]*"[^>]*>([\s\S]*?)<\/p>/i
  );
  const statusText = statusMatch ? stripTags(statusMatch[1]).toLowerCase() : '';
  const status = statusText.includes('hoàn thành') ? 'completed' : 'ongoing';

  const category = [];
  const catBlockMatch = html.match(
    /<li[^>]+class="[^"]*category[^"]*"[^>]*>[\s\S]*?<p[^>]+class="[^"]*detail-info[^"]*"[^>]*>([\s\S]*?)<\/p>/i
  );
  if (catBlockMatch) {
    const catLinks = catBlockMatch[1].matchAll(
      /<a[^>]+href="(?:https?:\/\/[^/]+)?\/tim-truyen\/([^"/]+)"[^>]*>([\s\S]*?)<\/a>/gi
    );
    for (const cm of catLinks) {
      category.push({
        id: cm[1].trim(),
        slug: cm[1].trim(),
        name: stripTags(cm[2]),
      });
    }
  }

  const summaryMatch = html.match(/<p[^>]+class="[^"]*detail-summary[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  const content = summaryMatch ? stripTags(summaryMatch[1]) : '';

  const ogImgMatch =
    html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
    html.match(/<div[^>]+class="[^"]*image-info[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i);
  const thumb_url = ogImgMatch ? normalizeUrl(ogImgMatch[1]) : '';

  // Parse chapter list inside #list-chapter-dt, skipping hidden trap rows
  const chapters = [];
  const chapListIdx = html.indexOf('id="list-chapter-dt"');
  if (chapListIdx !== -1) {
    const chapSection = html.slice(chapListIdx, chapListIdx + 450000);
    const navMatch = chapSection.match(/<nav>[\s\S]*?<\/nav>/i);
    const navHtml = navMatch ? navMatch[0] : chapSection;

    const rowMatches = navHtml.matchAll(/<li([^>]*)>([\s\S]*?)<\/li>/gi);
    for (const rm of rowMatches) {
      const liAttrs = rm[1] || '';
      const liBody = rm[2] || '';

      // Skip decoy rows hidden by display: none
      if (/display\s*:\s*none/i.test(liAttrs)) continue;

      const aMatch = liBody.match(
        /<a[^>]+href="(?:https?:\/\/doctruyen3qhub\.club)?\/truyen-tranh\/([^"/]+)\/([^"/]+)\/(\d+)"[^>]*>([\s\S]*?)<\/a>/i
      );
      if (!aMatch) continue;

      const [, cSlug, chSlug, chId, chText] = aMatch;
      const chapName = cleanChapterName(chText);
      const encodedChapId = encodeChapterId(cSlug, chSlug, chId);

      chapters.push({
        chapter_name: chapName || chSlug,
        chapter_title: '',
        chapter_api_data: `${DOCTRUYEN3Q_BASE_URL}/chapter/${encodedChapId}`,
      });
    }
  }

  // doctruyen3qhub lists newest chapters first -> reverse so oldest is index 0
  chapters.reverse();

  return {
    status: 'success',
    data: {
      id: id || slug,
      name,
      slug: compositeSlug,
      origin_name,
      content,
      status,
      thumb_url,
      author,
      category,
      chapters,
      updatedAt: new Date().toISOString(),
      domain_cdn: '',
    },
  };
}

export async function scrapeComicChapter(compositeChapterId) {
  const decoded = decodeChapterId(compositeChapterId);
  if (!decoded) return null;

  const { comicSlug, chapterSlug, chapId } = decoded;
  const targetUrl = `${DOCTRUYEN3Q_BASE_URL}/truyen-tranh/${encodeURIComponent(comicSlug)}/${encodeURIComponent(chapterSlug)}/${encodeURIComponent(chapId)}`;
  const html = await fetchHtml(targetUrl);

  let comic_name = comicSlug;
  let chapter_name = cleanChapterName(chapterSlug);

  const titleTag = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i);
  if (titleTag) {
    const fullTitle = stripTags(titleTag[1]);
    const splitMatch = fullTitle.match(/^(.*?)\s*[-–|]\s*(?:Chapter|Chương|Chap)\s*([^\s-|]+)/i);
    if (splitMatch) {
      comic_name = splitMatch[1].trim();
      chapter_name = splitMatch[2].trim();
    } else {
      const chapPart = fullTitle.match(/(?:Chapter|Chương|Chap)\s*([^\s-|]+)/i);
      if (chapPart) chapter_name = chapPart[1].trim();
      comic_name = fullTitle.replace(/\s*(?:Chapter|Chương|Chap).*$/i, '').trim() || comic_name;
    }
  }

  const images = [];
  const imgContainerIdx = html.indexOf('class="list-image-detail"');
  if (imgContainerIdx !== -1) {
    const containerChunk = html.slice(imgContainerIdx, imgContainerIdx + 300000);
    // Only extract real chapter pages with id="page_..." to skip top banner ads
    const pageMatches = containerChunk.matchAll(
      /<div[^>]+id="page_[^"]*"[^>]+class="[^"]*page-chapter[^"]*"[^>]*>[\s\S]*?<img[^>]+(?:data-original|data-src|src)="([^"]+)"/gi
    );
    for (const pm of pageMatches) {
      const imgUrl = normalizeUrl(pm[1]);
      if (imgUrl) {
        images.push({
          image_page: images.length + 1,
          image_file: imgUrl,
        });
      }
    }
  }

  if (images.length === 0) {
    return null;
  }

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
