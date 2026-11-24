import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Vui lòng nhập username'],
      unique: true,
      trim: true,
      minlength: [3, 'Username phải có ít nhất 3 ký tự'],
      maxlength: [30, 'Username không được quá 30 ký tự'],
    },
    email: {
      type: String,
      required: [true, 'Vui lòng nhập email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Vui lòng nhập email hợp lệ',
      ],
    },
    password: {
      type: String,
      required: [true, 'Vui lòng nhập mật khẩu'],
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    avatar: {
      type: String,
      default: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%2327272a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23a1a1aa" font-family="sans-serif" font-size="40">User</text></svg>',
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio không được quá 500 ký tự'],
      default: '',
    },
    favorites: {
      movies: [
        {
          movieId: String,
          title: String,
          poster: String,
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      anime: [
        {
          animeId: String,
          title: String,
          poster: String,
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      comics: [
        {
          comicId: String,
          title: String,
          poster: String,
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    comicHistory: [
      {
        slug: String,
        name: String,
        chapterName: String,
        chapterId: String,
        poster: String,
        watchedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    watchHistory: [
      {
        slug: String,
        type: { type: String }, // 'anime' or 'movie'
        name: String,
        episodeName: String,
        progress: Number,
        duration: Number,
        poster: String,
        watchedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Mã hóa mật khẩu trước khi lưu
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
});

// So sánh mật khẩu
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
