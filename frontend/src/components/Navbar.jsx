import { useEffect, useRef, useState, useCallback } from 'react';
import { FiHeart, FiLogOut, FiMenu, FiSearch, FiUser, FiX, FiBookOpen, FiFilm, FiClock, FiZap } from 'react-icons/fi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { kkphimApi } from '../services/kkphimApi';
import { comicApi } from '../services/comicApi';
import useAuthStore from '../stores/authStore';
import useAppStore from '../stores/appStore';
import useDataSaverStore from '../stores/dataSaverStore';

function getAvatarUrl(username) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'U')}&background=7C3AED&color=fff&size=64&bold=true`;
}

const SearchSuggestions = ({ loading, suggestions, searchQuery, onSuggestionClick }) => {
  if (!loading && suggestions.length === 0 && searchQuery.trim().length <= 1) return null;

  return (
    <div className="absolute top-full mt-2 w-full min-w-[280px] bg-dark-200/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
      {loading ? (
        <div className="px-4 py-3 text-gray-400 text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Đang tìm kiếm...</span>
        </div>
      ) : suggestions.length > 0 ? (
        <div className="max-h-80 overflow-y-auto custom-scrollbar">
          {suggestions.map((item) => (
            <button
              key={item.id}
              onClick={(e) => onSuggestionClick(item, e)}
              type="button"
              className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-white/10 transition-colors text-left group border-b border-white/5 last:border-0"
            >
              <img
                src={item.poster || item.thumb_url}
                alt={item.name}
                className="w-10 h-14 object-cover rounded shadow"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate group-hover:text-primary-400 transition-colors">{item.name}</div>
                <div className="text-gray-400 text-xs truncate">{item.origin_name}</div>
                <div className="text-gray-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                  {item.year && <span>{item.year}</span>}
                  {item.quality && (
                    <span className="px-1.5 py-0.2 bg-primary-600/30 text-primary-300 rounded text-[10px] font-semibold">
                      {item.quality}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : searchQuery.trim().length > 1 ? (
        <div className="px-4 py-3 text-gray-400 text-sm text-center">Không tìm thấy kết quả</div>
      ) : null}
    </div>
  );
};

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const debounceTimeout = useRef(null);

  const { user, isAuthenticated, logout } = useAuthStore();
  const { appMode, toggleAppMode } = useAppStore();
  const { enabled: dataSaverEnabled, toggle: toggleDataSaver } = useDataSaverStore();

  useEffect(() => {
    setIsMenuOpen(false);
    setShowSuggestions(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedDesktop = desktopSearchRef.current && desktopSearchRef.current.contains(event.target);
      const clickedMobile = mobileSearchRef.current && mobileSearchRef.current.contains(event.target);
      if (!clickedDesktop && !clickedMobile) {
        setShowSuggestions(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (searchQuery.trim().length > 1) {
      setLoading(true);
      debounceTimeout.current = setTimeout(async () => {
        try {
          if (appMode === 'comic') {
            const response = await comicApi.searchComics(searchQuery.trim());
            const mappedComics = (response.data?.items || []).slice(0, 5).map(item => ({
              id: item._id,
              slug: item.slug,
              name: item.name,
              origin_name: item.origin_name?.length ? item.origin_name[0] : '',
              thumb_url: item.thumb_url?.startsWith('http') ? item.thumb_url : `https://img.otruyenapi.com/uploads/comics/${item.thumb_url}`,
              year: '',
              quality: 'Truyện',
              isComic: true
            }));
            setSuggestions(mappedComics);
          } else {
            const response = await kkphimApi.searchAnime(searchQuery.trim());
            setSuggestions(response.data.slice(0, 5));
          }
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [searchQuery, appMode]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const searchUrl = appMode === 'comic'
        ? `/comics?q=${encodeURIComponent(searchQuery.trim())}`
        : `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      navigate(searchUrl);
      setSearchQuery('');
      setShowSuggestions(false);
      setIsMenuOpen(false);
    }
  };

  const handleSuggestionClick = useCallback((item, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const detailUrl = item.isComic ? `/comics/${item.slug}` : `/anime/${item.slug}`;
    navigate(detailUrl);
    setSearchQuery('');
    setShowSuggestions(false);
    setIsMenuOpen(false);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  const isDetailPage = location.pathname.includes('/anime/') || location.pathname.includes('/movie/') || location.pathname.includes('/watch/');
  const positionClass = isDetailPage ? "absolute top-0 left-0 right-0 z-40" : "fixed top-0 left-0 right-0 z-50";

  return (
    <nav className={`${positionClass} bg-dark-100/85 backdrop-blur-md border-b border-white/10 shadow-lg`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo */}
          <Link
            to={appMode === 'movie' ? "/" : "/comics"}
            className="flex items-center gap-2 group shrink-0 whitespace-nowrap"
          >
            <span className={`text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r ${
              appMode === 'movie'
                ? 'from-violet-400 via-purple-400 to-indigo-400'
                : 'from-cyan-400 via-teal-400 to-emerald-400'
            } bg-clip-text text-transparent group-hover:opacity-90 transition-opacity`}>
              {appMode === 'movie' ? 'LowDetailMovies' : 'LowDetailComics'}
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium whitespace-nowrap">
            {appMode === 'movie' ? (
              <>
                <Link
                  to="/"
                  className={`transition-colors py-1 ${
                    location.pathname === '/' ? 'text-violet-400 font-semibold' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Trang Chủ
                </Link>
                <Link
                  to="/movies"
                  className={`transition-colors py-1 ${
                    location.pathname.startsWith('/movies') ? 'text-violet-400 font-semibold' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Phim
                </Link>
                <Link
                  to="/anime"
                  className={`transition-colors py-1 ${
                    location.pathname.startsWith('/anime') ? 'text-violet-400 font-semibold' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Anime
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/comics"
                  className={`transition-colors py-1 ${
                    location.pathname === '/comics' ? 'text-teal-400 font-semibold' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Trang Chủ
                </Link>
                <Link
                  to="/comics/latest"
                  className={`transition-colors py-1 ${
                    location.pathname === '/comics/latest' ? 'text-teal-400 font-semibold' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Mới Cập Nhật
                </Link>
              </>
            )}

            {/* Data Saver Badge */}
            <button
              onClick={toggleDataSaver}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border whitespace-nowrap ${
                dataSaverEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
              title={dataSaverEnabled ? 'Chế độ tiết kiệm Data: ĐANG BẬT' : 'Bật chế độ tiết kiệm Data'}
            >
              <FiZap size={13} className={dataSaverEnabled ? 'text-emerald-400' : 'text-gray-400'} />
              <span>Data Saver</span>
              <span className={`w-1.5 h-1.5 rounded-full ${dataSaverEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
            </button>

            {/* App Mode Switcher */}
            <button
              onClick={() => {
                toggleAppMode();
                navigate(appMode === 'movie' ? '/comics' : '/');
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border whitespace-nowrap ${
                appMode === 'movie'
                  ? 'bg-violet-500/15 border-violet-500/30 text-violet-300 hover:bg-violet-500/25'
                  : 'bg-teal-500/15 border-teal-500/30 text-teal-300 hover:bg-teal-500/25'
              }`}
              title={`Chuyển sang chế độ ${appMode === 'movie' ? 'Đọc Truyện' : 'Xem Phim'}`}
            >
              {appMode === 'movie' ? <FiFilm size={14} /> : <FiBookOpen size={14} />}
              <span>{appMode === 'movie' ? 'Xem Phim' : 'Đọc Truyện'}</span>
            </button>
          </div>

          {/* Desktop Search Bar */}
          <form onSubmit={handleSearch} className="hidden lg:flex items-center flex-1 max-w-xs mx-2">
            <div className="relative w-full" ref={desktopSearchRef}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim().length > 1 && setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowSuggestions(false);
                }}
                placeholder="Tìm kiếm phim, anime..."
                className="w-full px-3.5 py-1.5 pl-9 pr-8 bg-white/5 border border-white/10 rounded-full text-white placeholder-gray-400 text-sm focus:outline-none focus:border-violet-500/60 focus:bg-white/10 transition-all backdrop-blur-sm"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <FiX size={14} />
                </button>
              )}

              {showSuggestions && (
                <SearchSuggestions
                  loading={loading}
                  suggestions={suggestions}
                  searchQuery={searchQuery}
                  onSuggestionClick={handleSuggestionClick}
                />
              )}
            </div>
          </form>

          {/* Desktop User Menu / Auth Links */}
          <div className="hidden md:flex items-center gap-3 shrink-0 whitespace-nowrap">
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/10"
                >
                  <img
                    src={user?.avatar || getAvatarUrl(user?.username)}
                    alt={user?.username}
                    className="w-6 h-6 rounded-full object-cover"
                    onError={(e) => { e.target.src = getAvatarUrl(user?.username); }}
                  />
                  <span className="text-white text-sm font-medium max-w-[100px] truncate">
                    {user?.username || 'User'}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-dark-200/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 text-sm">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <FiUser size={16} />
                      <span>Hồ Sơ</span>
                    </Link>
                    <Link
                      to="/history"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <FiClock size={16} />
                      <span>Lịch Sử Xem</span>
                    </Link>
                    <Link
                      to="/favourites"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <FiHeart size={16} />
                      <span>Yêu Thích</span>
                    </Link>
                    <div className="border-t border-white/10 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors text-left font-medium"
                    >
                      <FiLogOut size={16} />
                      <span>Đăng Xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 whitespace-nowrap">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors whitespace-nowrap"
                >
                  Đăng Nhập
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-full transition-all shadow-md shadow-primary-600/20 whitespace-nowrap"
                >
                  Đăng Ký
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Trigger Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-300 hover:text-white p-1"
            aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
          >
            {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Drawer */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-[600px] opacity-100 py-3 border-t border-white/10' : 'max-h-0 opacity-0'
          }`}
        >
          {/* Mobile Search Input */}
          <form onSubmit={handleSearch} className="mb-3">
            <div className="relative" ref={mobileSearchRef}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim().length > 1 && setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowSuggestions(false);
                }}
                placeholder="Tìm kiếm phim, anime..."
                className="w-full px-4 py-2 pl-9 pr-9 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-violet-500"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <FiX size={16} />
                </button>
              )}

              {showSuggestions && (
                <SearchSuggestions
                  loading={loading}
                  suggestions={suggestions}
                  searchQuery={searchQuery}
                  onSuggestionClick={handleSuggestionClick}
                />
              )}
            </div>
          </form>

          {/* Mode & Data Saver controls for mobile */}
          <div className="flex items-center justify-between py-2 border-b border-white/10 mb-2 gap-2">
            <button
              onClick={toggleDataSaver}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                dataSaverEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              <FiZap size={13} />
              <span>Data Saver</span>
            </button>

            <button
              onClick={() => {
                toggleAppMode();
                navigate(appMode === 'movie' ? '/comics' : '/');
                setIsMenuOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                appMode === 'movie'
                  ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                  : 'bg-teal-500/15 border-teal-500/30 text-teal-300'
              }`}
            >
              {appMode === 'movie' ? <FiFilm size={14} /> : <FiBookOpen size={14} />}
              <span>{appMode === 'movie' ? 'Xem Phim' : 'Đọc Truyện'}</span>
            </button>
          </div>

          {/* Links */}
          <div className="space-y-1 text-sm font-medium">
            {appMode === 'movie' ? (
              <>
                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className="block py-2 px-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg"
                >
                  Trang Chủ
                </Link>
                <Link
                  to="/movies"
                  onClick={() => setIsMenuOpen(false)}
                  className="block py-2 px-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg"
                >
                  Phim
                </Link>
                <Link
                  to="/anime"
                  onClick={() => setIsMenuOpen(false)}
                  className="block py-2 px-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg"
                >
                  Anime
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/comics"
                  onClick={() => setIsMenuOpen(false)}
                  className="block py-2 px-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg"
                >
                  Trang Chủ Truyện
                </Link>
                <Link
                  to="/comics/latest"
                  onClick={() => setIsMenuOpen(false)}
                  className="block py-2 px-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg"
                >
                  Mới Cập Nhật
                </Link>
              </>
            )}

            {/* User Auth Section */}
            <div className="pt-2 border-t border-white/10 mt-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 py-2 px-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg"
                  >
                    <FiUser size={16} />
                    <span>Hồ Sơ ({user?.username})</span>
                  </Link>
                  <Link
                    to="/history"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 py-2 px-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg"
                  >
                    <FiClock size={16} />
                    <span>Lịch Sử Xem</span>
                  </Link>
                  <Link
                    to="/favourites"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 py-2 px-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg"
                  >
                    <FiHeart size={16} />
                    <span>Yêu Thích</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 py-2 px-2 text-red-400 hover:text-red-300 hover:bg-white/5 rounded-lg w-full text-left font-medium"
                  >
                    <FiLogOut size={16} />
                    <span>Đăng Xuất</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3 pt-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex-1 py-2 text-center text-gray-300 hover:text-white bg-white/5 rounded-lg"
                  >
                    Đăng Nhập
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex-1 py-2 text-center text-white bg-primary-600 hover:bg-primary-500 rounded-lg font-medium"
                  >
                    Đăng Ký
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
