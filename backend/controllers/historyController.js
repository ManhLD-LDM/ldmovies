import User from '../models/User.js';

// @desc    Lấy lịch sử xem phim
// @route   GET /api/history
// @access  Private
export const getHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    res.json(user.watchHistory || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cập nhật/Thêm 1 phim vào lịch sử (tối đa 20 phim)
// @route   POST /api/history
// @access  Private
export const syncHistoryItem = async (req, res) => {
  try {
    const item = req.body;
    
    if (!item.slug || !item.episodeName) {
      return res.status(400).json({ message: 'Thiếu thông tin phim' });
    }

    const newEntry = {
      ...item,
      watchedAt: Date.now(),
      progress: item.progress || 0,
      duration: item.duration || 0,
    };

    // Remove existing entry if it exists to avoid duplicates
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { watchHistory: { slug: item.slug, episodeName: item.episodeName } } }
    );

    // Push new entry to the top and slice to keep only the latest 20
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          watchHistory: {
            $each: [newEntry],
            $position: 0,
            $slice: 20,
          },
        },
      },
      { new: true, select: 'watchHistory' }
    );

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.json(user.watchHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Xoá 1 phim khỏi lịch sử
// @route   DELETE /api/history/:slug/:episodeName
// @access  Private
export const deleteHistoryItem = async (req, res) => {
  try {
    const { slug, episodeName } = req.params;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { watchHistory: { slug, episodeName } } },
      { new: true, select: '_id' }
    );

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    res.json({ message: 'Đã xoá khỏi lịch sử' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lấy lịch sử đọc truyện
// @route   GET /api/history/comics
// @access  Private
export const getComicHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    res.json(user.comicHistory || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cập nhật/Thêm 1 truyện vào lịch sử (tối đa 50 truyện)
// @route   POST /api/history/comics
// @access  Private
export const syncComicHistoryItem = async (req, res) => {
  try {
    const item = req.body;
    
    if (!item.slug || !item.chapterName) {
      return res.status(400).json({ message: 'Thiếu thông tin truyện hoặc chương' });
    }

    const newEntry = {
      ...item,
      watchedAt: Date.now(),
    };

    // Remove existing entry if it exists to avoid duplicates
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { comicHistory: { slug: item.slug } } }
    );

    // Push new entry to the top and slice to keep only the latest 50
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          comicHistory: {
            $each: [newEntry],
            $position: 0,
            $slice: 50,
          },
        },
      },
      { new: true, select: 'comicHistory' }
    );

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.json(user.comicHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Xoá 1 truyện khỏi lịch sử
// @route   DELETE /api/history/comics/:slug
// @access  Private
export const deleteComicHistoryItem = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { comicHistory: { slug } } },
      { new: true, select: '_id' }
    );

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    res.json({ message: 'Đã xoá khỏi lịch sử đọc truyện' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
