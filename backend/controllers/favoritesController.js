import User from '../models/User.js';

// @desc    Lấy danh sách phim yêu thích
// @route   GET /api/favorites/movies
// @access  Private
export const getFavoriteMovies = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('favorites.movies').lean();
    res.json(user.favorites.movies);
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi server',
      error: error.message,
    });
  }
};

// @desc    Thêm phim vào yêu thích
// @route   POST /api/favorites/movies
// @access  Private
export const addFavoriteMovie = async (req, res) => {
  try {
    const { movieId, title, poster } = req.body;

    if (!movieId || !title) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp movieId và title',
      });
    }

    const user = await User.findById(req.user._id);

    // Kiểm tra phim đã có trong danh sách chưa
    const movieExists = user.favorites.movies.find(
      (movie) => movie.movieId === movieId
    );

    if (movieExists) {
      return res.status(400).json({
        message: 'Phim đã có trong danh sách yêu thích',
      });
    }

    user.favorites.movies.unshift({
      movieId,
      title,
      poster: poster || '',
    });

    await user.save();

    res.status(201).json({
      message: 'Đã thêm phim vào yêu thích',
      favorites: user.favorites.movies,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi server',
      error: error.message,
    });
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
    res.status(500).json({
      message: 'Lỗi server',
      error: error.message,
    });
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
    res.status(500).json({
      message: 'Lỗi server',
      error: error.message,
    });
  }
};

// @desc    Thêm anime vào yêu thích
// @route   POST /api/favorites/anime
// @access  Private
export const addFavoriteAnime = async (req, res) => {
  try {
    const { animeId, title, poster } = req.body;

    if (!animeId || !title) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp animeId và title',
      });
    }

    const user = await User.findById(req.user._id);

    // Kiểm tra anime đã có trong danh sách chưa
    const animeExists = user.favorites.anime.find(
      (anime) => anime.animeId === animeId
    );

    if (animeExists) {
      return res.status(400).json({
        message: 'Anime đã có trong danh sách yêu thích',
      });
    }

    user.favorites.anime.unshift({
      animeId,
      title,
      poster: poster || '',
    });

    await user.save();

    res.status(201).json({
      message: 'Đã thêm anime vào yêu thích',
      favorites: user.favorites.anime,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi server',
      error: error.message,
    });
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
    res.status(500).json({
      message: 'Lỗi server',
      error: error.message,
    });
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
    res.status(500).json({
      message: 'Lỗi server',
      error: error.message,
    });
  }
};

// @desc    Thêm truyện tranh vào yêu thích
// @route   POST /api/favorites/comics
// @access  Private
export const addFavoriteComic = async (req, res) => {
  try {
    const { comicId, title, poster } = req.body;

    if (!comicId || !title) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp comicId và title',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user.favorites.comics) {
      user.favorites.comics = [];
    }

    const comicExists = user.favorites.comics.find(
      (comic) => comic.comicId === comicId
    );

    if (comicExists) {
      return res.status(400).json({
        message: 'Truyện đã có trong danh sách yêu thích',
      });
    }

    user.favorites.comics.unshift({
      comicId,
      title,
      poster: poster || '',
    });

    await user.save();

    res.status(201).json({
      message: 'Đã thêm truyện vào yêu thích',
      favorites: user.favorites.comics,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Lỗi server',
      error: error.message,
    });
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
    res.status(500).json({
      message: 'Lỗi server',
      error: error.message,
    });
  }
};
