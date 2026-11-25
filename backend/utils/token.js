import jwt from 'jsonwebtoken';

// `pca` = the user's passwordChangedAt (ms) when the token was issued.
// The auth middleware rejects the token once passwordChangedAt changes, which is
// exact even within the same second (JWT `iat` only has 1-second resolution).
export const generateToken = (user) =>
  jwt.sign(
    { id: user._id, pca: user.passwordChangedAt ? new Date(user.passwordChangedAt).getTime() : 0 },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
      algorithm: 'HS256',
    }
  );
