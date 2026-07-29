import { useState } from 'react';
import { FiEye, FiEyeOff, FiLock, FiMail, FiUser } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuthStore from '../stores/authStore';

function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleChange = (e) => {
    clearError();
    setPasswordError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Mật khẩu không khớp');
      toast.error('Mật khẩu không khớp');
      return;
    }

    if (formData.password.length < 6) {
      setPasswordError('Mật khẩu phải có ít nhất 6 ký tự');
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    const result = await register({
      username: formData.username,
      email: formData.email,
      password: formData.password,
    });
    
    if (result.success) {
      toast.success('Đăng ký thành công!');
      navigate('/');
    } else {
      toast.error(result.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-dark-200 rounded-2xl p-8 shadow-xl">
          {/* Tiêu đề */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Tạo Tài Khoản</h1>
            <p className="text-gray-400">Tham gia LowDetailMovies ngay hôm nay</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tên người dùng */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Tên Người Dùng
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Chọn tên người dùng"
                  className="w-full px-4 py-3 pl-12 bg-dark-300 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                  required
                  minLength={3}
                />
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Nhập email của bạn"
                  className="w-full px-4 py-3 pl-12 bg-dark-300 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                  required
                />
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Mật Khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Tạo mật khẩu (ít nhất 6 ký tự)"
                  className="w-full px-4 py-3 pl-12 pr-12 bg-dark-300 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                  required
                  minLength={6}
                />
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Xác Nhận Mật Khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full px-4 py-3 pl-12 bg-dark-300 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                  required
                />
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            {/* Thông báo lỗi */}
            {(error || passwordError) && (
              <p className="text-red-500 text-sm text-center">
                {passwordError || error}
              </p>
            )}

            {/* Nút đăng ký */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản'}
            </button>
          </form>

          {/* Liên kết đăng nhập */}
          <p className="text-center text-gray-400 mt-6">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-primary-500 hover:text-primary-400">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
