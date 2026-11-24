import User from '../models/User.js';

const MAX_FAVORITES = 200;

const sendServerError = (res, error) =>
  res.status(500).json(
    process.env.NODE_ENV === 'production'
      ? { message: 'Lỗi server' }
      : { message: 'Lỗi server', error: error.message }
  );

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

// @desc    Lấy danh sách phim yêu thích
// @route   GET /api/favorites/movies
// @access  Private
export const getFavoriteMovies = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('favorites.movies').lean();
    res.json(user.favorites.movies);
  } catch (error) {
    sendServerError(res, error);
  }
};

// @desc    Thêm phim vào yêu thích
// @route   POST /api/favorites/movies
// @access  Private
export const addFavoriteMovie = async (req, res) => {
  try {
    const parsed = sanitizeFavoriteInput(req.body.movieId, req.body.title, req.body.poster);

    if (!parsed) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp movieId và title hợp lệ',
      });
    }

    const user = await User.findById(req.user._id);

    if (user.favorites.movies.length >= MAX_FAVORITES) {
      return res.status(400).json({
        message: `Danh sách yêu thích đã đạt giới hạn tối đa ${MAX_FAVORITES} mục`,
      });
    }

    // Kiểm tra phim đã có trong danh sách chưa
    const movieExists = user.favorites.movies.find(
      (movie) => movie.movieId === parsed.cleanId
    );

    if (movieExists) {
      return res.status(400).json({
        message: 'Phim đã có trong danh sách yêu thích',
      });
    }

    user.favorites.movies.unshift({
      movieId: parsed.cleanId,
      title: parsed.cleanTitle,
      poster: parsed.cleanPoster,
    });

    await user.save();

    res.status(201).json({
      message: 'Đã thêm phim vào yêu thích',
      favorites: user.favorites.movies,
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// @desc    Xóa phim khỏi yêu thích
// @route   DELETE /api/favorites/movies/:movieId
// @access  Private
export const removeFavoriteMovie = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    user.favorites.movies = user.favorites.movies.filter(
      (movie) => movie.movieId !== req.params.movieId
    );

    await user.save();

    res.json({
      message: 'Đã xóa phim khỏi yêu thích',
      favorites: user.favorites.movies,
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// @desc    Lấy danh sách anime yêu thích
// @route   GET /api/favorites/anime
// @access  Private
export const getFavoriteAnime = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('favorites.anime').lean();
    res.json(user.favorites.anime);
  } catch (error) {
    sendServerError(res, error);
  }
};

// @desc    Thêm anime vào yêu thích
// @route   POST /api/favorites/anime
// @access  Private
export const addFavoriteAnime = async (req, res) => {
  try {
    const parsed = sanitizeFavoriteInput(req.body.animeId, req.body.title, req.body.poster);

    if (!parsed) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp animeId và title hợp lệ',
      });
    }

    const user = await User.findById(req.user._id);

    if (user.favorites.anime.length >= MAX_FAVORITES) {
      return res.status(400).json({
        message: `Danh sách yêu thích đã đạt giới hạn tối đa ${MAX_FAVORITES} mục`,
      });
    }

    // Kiểm tra anime đã có trong danh sách chưa
    const animeExists = user.favorites.anime.find(
      (anime) => anime.animeId === parsed.cleanId
    );

    if (animeExists) {
      return res.status(400).json({
        message: 'Anime đã có trong danh sách yêu thích',
      });
    }

    user.favorites.anime.unshift({
      animeId: parsed.cleanId,
      title: parsed.cleanTitle,
      poster: parsed.cleanPoster,
    });

    await user.save();

    res.status(201).json({
      message: 'Đã thêm anime vào yêu thích',
      favorites: user.favorites.anime,
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// @desc    Xóa anime khỏi yêu thích
// @route   DELETE /api/favorites/anime/:animeId
// @access  Private
export const removeFavoriteAnime = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    user.favorites.anime = user.favorites.anime.filter(
      (anime) => anime.animeId !== req.params.animeId
    );

    await user.save();

    res.json({
      message: 'Đã xóa anime khỏi yêu thích',
      favorites: user.favorites.anime,
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// @desc    Lấy danh sách truyện tranh yêu thích
// @route   GET /api/favorites/comics
// @access  Private
export const getFavoriteComics = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('favorites.comics').lean();
    res.json(user.favorites.comics || []);
  } catch (error) {
    sendServerError(res, error);
  }
};

// @desc    Thêm truyện tranh vào yêu thích
// @route   POST /api/favorites/comics
// @access  Private
export const addFavoriteComic = async (req, res) => {
  try {
    const parsed = sanitizeFavoriteInput(req.body.comicId, req.body.title, req.body.poster);

    if (!parsed) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp comicId và title hợp lệ',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user.favorites.comics) {
      user.favorites.comics = [];
    }

    if (user.favorites.comics.length >= MAX_FAVORITES) {
      return res.status(400).json({
        message: `Danh sách yêu thích đã đạt giới hạn tối đa ${MAX_FAVORITES} mục`,
      });
    }

    const comicExists = user.favorites.comics.find(
      (comic) => comic.comicId === parsed.cleanId
    );

    if (comicExists) {
      return res.status(400).json({
        message: 'Truyện đã có trong danh sách yêu thích',
      });
    }

    user.favorites.comics.unshift({
      comicId: parsed.cleanId,
      title: parsed.cleanTitle,
      poster: parsed.cleanPoster,
    });

    await user.save();

    res.status(201).json({
      message: 'Đã thêm truyện vào yêu thích',
      favorites: user.favorites.comics,
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// @desc    Xóa truyện tranh khỏi yêu thích
// @route   DELETE /api/favorites/comics/:comicId
// @access  Private
export const removeFavoriteComic = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.favorites.comics) {
      user.favorites.comics = user.favorites.comics.filter(
        (comic) => comic.comicId !== req.params.comicId
      );
      await user.save();
    }

    res.json({
      message: 'Đã xóa truyện khỏi yêu thích',
      favorites: user.favorites.comics || [],
    });
  } catch (error) {
    sendServerError(res, error);
  }
};
