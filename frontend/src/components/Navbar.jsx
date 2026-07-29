import { useEffect, useRef, useState, useCallback } from 'react';
import { FiHeart, FiLogOut, FiMenu, FiSearch, FiUser, FiX, FiBookOpen, FiFilm, FiClock } from 'react-icons/fi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { kkphimApi } from '../services/kkphimApi';
import { comicApi } from '../services/comicApi';
import useAuthStore from '../stores/authStore';
import useAppStore from '../stores/appStore';

// Tạo fallback avatar từ tên người dùng (không cần network request)
function getAvatarUrl(username) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'U')}&background=7C3AED&color=fff&size=64&bold=true`;
}

const UsernameMarquee = ({ username }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    let timer;
    const checkOverflow = () => {
      // Debounce resize để tránh re-render liên tục
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (containerRef.current && textRef.current) {
          setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
        }
      }, 100);
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => {
      window.removeEventListener('resize', checkOverflow);
      clearTimeout(timer);
    };
  }, [username]);

  return (
    <div ref={containerRef} className="w-20 md:w-24 overflow-hidden relative flex items-center">
      <span
        ref={textRef}
        className={`text-white text-sm font-medium whitespace-nowrap ${
          isOverflowing ? 'animate-marquee-user' : 'truncate block w-full text-left'
        }`}
      >
        {username}
      </span>
    </div>
  );
};

// Component gợi ý tìm kiếm dùng chung cho desktop và mobile
const SearchSuggestions = ({ loading, suggestions, searchQuery, onSuggestionClick }) => {
  if (!showDropdown(loading, suggestions, searchQuery)) return null;

  return (
    <div className="absolute top-full mt-2 w-full bg-dark-200 border border-dark-400 rounded-lg shadow-xl overflow-hidden z-50">
      {loading ? (
        <div className="px-4 py-3 text-gray-400 text-sm">Đang tìm kiếm...</div>
      ) : suggestions.length > 0 ? (
        <div className="max-h-96 overflow-y-auto">
          {suggestions.map((item) => (
            <button
              key={item.id}
              onClick={(e) => onSuggestionClick(item, e)}
              type="button"
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-all duration-200 text-left group"
            >
              <img
                src={item.poster || item.thumb_url}
                alt={item.name}
                className="w-12 h-16 object-cover rounded"
                onError={(e) => e.target.style.display = 'none'}
              />
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">{item.name}</div>
                <div className="text-gray-400 text-sm truncate">{item.origin_name}</div>
                <div className="text-gray-500 text-xs flex items-center gap-2 mt-1">
                  {item.year && <span>{item.year}</span>}
                  {item.quality && (
                    <span className="px-2 py-0.5 bg-primary-600/20 text-primary-400 rounded">
                      {item.quality}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : searchQuery.trim().length > 1 ? (
        <div className="px-4 py-3 text-gray-400 text-sm">Không tìm thấy kết quả</div>
      ) : null}
    </div>
  );
};

// Hàm kiểm tra có cần hiển thị dropdown không
function showDropdown(loading, suggestions, searchQuery) {
  return loading || suggestions.length > 0 || searchQuery.trim().length > 1;
}

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

  // Đóng mobile menu và suggestions khi đổi route
  useEffect(() => {
    setIsMenuOpen(false);
    setShowSuggestions(false);
  }, [location.pathname]);

  // Đóng suggestions khi click bên ngoài
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

  // Fetch gợi ý tìm kiếm với debounce
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
            // Map kết quả của comic sang chuẩn chung của SearchSuggestions
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
  }, [searchQuery]);

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
    <nav className={`${positionClass} glass-effect border-b border-white/10 shadow-lg`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to={appMode === 'movie' ? "/" : "/comics"} className="flex items-center space-x-2 group">
            <span className={`text-3xl font-black bg-gradient-to-r ${appMode === 'movie' ? 'from-violet-400 via-purple-500 to-violet-600' : 'from-blue-400 via-teal-400 to-emerald-400'} bg-clip-text text-transparent transform group-hover:scale-110 transition-transform duration-300`}>
              {appMode === 'movie' ? 'LowDetailMovies' : 'LowDetailComics'}
            </span>
          </Link>

          {/* Điều hướng Desktop */}
          <div className="hidden md:flex items-center space-x-8">
            {appMode === 'movie' ? (
              <>
                <Link to="/" className="text-gray-300 hover:text-white transition-all duration-300 relative group py-2">
                  <span>Trang Chủ</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link to="/movies" className="text-gray-300 hover:text-white transition-all duration-300 relative group py-2">
                  <span>Phim</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link to="/anime" className="text-gray-300 hover:text-white transition-all duration-300 relative group py-2">
                  <span>Anime</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/comics" className="text-gray-300 hover:text-white transition-all duration-300 relative group py-2">
                  <span>Trang Chủ</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-teal-500 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link to="/comics/latest" className="text-gray-300 hover:text-white transition-all duration-300 relative group py-2">
                  <span>Mới Cập Nhật</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-teal-500 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </>
            )}

            {/* Nút chuyển chế độ */}
            <button
              onClick={() => {
                toggleAppMode();
                navigate(appMode === 'movie' ? '/comics' : '/');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 border ${
                appMode === 'movie'
                  ? 'bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
              }`}
              title={`Chuyển sang chế độ ${appMode === 'movie' ? 'Đọc Truyện' : 'Xem Phim'}`}
            >
              {appMode === 'movie' ? <FiFilm size={16} /> : <FiBookOpen size={16} />}
              <span className="text-sm font-medium">{appMode === 'movie' ? 'Xem Phim' : 'Đọc Truyện'}</span>
            </button>
          </div>

          {/* Thanh Tìm Kiếm Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center">
            <div className="relative" ref={desktopSearchRef}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim().length > 1 && setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
                placeholder="Tìm kiếm phim, anime..."
                className="w-64 px-4 py-2.5 pl-10 pr-10 bg-white/5 border border-white/10 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all duration-300 backdrop-blur-sm"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <FiX />
                </button>
              )}

              {/* Dropdown Gợi Ý Desktop */}
              {showSuggestions && (
                <div className="absolute top-full mt-2 w-full bg-dark-200 border border-dark-400 rounded-lg shadow-xl overflow-hidden z-50">
                  {loading ? (
                    <div className="px-4 py-3 text-gray-400 text-sm">Đang tìm kiếm...</div>
                  ) : suggestions.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto">
                      {suggestions.map((item) => (
                        <button
                          key={item.id}
                          onClick={(e) => handleSuggestionClick(item, e)}
                          type="button"
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-all duration-200 text-left group"
                        >
                          <img
                            src={item.poster || item.thumb_url}
                            alt={item.name}
                            className="w-12 h-16 object-cover rounded"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">{item.name}</div>
                            <div className="text-gray-400 text-sm truncate">{item.origin_name}</div>
                            <div className="text-gray-500 text-xs flex items-center gap-2 mt-1">
                              {item.year && <span>{item.year}</span>}
                              {item.quality && (
                                <span className="px-2 py-0.5 bg-primary-600/20 text-primary-400 rounded">
                                  {item.quality}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.trim().length > 1 ? (
                    <div className="px-4 py-3 text-gray-400 text-sm">Không tìm thấy kết quả</div>
                  ) : null}
                </div>
              )}
            </div>
          </form>

          {/* Menu Người Dùng - Desktop */}
          <div className="hidden md:flex items-center">
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10"
                >
                  <img
                    src={user?.avatar || getAvatarUrl(user?.username)}
                    alt={user?.username}
                    className="w-7 h-7 rounded-full object-cover"
                    onError={(e) => { e.target.src = getAvatarUrl(user?.username); }}
                  />
                  <UsernameMarquee username={user?.username || 'Người dùng'} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-44 bg-dark-200 border border-dark-400 rounded-lg shadow-xl overflow-hidden z-50">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 transition-all"
                    >
                      <FiUser />
                      Hồ Sơ
                    </Link>
                    <Link
                      to="/history"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 transition-all"
                    >
                      <FiClock />
                      Lịch Sử Xem
                    </Link>
                    <Link
                      to="/favourites"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 transition-all"
                    >
                      <FiHeart />
                      Yêu Thích
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 transition-all text-left"
                    >
                      <FiLogOut />
                      Đăng Xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-white hover:text-violet-400 transition-all duration-300 font-medium"
                >
                  Đăng Nhập
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-violet-500/50 transition-all duration-300 transform hover:scale-105"
                >
                  Đăng Ký
                </Link>
              </div>
            )}
          </div>

          {/* Nút Mở Menu Mobile */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-300 hover:text-white"
            aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
          >
            {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Menu Mobile - với animation transition */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="py-4 border-t border-dark-300">
            {/* Thanh tìm kiếm mobile */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative" ref={mobileSearchRef}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length > 1 && setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowSuggestions(false);
                    }
                  }}
                  placeholder="Tìm kiếm phim, anime..."
                  className="w-full px-4 py-2 pl-10 pr-10 bg-dark-300 border border-dark-400 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
                />
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setShowSuggestions(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    <FiX />
                  </button>
                )}

                {/* Dropdown Gợi Ý Mobile */}
                {showSuggestions && (
                  <div className="absolute top-full mt-2 w-full bg-dark-200 border border-dark-400 rounded-lg shadow-xl overflow-hidden z-50">
                    {loading ? (
                      <div className="px-4 py-3 text-gray-400 text-sm">Đang tìm kiếm...</div>
                    ) : suggestions.length > 0 ? (
                      <div className="max-h-96 overflow-y-auto">
                        {suggestions.map((item) => (
                          <button
                            key={item.id}
                            onClick={(e) => handleSuggestionClick(item, e)}
                            type="button"
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-dark-300 transition-colors text-left"
                          >
                            <img
                              src={item.poster || item.thumb_url}
                              alt={item.name}
                              className="w-12 h-16 object-cover rounded"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-medium truncate">{item.name}</div>
                              <div className="text-gray-400 text-sm truncate">{item.origin_name}</div>
                              <div className="text-gray-500 text-xs flex items-center gap-2 mt-1">
                                {item.year && <span>{item.year}</span>}
                                {item.quality && (
                                  <span className="px-2 py-0.5 bg-primary-600/20 text-primary-400 rounded">
                                    {item.quality}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : searchQuery.trim().length > 1 ? (
                      <div className="px-4 py-3 text-gray-400 text-sm">Không tìm thấy kết quả</div>
                    ) : null}
                  </div>
                )}
              </div>
            </form>

            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 mb-2 border-b border-dark-400 pb-4">
                <span className="text-gray-300 text-sm">Chế độ xem</span>
                <button
                  onClick={() => {
                    toggleAppMode();
                    navigate(appMode === 'movie' ? '/comics' : '/');
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 border ${
                    appMode === 'movie'
                      ? 'bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20'
                      : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                  }`}
                >
                  {appMode === 'movie' ? <FiFilm size={16} /> : <FiBookOpen size={16} />}
                  <span className="text-sm font-medium">{appMode === 'movie' ? 'Xem Phim' : 'Đọc Truyện'}</span>
                </button>
              </div>

              {appMode === 'movie' ? (
                <>
                  <Link
                    to="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-2 text-gray-300 hover:text-white"
                  >
                    Trang Chủ
                  </Link>
                  <Link
                    to="/movies"
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-2 text-gray-300 hover:text-white"
                  >
                    Phim
                  </Link>
                  <Link
                    to="/anime"
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-2 text-gray-300 hover:text-white"
                  >
                    Anime
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/comics"
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-2 text-gray-300 hover:text-white"
                  >
                    Trang Chủ Truyện
                  </Link>
                  <Link
                    to="/comics/latest"
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-2 text-gray-300 hover:text-white"
                  >
                    Mới Cập Nhật
                  </Link>
                </>
              )}

              {/* Menu Người Dùng Mobile */}
              <div className="pt-4 border-t border-dark-300">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-gray-300 hover:text-white"
                    >
                      <FiUser />
                      Hồ Sơ
                    </Link>
                    <Link
                      to="/history"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-gray-300 hover:text-white"
                    >
                      <FiClock />
                      Lịch Sử Xem
                    </Link>
                    <Link
                      to="/favourites"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-gray-300 hover:text-white"
                    >
                      <FiHeart />
                      Yêu Thích
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-2 py-2 text-gray-300 hover:text-white w-full text-left"
                    >
                      <FiLogOut />
                      Đăng Xuất
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-2 text-gray-300 hover:text-white"
                    >
                      Đăng Nhập
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-2 text-gray-300 hover:text-white"
                    >
                      Đăng Ký
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
