import axios from 'axios';
import NodeCache from 'node-cache';

// Cache mặc định 10 phút cho danh sách, 1 tiếng cho chi tiết truyện
const myCache = new NodeCache({ stdTTL: 600, checkperiod: 620 });

const API_BASE_URL = process.env.OTRUYEN_API_URL || 'https://otruyenapi.com/v1/api';
const CDN_URL = process.env.OTRUYEN_CDN_URL || 'https://img.otruyenapi.com';

const sendCached = (res, data, maxAge = 300) => {
  res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
  return res.json(data);
};

export const getLatestComics = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const cacheKey = `comics_latest_${page}`;
    
    // Check cache
    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return sendCached(res, cachedData, 300);
    }

    const response = await axios.get(`${API_BASE_URL}/danh-sach/truyen-moi?page=${page}`);
    const data = response.data;

    // Transform data to include full image URLs and match our frontend needs
    if (data && data.status === 'success') {
        const transformedItems = data.data.items.map(item => ({
            id: item._id,
            name: item.name,
            slug: item.slug,
            origin_name: item.origin_name,
            thumb_url: `${data.data.APP_DOMAIN_CDN_IMAGE}/uploads/comics/${item.thumb_url}`,
            updatedAt: item.updatedAt,
            chaptersLatest: item.chaptersLatest
        }));

        const result = {
            status: 'success',
            data: {
                items: transformedItems,
                pagination: data.data.params.pagination
            }
        };

        // Save to cache - chi tiết truyện ít thay đổi, cache 1 tiếng
        myCache.set(cacheKey, result, 3600);
        return sendCached(res, result, 300);
    }
    
    return res.status(404).json({ message: 'No comics found' });
  } catch (error) {
    console.error('Error fetching latest comics:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getComicDetails = async (req, res) => {
  try {
    const { slug } = req.params;
    const cacheKey = `comic_detail_${slug}`;
    
    // Check cache
    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return sendCached(res, cachedData, 600);
    }

    const response = await axios.get(`${API_BASE_URL}/truyen-tranh/${slug}`);
    const data = response.data;

    if (data && data.status === 'success') {
        const item = data.data.item;
        const result = {
            status: 'success',
            data: {
                id: item._id,
                name: item.name,
                slug: item.slug,
                origin_name: item.origin_name,
                content: item.content,
                status: item.status,
                thumb_url: `${data.data.APP_DOMAIN_CDN_IMAGE}/uploads/comics/${item.thumb_url}`,
                author: item.author,
                category: item.category,
                chapters: item.chapters[0]?.server_data || [], // Otruyen usually has server_data inside chapters[0]
                updatedAt: item.updatedAt,
                domain_cdn: data.data.APP_DOMAIN_CDN_IMAGE
            }
        };

        // Save to cache
        myCache.set(cacheKey, result);
        return sendCached(res, result, 600);
    }
    
    return res.status(404).json({ message: 'Comic not found' });
  } catch (error) {
    console.error('Error fetching comic details:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getComicChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const cacheKey = `comic_chapter_${chapterId}`;
    
    // Check cache
    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return sendCached(res, cachedData, 86400);
    }

    // Usually OTruyen chapter data is fetched from sv1.otruyencdn.com
    const response = await axios.get(`https://sv1.otruyencdn.com/v1/api/chapter/${chapterId}`);
    const data = response.data;

    if (data && data.status === 'success') {
      // Save to cache
      myCache.set(cacheKey, data);
      return sendCached(res, data, 86400);
    }
    
    return res.status(404).json({ message: 'Chapter not found' });
  } catch (error) {
    console.error('Error fetching comic chapter:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getGenres = async (req, res) => {
  try {
    const cacheKey = 'comic_genres';
    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return sendCached(res, cachedData, 86400);
    }

    const response = await axios.get('https://otruyenapi.com/v1/api/the-loai');
    const data = response.data;
    if (data && data.status === 'success') {
      myCache.set(cacheKey, data, 86400); // cache genres for 1 day
      return sendCached(res, data, 86400);
    }
    
    return res.status(404).json({ message: 'Genres not found' });
  } catch (error) {
    console.error('Error fetching genres:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getComicsByGenre = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = req.query.page || 1;
    const cacheKey = `comic_genre_${slug}_${page}`;
    
    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return sendCached(res, cachedData, 600);
    }

    const response = await axios.get(`https://otruyenapi.com/v1/api/the-loai/${slug}?page=${page}`);
    const data = response.data;
    if (data && data.status === 'success') {
      myCache.set(cacheKey, data);
      return sendCached(res, data, 600);
    }
    
    return res.status(404).json({ message: 'Category not found' });
  } catch (error) {
    console.error('Error fetching comics by genre:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const searchComics = async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) {
      return res.status(400).json({ message: 'Keyword is required' });
    }
    
    // Search results shouldn't be cached as strictly, or we can use short TTL
    const response = await axios.get(`https://otruyenapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}`);
    const data = response.data;
    if (data && data.status === 'success') {
      return res.json(data);
    }
    
    return res.status(404).json({ message: 'No comics found' });
  } catch (error) {
    console.error('Error searching comics:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};
