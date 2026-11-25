import mongoose from 'mongoose';
import User from '../models/User.js';
import { sendServerError } from '../utils/errors.js';

const MAX_FAVORITES = 200;

const sanitizeFavoriteInput = (id, title, poster) => {
  if (typeof id !== 'string' || typeof title !== 'string') return null;
  const cleanId = id.trim().slice(0, 300);
  const cleanTitle = title.trim().slice(0, 300);
  if (!cleanId || !cleanTitle) return null;
  let cleanPoster = '';
  if (typeof poster === 'string') {
    const trimmed = poster.trim();
    if (trimmed.startsWith('https://') || trimmed.startsWith('/api/img')) {
      cleanPoster = trimmed.slice(0, 1000);
    }
  }
  return { cleanId, cleanTitle, cleanPoster };
};

const loadList = async (userId, field) => {
  const user = await User.findById(userId).select(`favorites.${field}`).lean();
  return user?.favorites?.[field] || [];
};

// Builds get/add/remove handlers for one favorites list.
// Add/remove are single atomic updates, so concurrent clicks cannot lose writes.
// Operator objects are wrapped in mongoose.trusted() because sanitizeFilter is on.
const createFavoriteHandlers = ({ field, idKey, label }) => {
  const path = `favorites.${field}`;

  const get = async (req, res) => {
    try {
      res.json(await loadList(req.user._id, field));
    } catch (error) {
      sendServerError(res, error);
    }
  };

  const add = async (req, res) => {
    try {
      const parsed = sanitizeFavoriteInput(req.body[idKey], req.body.title, req.body.poster);
      if (!parsed) {
        return res.status(400).json({ message: `Vui lòng cung cấp ${idKey} và title hợp lệ` });
      }

      const result = await User.updateOne(
        {
          _id: req.user._id,
          [`${path}.${idKey}`]: mongoose.trusted({ $ne: parsed.cleanId }),
          [`${path}.${MAX_FAVORITES - 1}`]: mongoose.trusted({ $exists: false }),
        },
        {
          $push: {
            [path]: {
              $each: [{ [idKey]: parsed.cleanId, title: parsed.cleanTitle, poster: parsed.cleanPoster }],
              $position: 0,
            },
          },
        }
      );

      const favorites = await loadList(req.user._id, field);

      if (result.modifiedCount === 1) {
        return res.status(201).json({ message: `Đã thêm ${label} vào yêu thích`, favorites });
      }
      if (favorites.some((item) => item[idKey] === parsed.cleanId)) {
        // Idempotent: already favorited (e.g. double click) is not an error
        return res.status(200).json({ message: `${label} đã có trong danh sách yêu thích`, favorites });
      }
      return res.status(400).json({
        message: `Danh sách yêu thích đã đạt giới hạn tối đa ${MAX_FAVORITES} mục`,
      });
    } catch (error) {
      sendServerError(res, error);
    }
  };

  const remove = async (req, res) => {
    try {
      const targetId = String(req.params[idKey] || '');
      await User.updateOne({ _id: req.user._id }, { $pull: { [path]: { [idKey]: targetId } } });
      const favorites = await loadList(req.user._id, field);
      res.json({ message: `Đã xóa ${label} khỏi yêu thích`, favorites });
    } catch (error) {
      sendServerError(res, error);
    }
  };

  return { get, add, remove };
};

const movieHandlers = createFavoriteHandlers({ field: 'movies', idKey: 'movieId', label: 'phim' });
const animeHandlers = createFavoriteHandlers({ field: 'anime', idKey: 'animeId', label: 'anime' });
const comicHandlers = createFavoriteHandlers({ field: 'comics', idKey: 'comicId', label: 'truyện' });

// @route GET/POST /api/favorites/movies, DELETE /api/favorites/movies/:movieId
export const getFavoriteMovies = movieHandlers.get;
export const addFavoriteMovie = movieHandlers.add;
export const removeFavoriteMovie = movieHandlers.remove;

// @route GET/POST /api/favorites/anime, DELETE /api/favorites/anime/:animeId
export const getFavoriteAnime = animeHandlers.get;
export const addFavoriteAnime = animeHandlers.add;
export const removeFavoriteAnime = animeHandlers.remove;

// @route GET/POST /api/favorites/comics, DELETE /api/favorites/comics/:comicId
export const getFavoriteComics = comicHandlers.get;
export const addFavoriteComic = comicHandlers.add;
export const removeFavoriteComic = comicHandlers.remove;
