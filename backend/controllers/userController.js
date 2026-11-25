import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { sendServerError } from '../utils/errors.js';
import { generateToken } from '../utils/token.js';

const isValidAvatar = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('https://')) {
    return trimmed.length <= 1000;
  }
  if (/^data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml);/i.test(trimmed)) {
    return (
      trimmed.length <= 8000 &&
      !/<script/i.test(trimmed) &&
      !/\bon\w+\s*=/i.test(trimmed) &&
      !/javascript:/i.test(trimmed)
    );
  }
  return false;
};

// @desc    Lấy thông tin profile user
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('username email avatar bio createdAt').lean();

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }

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

// @desc    Cập nhật profile user
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const { username, avatar, bio } = req.body;

    if (username !== undefined && typeof username !== 'string') {
      return res.status(400).json({ message: 'Username không hợp lệ' });
    }
    if (bio !== undefined && typeof bio !== 'string') {
      return res.status(400).json({ message: 'Bio không hợp lệ' });
    }
    if (avatar !== undefined && !isValidAvatar(avatar)) {
      return res.status(400).json({ message: 'URL ảnh đại diện không hợp lệ (chỉ chấp nhận https:// hoặc data:image)' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }

    const nextUsername = typeof username === 'string' ? username.trim() : '';

    // Kiểm tra username đã tồn tại chưa TRƯỚC khi gán giá trị mới
    if (nextUsername && nextUsername !== user.username) {
      const usernameExists = await User.findOne({
        username: nextUsername,
        // trusted(): sanitizeFilter would otherwise turn $ne into a literal $eq match
        _id: mongoose.trusted({ $ne: user._id }),
      });

      if (usernameExists) {
        return res.status(400).json({
          message: 'Username đã được sử dụng',
        });
      }
      user.username = nextUsername;
    }

    if (typeof avatar === 'string' && avatar.trim()) {
      user.avatar = avatar.trim();
    }
    if (bio !== undefined) {
      user.bio = bio;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      bio: updatedUser.bio,
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// @desc    Đổi mật khẩu user
// @route   PUT /api/users/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp đầy đủ thông tin',
      });
    }

    // Check password length
    if (newPassword.length < 6 || newPassword.length > 128) {
      return res.status(400).json({
        message: 'Mật khẩu mới phải có từ 6 đến 128 ký tự',
      });
    }

    // Tìm user với password field (không dùng .lean() vì cần gọi .save())
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: 'Mật khẩu hiện tại không đúng',
      });
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại',
      });
    }

    // Hash new password and save
    user.password = newPassword;
    await user.save();

    // Old tokens are now invalid (passwordChangedAt), so hand back a fresh one
    // to keep the current session logged in.
    res.json({
      message: 'Đổi mật khẩu thành công',
      token: generateToken(user._id),
    });
  } catch (error) {
    sendServerError(res, error);
  }
};
