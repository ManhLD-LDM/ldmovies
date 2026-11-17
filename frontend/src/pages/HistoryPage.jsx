import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiBook, FiClock, FiFilm, FiPlay, FiTrash2 } from 'react-icons/fi';
import useAppStore from '../stores/appStore';
import useAuthStore from '../stores/authStore';
import useComicHistoryStore from '../stores/comicHistoryStore';
import useWatchHistoryStore from '../stores/watchHistoryStore';
import useDocumentTitle from '../utils/useDocumentTitle';

// Poster fallback SVG - không cần network request
const FALLBACK_POSTER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect fill='%231E1E28' width='200' height='300'/%3E%3Ctext x='100' y='160' font-family='Arial' font-size='48' fill='%234B4B6A' text-anchor='middle'%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E`;

function HistoryPage() {
  useDocumentTitle('Lịch Sử Xem & Đọc Truyện');

  const navigate = useNavigate();
  const { appMode } = useAppStore();
  const { isAuthenticated } = useAuthStore();
  const {
    watchHistory,
    fetchHistoryFromBackend,
    removeFromHistory,
  } = useWatchHistoryStore();
  const {
    comicHistory,
    fetchComicHistory,
    removeComicHistoryItem,
    isLoading: isComicLoading,
  } = useComicHistoryStore();

  const [activeTab, setActiveTab] = useState(appMode === 'comic' ? 'comics' : 'movies');
  const [isMovieLoading, setIsMovieLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để xem lịch sử');
      navigate('/login');
      return;
    }

    const loadAllHistory = async () => {
      setIsMovieLoading(true);
      await Promise.all([
        fetchHistoryFromBackend(),
        fetchComicHistory(),
      ]);
      setIsMovieLoading(false);
    };

    loadAllHistory();
  }, [isAuthenticated, navigate, fetchHistoryFromBackend, fetchComicHistory]);

  const sortedWatchHistory = useMemo(
    () =>
      [...watchHistory].sort(
        (a, b) => new Date(b.watchedAt || 0) - new Date(a.watchedAt || 0)
      ),
    [watchHistory]
  );

  const handleRemoveWatchHistory = async (slug, episodeName) => {
    await removeFromHistory(slug, episodeName);
    toast.success('Đã xóa khỏi lịch sử');
  };

  const handleRemoveComicHistory = async (slug) => {
    const result = await removeComicHistoryItem(slug);
    if (result.success) {
      toast.success('Đã xóa khỏi lịch sử');
    } else {
      toast.error(result.message);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getProgressPercent = (item) => {
    if (item.duration > 0) {
      return Math.min(100, Math.max(0, Math.round((item.progress / item.duration) * 100)));
    }
    return 0;
  };

  if (!isAuthenticated) return null;

  const isLoading = activeTab === 'movies' ? isMovieLoading : isComicLoading;

  return (
    <div className="container mx-auto px-4 py-8 pt-24 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <FiClock className="text-primary-500 text-3xl" />
        <h1 className="text-3xl md:text-4xl font-bold text-white">Lịch sử</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('movies')}
          className={`flex items-center gap-2 px-5 py-3 font-medium transition-all rounded-t-lg ${
            activeTab === 'movies'
              ? 'text-primary-400 border-b-2 border-primary-500 bg-primary-500/5'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FiFilm size={16} />
          <span>Phim &amp; Anime</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'movies'
                ? 'bg-primary-500/20 text-primary-400'
                : 'bg-white/5 text-gray-500'
            }`}
          >
            {sortedWatchHistory.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('comics')}
          className={`flex items-center gap-2 px-5 py-3 font-medium transition-all rounded-t-lg ${
            activeTab === 'comics'
              ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FiBook size={16} />
          <span>Truyện Tranh</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'comics'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-white/5 text-gray-500'
            }`}
          >
            {comicHistory.length}
          </span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
      ) : (
        <div>
          {activeTab === 'movies' && (
            <div>
              {sortedWatchHistory.length === 0 ? (
                <div className="text-center py-20 bg-dark-200 rounded-2xl border border-white/5">
                  <p className="text-gray-400 text-lg mb-4">Bạn chưa xem phim hoặc anime nào.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/movies')}
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors shadow-lg font-medium"
                  >
                    Khám phá Phim &amp; Anime
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {sortedWatchHistory.map((item) => {
                    const baseRoute = (item.type === 'anime' || item.type === 'hoathinh') ? '/anime' : '/movies';
                    const detailUrl = `${baseRoute}/${item.slug}`;
                    const resumeUrl = `${detailUrl}?ep=${encodeURIComponent(item.episodeName || '')}`;
                    const progressPercent = getProgressPercent(item);

                    return (
                      <div
                        key={`${item.slug}-${item.episodeName}`}
                        className="bg-dark-200 rounded-xl overflow-hidden border border-white/5 hover:border-primary-500/30 transition-all group flex flex-col h-full shadow-lg"
                      >
                        <div className="flex gap-4 p-4">
                          <img
                            src={item.poster || FALLBACK_POSTER}
                            alt={item.name}
                            className="w-24 h-32 object-cover rounded-lg shadow-md cursor-pointer group-hover:scale-105 transition-transform shrink-0"
                            onClick={() => navigate(detailUrl)}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = FALLBACK_POSTER;
                            }}
                          />
                          <div className="flex-1 min-w-0 flex flex-col py-1">
                            <h3
                              className="text-white font-bold text-lg line-clamp-2 cursor-pointer hover:text-primary-400 transition-colors mb-2"
                              onClick={() => navigate(detailUrl)}
                            >
                              {item.name}
                            </h3>
                            <p className="text-sm text-gray-400 mb-2 truncate">
                              Đang xem:{' '}
                              <span className="text-primary-400 font-medium">
                                {item.episodeName}
                              </span>
                            </p>

                            {/* Progress Bar */}
                            <div className="mb-2">
                              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                <span>Tiến độ</span>
                                <span className="text-primary-300 font-medium">{progressPercent}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-dark-400 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary-500 transition-all duration-300"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>

                            <p className="text-xs text-gray-500 mt-auto">
                              {formatDate(item.watchedAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex border-t border-white/5 mt-auto bg-dark-300/50">
                          <button
                            type="button"
                            onClick={() => navigate(resumeUrl)}
                            className="flex-1 py-3 text-primary-400 font-medium hover:bg-primary-500/10 transition-colors flex justify-center items-center gap-2"
                          >
                            <FiPlay /> Xem tiếp
                          </button>
                          <div className="w-px bg-white/5"></div>
                          <button
                            type="button"
                            onClick={() => handleRemoveWatchHistory(item.slug, item.episodeName)}
                            className="px-6 py-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Xóa khỏi lịch sử"
                            aria-label={`Xóa ${item.name} khỏi lịch sử`}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'comics' && (
            <div>
              {comicHistory.length === 0 ? (
                <div className="text-center py-20 bg-dark-200 rounded-2xl border border-white/5">
                  <p className="text-gray-400 text-lg mb-4">Bạn chưa đọc truyện nào.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/comics')}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-500 hover:to-blue-400 transition-colors shadow-lg"
                  >
                    Đọc truyện ngay
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {comicHistory.map((item) => (
                    <div
                      key={item.slug}
                      className="bg-dark-200 rounded-xl overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all group flex flex-col h-full shadow-lg"
                    >
                      <div className="flex gap-4 p-4">
                        <img
                          src={item.poster || FALLBACK_POSTER}
                          alt={item.name}
                          className="w-24 h-32 object-cover rounded-lg shadow-md cursor-pointer group-hover:scale-105 transition-transform shrink-0"
                          onClick={() => navigate(`/comics/${item.slug}`)}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = FALLBACK_POSTER;
                          }}
                        />
                        <div className="flex-1 min-w-0 flex flex-col py-1">
                          <h3
                            className="text-white font-bold text-lg line-clamp-2 cursor-pointer hover:text-blue-400 transition-colors mb-2"
                            onClick={() => navigate(`/comics/${item.slug}`)}
                          >
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-400 mb-1">
                            Đang đọc:{' '}
                            <span className="text-blue-400 font-medium">
                              Chương {item.chapterName}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 mt-auto">
                            {formatDate(item.watchedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex border-t border-white/5 mt-auto bg-dark-300/50">
                        <button
                          type="button"
                          onClick={() => navigate(`/comics/${item.slug}/chapter/${item.chapterId}`)}
                          className="flex-1 py-3 text-blue-400 font-medium hover:bg-blue-500/10 transition-colors flex justify-center items-center gap-2"
                        >
                          <FiPlay /> Đọc tiếp
                        </button>
                        <div className="w-px bg-white/5"></div>
                        <button
                          type="button"
                          onClick={() => handleRemoveComicHistory(item.slug)}
                          className="px-6 py-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Xóa khỏi lịch sử"
                          aria-label={`Xóa ${item.name} khỏi lịch sử`}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
