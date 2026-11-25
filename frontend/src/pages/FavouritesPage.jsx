import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiHeart, FiFilm, FiTv, FiBook, FiX } from 'react-icons/fi';
import useAppStore from '../stores/appStore';
import useAuthStore from '../stores/authStore';
import useFavoritesStore from '../stores/favoritesStore';
import useDocumentTitle from '../utils/useDocumentTitle';

// Poster fallback SVG - không cần network request
const FALLBACK_POSTER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect fill='%231E1E28' width='200' height='300'/%3E%3Ctext x='100' y='160' font-family='Arial' font-size='48' fill='%234B4B6A' text-anchor='middle'%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E`;
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const resolvePosterUrl = (url) => {
  if (!url) return FALLBACK_POSTER;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  if (url.startsWith('/api/')) return `${API_BASE}${url.slice(4)}`;
  return url;
};

// Config-driven: toàn bộ logic từng tab định nghĩa ở đây, không lặp code
const TABS_CONFIG = [
  {
    key: 'movies',
    label: 'Phim',
    icon: FiFilm,
    itemsKey: 'favoriteMovies',
    idKey: 'movieId',
    navigatePath: (item) => `/movies/${item.movieId}`,
    removeKey: 'removeFavoriteMovie',
    emptyText: 'Chưa có phim yêu thích nào',
    emptySubText: 'Thêm phim bạn yêu thích để xem lại sau',
    explorePath: '/movies',
    exploreLabel: 'Khám phá Phim',
  },
  {
    key: 'anime',
    label: 'Anime',
    icon: FiTv,
    itemsKey: 'favoriteAnime',
    idKey: 'animeId',
    navigatePath: (item) => `/anime/${item.animeId}`,
    removeKey: 'removeFavoriteAnime',
    emptyText: 'Chưa có anime yêu thích nào',
    emptySubText: 'Thêm anime bạn yêu thích để xem lại sau',
    explorePath: '/anime',
    exploreLabel: 'Khám phá Anime',
  },
  {
    key: 'comics',
    label: 'Truyện Tranh',
    icon: FiBook,
    itemsKey: 'favoriteComics',
    idKey: 'comicId',
    navigatePath: (item) => `/comics/${item.comicId}`,
    removeKey: 'removeFavoriteComic',
    emptyText: 'Chưa có truyện tranh yêu thích nào',
    emptySubText: 'Thêm truyện bạn yêu thích để đọc lại sau',
    explorePath: '/comics',
    exploreLabel: 'Khám phá Truyện',
  },
];

// Empty State đẹp và hấp dẫn theo chế độ
function EmptyState({ text, subText, explorePath, exploreLabel, isComicMode }) {
  return (
    <div className="flex flex-col items-center py-20 gap-4 animate-fade-in bg-dark-200/40 rounded-2xl border border-white/5">
      <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-2">
        <FiHeart size={40} className={isComicMode ? 'text-teal-500/60' : 'text-gray-600'} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-white">{text}</h3>
      <p className="text-gray-400 text-center max-w-sm leading-relaxed">{subText}</p>
      <Link
        to={explorePath}
        className={`mt-2 px-8 py-3 text-white rounded-lg transition-colors font-medium ${
          isComicMode ? 'bg-teal-600 hover:bg-teal-500' : 'bg-primary-600 hover:bg-primary-700'
        }`}
      >
        {exploreLabel}
      </Link>
    </div>
  );
}

// Skeleton loading grid phù hợp với layout thực
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-dark-200 rounded-xl overflow-hidden border border-white/5">
          <div className="aspect-[2/3] skeleton" />
          <div className="p-3 space-y-2">
            <div className="h-4 skeleton rounded w-3/4" />
            <div className="h-3 skeleton rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Grid card thống nhất cho cả Phim, Anime và Truyện Tranh
function FavoriteGrid({ items, tab, onRemove, navigate, isComicMode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
      {items.map((item) => {
        const itemId = item[tab.idKey];
        const posterSrc = resolvePosterUrl(item.poster);
        return (
          <div
            key={itemId}
            className={`relative group bg-dark-200 rounded-xl overflow-hidden border border-white/5 transition-all shadow-lg flex flex-col ${
              isComicMode ? 'hover:border-teal-500/40' : 'hover:border-primary-500/40'
            }`}
          >
            <div
              onClick={() => navigate(tab.navigatePath(item))}
              className="cursor-pointer flex-1 flex flex-col"
            >
              <div className="relative aspect-[2/3] overflow-hidden bg-dark-300">
                <img
                  src={posterSrc}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_POSTER;
                  }}
                />
              </div>
              <div className="p-3">
                <h3
                  className={`text-white text-sm font-medium line-clamp-2 transition-colors ${
                    isComicMode ? 'group-hover:text-teal-400' : 'group-hover:text-primary-400'
                  }`}
                >
                  {item.title}
                </h3>
              </div>
            </div>
            {/* Nút xóa với aria-label đầy đủ cho accessibility */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(itemId);
              }}
              aria-label={`Xóa "${item.title}" khỏi yêu thích`}
              className="absolute top-2 right-2 bg-black/75 backdrop-blur-sm text-white p-1.5 rounded-full before:absolute before:-inset-2 before:content-[''] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-600 border border-white/20"
            >
              <FiX size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function FavouritesPage() {
  const navigate = useNavigate();
  const { appMode } = useAppStore();
  const isComicMode = appMode === 'comic';

  useDocumentTitle(isComicMode ? 'Truyện Yêu Thích' : 'Phim & Anime Yêu Thích');

  const { isAuthenticated } = useAuthStore();
  const {
    favoriteMovies,
    favoriteAnime,
    favoriteComics,
    fetchFavoriteMovies,
    fetchFavoriteAnime,
    fetchFavoriteComics,
    removeFavoriteMovie,
    removeFavoriteAnime,
    removeFavoriteComic,
    loadingMovies,
    loadingAnime,
    loadingComics,
  } = useFavoritesStore();

  const [currentTab, setCurrentTab] = useState(isComicMode ? 'comics' : 'movies');

  // Đồng bộ tab khi chuyển chế độ Phim <-> Truyện
  useEffect(() => {
    if (isComicMode) {
      setCurrentTab('comics');
    } else if (currentTab === 'comics') {
      setCurrentTab('movies');
    }
  }, [isComicMode, currentTab]);

  // Mapping key → handler
  const removeHandlers = {
    removeFavoriteMovie,
    removeFavoriteAnime,
    removeFavoriteComic,
  };

  // Mapping itemsKey → dữ liệu thực
  const itemsData = {
    favoriteMovies,
    favoriteAnime,
    favoriteComics,
  };

  const tabLoadingMap = {
    movies: loadingMovies,
    anime: loadingAnime,
    comics: loadingComics,
  };

  useEffect(() => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để xem danh sách yêu thích');
      navigate('/login');
      return;
    }
    if (isComicMode) {
      fetchFavoriteComics(true);
    } else {
      fetchFavoriteMovies(true);
      fetchFavoriteAnime(true);
    }
  }, [isAuthenticated, isComicMode, navigate, fetchFavoriteMovies, fetchFavoriteAnime, fetchFavoriteComics]);

  const handleRemove = async (tab, id) => {
    const handler = removeHandlers[tab.removeKey];
    if (!handler) return;
    const result = await handler(id);
    if (result.success) {
      toast.success('Đã xóa khỏi danh sách yêu thích');
    } else {
      toast.error(result.message);
    }
  };

  if (!isAuthenticated) return null;

  const visibleTabs = isComicMode
    ? TABS_CONFIG.filter((t) => t.key === 'comics')
    : TABS_CONFIG.filter((t) => t.key !== 'comics');

  const effectiveTabKey = isComicMode ? 'comics' : currentTab === 'comics' ? 'movies' : currentTab;
  const activeTabConfig = visibleTabs.find((t) => t.key === effectiveTabKey) || visibleTabs[0];
  const activeItems = itemsData[activeTabConfig.itemsKey] || [];
  const isTabLoading = tabLoadingMap[activeTabConfig.key];

  return (
    <div className="container mx-auto px-4 py-8 pt-6 min-h-screen">
      {/* Tiêu đề trang theo chế độ */}
      <div className="flex items-center gap-3 mb-8">
        <FiHeart className={isComicMode ? 'text-teal-400' : 'text-primary-500'} size={32} />
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          {isComicMode ? 'Truyện Tranh Yêu Thích' : 'Danh Sách Yêu Thích'}
        </h1>
        {isComicMode && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 font-semibold">
            {activeItems.length}
          </span>
        )}
      </div>

      {/* Tabs điều hướng (chỉ hiện khi ở chế độ Phim/Anime với >= 2 tab) */}
      {!isComicMode && (
        <div className="flex gap-1 mb-8 border-b border-white/10 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const count = (itemsData[tab.itemsKey] || []).length;
            const isActive = activeTabConfig.key === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCurrentTab(tab.key)}
                className={`shrink-0 flex items-center gap-2 px-5 py-3 font-medium transition-all rounded-t-lg ${
                  isActive
                    ? 'text-primary-400 border-b-2 border-primary-500 bg-primary-500/5'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Nội dung tab */}
      {isTabLoading ? (
        <SkeletonGrid />
      ) : activeItems.length === 0 ? (
        <EmptyState
          text={activeTabConfig.emptyText}
          subText={activeTabConfig.emptySubText}
          explorePath={activeTabConfig.explorePath}
          exploreLabel={activeTabConfig.exploreLabel}
          isComicMode={isComicMode}
        />
      ) : (
        <FavoriteGrid
          items={activeItems}
          tab={activeTabConfig}
          onRemove={(id) => handleRemove(activeTabConfig, id)}
          navigate={navigate}
          isComicMode={isComicMode}
        />
      )}
    </div>
  );
}

export default FavouritesPage;
