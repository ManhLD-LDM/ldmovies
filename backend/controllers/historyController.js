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
      slug: item.slug,
      type: item.type || 'movie',
      name: item.name,
      episodeName: item.episodeName,
      progress: item.progress || 0,
      duration: item.duration || 0,
      poster: item.poster || '',
      watchedAt: new Date(),
    };

    // Đơn lẻ 1 lệnh ghi nguyên tử (atomic update pipeline)
    await User.updateOne({ _id: req.user._id }, [
      {
        $set: {
          watchHistory: {
            $slice: [
              {
                $concatArrays: [
                  [newEntry],
                  {
                    $filter: {
                      input: { $ifNull: ['$watchHistory', []] },
                      cond: {
                        $not: {
                          $and: [
                            { $eq: ['$$this.slug', item.slug] },
                            { $eq: ['$$this.episodeName', item.episodeName] },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
              20,
            ],
          },
        },
      },
    ]);

    res.status(204).end();
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
      slug: item.slug,
      name: item.name,
      chapterName: item.chapterName,
      chapterId: item.chapterId || '',
      poster: item.poster || '',
      watchedAt: new Date(),
    };

    await User.updateOne({ _id: req.user._id }, [
      {
        $set: {
          comicHistory: {
            $slice: [
              {
                $concatArrays: [
                  [newEntry],
                  {
                    $filter: {
                      input: { $ifNull: ['$comicHistory', []] },
                      cond: { $not: { $eq: ['$$this.slug', item.slug] } },
                    },
                  },
                ],
              },
              50,
            ],
          },
        },
      },
    ]);

    res.status(204).end();
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
