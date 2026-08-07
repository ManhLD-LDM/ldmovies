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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    user = await User.findById(decoded.id).select('-password');
  } catch (error) {
    return res.status(401).json({ message: 'Không được phép, token không hợp lệ' });
  }

  if (!user) {
    return res.status(401).json({ message: 'Không được phép, tài khoản không còn tồn tại' });
  }

  req.user = user;
  return next();
};
