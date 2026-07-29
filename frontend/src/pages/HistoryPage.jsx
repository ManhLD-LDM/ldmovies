import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiClock, FiTrash2, FiPlay } from 'react-icons/fi';
import useAuthStore from '../stores/authStore';
import useComicHistoryStore from '../stores/comicHistoryStore';

// Poster fallback SVG - không cần network request
const FALLBACK_POSTER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect fill='%231E1E28' width='200' height='300'/%3E%3Ctext x='100' y='160' font-family='Arial' font-size='48' fill='%234B4B6A' text-anchor='middle'%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E`;

function HistoryPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const {
    comicHistory,
    fetchComicHistory,
    removeComicHistoryItem,
    isLoading,
  } = useComicHistoryStore();

  const [activeTab, setActiveTab] = useState('comics');

  useEffect(() => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để xem lịch sử');
      navigate('/login');
      return;
    }
    fetchComicHistory();
  }, [isAuthenticated, navigate]);

  const handleRemoveComicHistory = async (slug) => {
    const result = await removeComicHistoryItem(slug);
    if (result.success) {
      toast.success('Đã xóa khỏi lịch sử');
    } else {
      toast.error(result.message);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto px-4 py-8 pt-24 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <FiClock className="text-blue-500 text-3xl" />
        <h1 className="text-3xl md:text-4xl font-bold text-white">Lịch sử</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-white/10">
        <button
          onClick={() => setActiveTab('comics')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'comics'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Truyện Tranh ({comicHistory.length})
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div>
          {activeTab === 'comics' && (
            <div>
              {comicHistory.length === 0 ? (
                <div className="text-center py-20 bg-dark-200 rounded-2xl border border-white/5">
                  <p className="text-gray-400 text-lg mb-4">Bạn chưa đọc truyện nào.</p>
                  <button
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
                          className="w-24 h-32 object-cover rounded-lg shadow-md cursor-pointer group-hover:scale-105 transition-transform"
                          onClick={() => navigate(`/comics/${item.slug}`)}
                        />
                        <div className="flex-1 flex flex-col py-1">
                          <h3 
                            className="text-white font-bold text-lg line-clamp-2 cursor-pointer hover:text-blue-400 transition-colors mb-2"
                            onClick={() => navigate(`/comics/${item.slug}`)}
                          >
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-400 mb-1">
                            Đang đọc: <span className="text-blue-400 font-medium">Chương {item.chapterName}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-auto">
                            {formatDate(item.watchedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex border-t border-white/5 mt-auto bg-dark-300/50">
                        <button
                          onClick={() => navigate(`/comics/${item.slug}/chapter/${item.chapterId}`)}
                          className="flex-1 py-3 text-blue-400 font-medium hover:bg-blue-500/10 transition-colors flex justify-center items-center gap-2"
                        >
                          <FiPlay /> Đọc tiếp
                        </button>
                        <div className="w-px bg-white/5"></div>
                        <button
                          onClick={() => handleRemoveComicHistory(item.slug)}
                          className="px-6 py-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Xóa khỏi lịch sử"
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
