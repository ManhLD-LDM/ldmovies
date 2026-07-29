import { FiHeart } from 'react-icons/fi';
import { Link } from 'react-router-dom';

function Footer() {
    return (
        <footer className="bg-dark-100 border-t border-dark-300 py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Logo & Mô tả */}
                    <div className="col-span-1 md:col-span-2">
                        <Link to="/" className="flex items-center space-x-2 mb-4">
                            <span className="text-2xl font-black bg-gradient-to-r from-violet-400 via-purple-500 to-violet-600 bg-clip-text text-transparent">LowDetailMovies</span>
                        </Link>
                        <p className="text-gray-400 text-sm">
                            Nền tảng xem phim và anime trực tuyến.
                            Thưởng thức nội dung yêu thích mọi lúc, mọi nơi.
                        </p>
                    </div>

                    {/* Liên Kết Nhanh */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Liên Kết Nhanh</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/" className="text-gray-400 hover:text-white text-sm transition-colors">
                                    Trang Chủ
                                </Link>
                            </li>
                            <li>
                                <Link to="/anime" className="text-gray-400 hover:text-white text-sm transition-colors">
                                    Anime
                                </Link>
                            </li>
                            <li>
                                <Link to="/movies" className="text-gray-400 hover:text-white text-sm transition-colors">
                                    Phim
                                </Link>
                            </li>
                            <li>
                                <Link to="/comics" className="text-gray-400 hover:text-white text-sm transition-colors">
                                    Truyện Tranh
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Thông Tin */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Thông Tin</h3>
                        <ul className="space-y-2">
                            <li className="text-gray-400 text-sm">
                                Chỉ dành cho mục đích cá nhân
                            </li>
                            <li className="text-gray-400 text-sm">
                                Tự host &amp; streaming
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-dark-300 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-gray-400 text-sm">
                        © 2024 LowDetailMovies. Bảo lưu mọi quyền.
                    </p>
                    <div className="flex items-center space-x-2 mt-4 md:mt-0 text-gray-400 text-sm">
                        <span>Làm với</span>
                        <FiHeart className="text-primary-500" />
                        <span>cho mục đích cá nhân</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
