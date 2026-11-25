import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Không được phép, không có token' });
  }

  const token = header.split(' ')[1];
  let user;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    user = await User.findById(decoded.id).select('-password');
    const changedAtMs = user?.passwordChangedAt ? user.passwordChangedAt.getTime() : 0;
    const isStale =
      typeof decoded.pca === 'number'
        ? decoded.pca !== changedAtMs // token mới: so khớp chính xác thời điểm đổi mật khẩu
        : Boolean(changedAtMs && decoded.iat && decoded.iat * 1000 < changedAtMs); // token cũ (chưa có pca)
    if (user && isStale) {
      return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Không được phép, token không hợp lệ' });
  }

  if (!user) {
    return res.status(401).json({ message: 'Không được phép, tài khoản không còn tồn tại' });
  }

  req.user = user;
  return next();
};
