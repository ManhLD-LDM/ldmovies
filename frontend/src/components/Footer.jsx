import { FiHeart } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import useAppStore from '../stores/appStore';

function Footer() {
    const { appMode, setAppMode } = useAppStore();
    const isComicMode = appMode === 'comic';

    return (
        <footer className="bg-dark-100 border-t border-dark-300 py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Logo & Mô tả */}
                    <div className="col-span-1 md:col-span-2">
                        <Link
                            to={isComicMode ? '/comics' : '/'}
                            onClick={() => setAppMode(isComicMode ? 'comic' : 'movie')}
                            className="flex items-center space-x-2 mb-4"
                        >
                            <span
                                className={`text-2xl font-black bg-gradient-to-r ${
                                    isComicMode
                                        ? 'from-cyan-400 via-teal-400 to-emerald-400'
                                        : 'from-violet-400 via-purple-500 to-violet-600'
                                } bg-clip-text text-transparent`}
                            >
                                {isComicMode ? 'LowDetailComics' : 'LowDetailMovies'}
                            </span>
                        </Link>
                        <p className="text-gray-400 text-sm">
                            {isComicMode
                                ? 'Nền tảng đọc truyện tranh trực tuyến miễn phí. Thưởng thức truyện yêu thích mọi lúc, mọi nơi.'
                                : 'Nền tảng xem phim và anime trực tuyến. Thưởng thức nội dung yêu thích mọi lúc, mọi nơi.'}
                        </p>
                    </div>

                    {/* Liên Kết Nhanh */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Liên Kết Nhanh</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/" onClick={() => setAppMode('movie')} className="text-gray-400 hover:text-white text-sm transition-colors">
                                    Trang Chủ
                                </Link>
                            </li>
                            <li>
                                <Link to="/anime" onClick={() => setAppMode('movie')} className="text-gray-400 hover:text-white text-sm transition-colors">
                                    Anime
                                </Link>
                            </li>
                            <li>
                                <Link to="/movies" onClick={() => setAppMode('movie')} className="text-gray-400 hover:text-white text-sm transition-colors">
                                    Phim
                                </Link>
                            </li>
                            <li>
                                <Link to="/comics" onClick={() => setAppMode('comic')} className="text-gray-400 hover:text-white text-sm transition-colors">
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
                        © {new Date().getFullYear()} LowDetailMovies & Comics. Bảo lưu mọi quyền.
                    </p>
                    <div className="flex items-center space-x-2 mt-4 md:mt-0 text-gray-400 text-sm">
                        <span>Làm với</span>
                        <FiHeart className="text-primary-500" aria-label="yêu thương" />
                        <span>cho mục đích giải trí & phi thương mại</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
