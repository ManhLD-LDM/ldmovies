// Map known Mongoose errors to 400 instead of a generic 500.
export const sendServerError = (res, error) => {
  if (error?.name === 'ValidationError') {
    const first = Object.values(error.errors || {})[0];
    return res.status(400).json({ message: first?.message || 'Dữ liệu không hợp lệ' });
  }
  if (error?.code === 11000) {
    return res.status(400).json({ message: 'Email hoặc username đã được sử dụng' });
  }
  return res.status(500).json(
    process.env.NODE_ENV === 'production'
      ? { message: 'Lỗi server' }
      : { message: 'Lỗi server', error: error?.message }
  );
};
