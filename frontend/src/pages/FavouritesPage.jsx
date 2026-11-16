import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiHeart, FiFilm, FiTv, FiBook, FiX } from 'react-icons/fi';
import useAuthStore from '../stores/authStore';
import useFavoritesStore from '../stores/favoritesStore';

// Poster fallback SVG - không cần network request
const FALLBACK_POSTER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect fill='%231E1E28' width='200' height='300'/%3E%3Ctext x='100' y='160' font-family='Arial' font-size='48' fill='%234B4B6A' text-anchor='middle'%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E`;

// Config-driven: toàn bộ logic 3 tab định nghĩa ở đây, không lặp code
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

// Empty State đẹp và hấp dẫn
function EmptyState({ text, subText, explorePath, exploreLabel }) {
  return (
    <div className="flex flex-col items-center py-20 gap-4 animate-fade-in">
      <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-2">
        <FiHeart size={40} className="text-gray-600" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-white">{text}</h3>
      <p className="text-gray-400 text-center max-w-sm leading-relaxed">{subText}</p>
      <Link
        to={explorePath}
        className="mt-2 px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
      >
        {exploreLabel}
      </Link>
    </div>
  );
}

// Skeleton loading grid phù hợp với layout thực
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-[2/3] rounded-lg skeleton" />
          <div className="h-4 skeleton rounded w-3/4" />
          <div className="h-3 skeleton rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

// Grid card dùng chung cho tất cả tabs
function FavoriteGrid({ items, tab, onRemove, navigate }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {items.map((item) => {
        const itemId = item[tab.idKey];
        return (
          <div key={itemId} className="relative group">
            <div
              onClick={() => navigate(tab.navigatePath(item))}
              className="cursor-pointer"
            >
              <img
                src={item.poster || FALLBACK_POSTER}
                alt={item.title}
                className="w-full rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 object-cover aspect-[2/3]"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = FALLBACK_POSTER;
                }}
              />
              <h3 className="text-white mt-2 text-sm font-medium line-clamp-2">
                {item.title}
              </h3>
            </div>
            {/* Nút xóa với aria-label đầy đủ cho accessibility */}
            <button
              onClick={() => onRemove(itemId)}
              aria-label={`Xóa "${item.title}" khỏi yêu thích`}
              className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white p-1.5 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-600 border border-white/20"
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
    isLoading,
  } = useFavoritesStore();

  const [currentTab, setCurrentTab] = useState('movies');

  // Mapping key → handler để tránh code dài
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

  useEffect(() => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để xem danh sách yêu thích');
      navigate('/login');
      return;
    }
    fetchFavoriteMovies();
    fetchFavoriteAnime();
    fetchFavoriteComics();
  }, [isAuthenticated, navigate]);

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

  const activeTabConfig = TABS_CONFIG.find((t) => t.key === currentTab);
  const activeItems = itemsData[activeTabConfig.itemsKey] || [];

  return (
    <div className="container mx-auto px-4 py-8 pt-24 min-h-screen">
      {/* Tiêu đề trang */}
      <div className="flex items-center gap-3 mb-8">
        <FiHeart className="text-primary-500" size={32} />
        <h1 className="text-3xl md:text-4xl font-bold text-white">Danh Sách Yêu Thích</h1>
      </div>

      {/* Tabs điều hướng */}
      <div className="flex gap-1 mb-8 border-b border-white/10">
        {TABS_CONFIG.map((tab) => {
          const Icon = tab.icon;
          const count = (itemsData[tab.itemsKey] || []).length;
          return (
            <button
              key={tab.key}
              onClick={() => setCurrentTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 font-medium transition-all rounded-t-lg ${
                currentTab === tab.key
                  ? 'text-primary-400 border-b-2 border-primary-500 bg-primary-500/5'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  currentTab === tab.key
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'bg-white/5 text-gray-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Nội dung tab */}
      {isLoading ? (
        <SkeletonGrid />
      ) : activeItems.length === 0 ? (
        <EmptyState
          text={activeTabConfig.emptyText}
          subText={activeTabConfig.emptySubText}
          explorePath={activeTabConfig.explorePath}
          exploreLabel={activeTabConfig.exploreLabel}
        />
      ) : (
        <FavoriteGrid
          items={activeItems}
          tab={activeTabConfig}
          onRemove={(id) => handleRemove(activeTabConfig, id)}
          navigate={navigate}
        />
      )}
    </div>
  );
}

export default FavouritesPage;
