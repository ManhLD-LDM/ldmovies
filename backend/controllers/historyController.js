import User from '../models/User.js';

const sendServerError = (res, error) =>
  res.status(500).json(
    process.env.NODE_ENV === 'production'
      ? { message: 'Lỗi server' }
      : { message: error.message }
  );

const safeStr = (val, maxLen = 300) => (typeof val === 'string' ? val.trim().slice(0, maxLen) : '');
const safeNum = (val) => (Number.isFinite(Number(val)) && Number(val) >= 0 ? Number(val) : 0);

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
    sendServerError(res, error);
  }
};

// @desc    Cập nhật/Thêm 1 phim vào lịch sử (tối đa 20 phim)
// @route   POST /api/history
// @access  Private
export const syncHistoryItem = async (req, res) => {
  try {
    const item = req.body;
    const slug = safeStr(item?.slug, 300);
    const episodeName = safeStr(item?.episodeName, 200);

    if (!slug || !episodeName) {
      return res.status(400).json({ message: 'Thiếu thông tin phim' });
    }

    const newEntry = {
      slug,
      type: safeStr(item?.type, 50) || 'movie',
      name: safeStr(item?.name, 300),
      episodeName,
      progress: safeNum(item?.progress),
      duration: safeNum(item?.duration),
      poster: safeStr(item?.poster, 1000),
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
                            { $eq: ['$$this.slug', slug] },
                            { $eq: ['$$this.episodeName', episodeName] },
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
    sendServerError(res, error);
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
    sendServerError(res, error);
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
    sendServerError(res, error);
  }
};

// @desc    Cập nhật/Thêm 1 truyện vào lịch sử (tối đa 50 truyện)
// @route   POST /api/history/comics
// @access  Private
export const syncComicHistoryItem = async (req, res) => {
  try {
    const item = req.body;
    const slug = safeStr(item?.slug, 300);
    const chapterName = safeStr(item?.chapterName, 200);

    if (!slug || !chapterName) {
      return res.status(400).json({ message: 'Thiếu thông tin truyện hoặc chương' });
    }

    const newEntry = {
      slug,
      name: safeStr(item?.name, 300),
      chapterName,
      chapterId: safeStr(item?.chapterId, 200),
      poster: safeStr(item?.poster, 1000),
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
                      cond: { $not: { $eq: ['$$this.slug', slug] } },
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
    sendServerError(res, error);
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
    sendServerError(res, error);
  }
};
