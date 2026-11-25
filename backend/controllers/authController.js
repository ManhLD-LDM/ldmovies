import User from '../models/User.js';
import { sendServerError } from '../utils/errors.js';
import { generateToken } from '../utils/token.js';

// @desc    Đăng ký user mới
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Dữ liệu đăng ký không hợp lệ' });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || !cleanEmail || password.length < 6 || password.length > 128) {
      return res.status(400).json({
        message: 'Vui lòng nhập đầy đủ thông tin (mật khẩu từ 6 đến 128 ký tự)',
      });
    }

    // Kiểm tra user đã tồn tại
    const userExists = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }],
    });

    if (userExists) {
      return res.status(400).json({
        message: 'Email hoặc username đã được sử dụng',
      });
    }

    // Tạo user mới
    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    sendServerError(res, error);
  }
};

// @desc    Đăng nhập user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Kiểm tra kiểu dữ liệu và rỗng
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({
        message: 'Vui lòng nhập email và mật khẩu',
      });
    }

    if (password.length > 128) {
      return res.status(401).json({
        message: 'Email hoặc mật khẩu không đúng',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Tìm user với password field
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Email hoặc mật khẩu không đúng',
      });
    }

    // Kiểm tra mật khẩu
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: 'Email hoặc mật khẩu không đúng',
      });
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      token: generateToken(user._id),
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// @desc    Lấy thông tin user hiện tại
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
    });
  } catch (error) {
    sendServerError(res, error);
  }
};
