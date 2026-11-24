import { useEffect, useState } from 'react';
import { FiFilter, FiRefreshCw } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import Pagination from '../components/Pagination';
import { kkphimApi } from '../services/kkphimApi';
import useDocumentTitle from '../utils/useDocumentTitle';

function AnimePage() {
  useDocumentTitle('Kho Anime Vietsub Hay Nhất');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const activePage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const [animes, setAnimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(activePage);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let isCancelled = false;
    const fetchAnimes = async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await kkphimApi.getAllAnime(activePage, 24);
        if (isCancelled) return;
        setAnimes(response?.data || []);
        setTotalPages(response?.pagination?.totalPages || 1);
        setCurrentPage(response?.pagination?.currentPage || activePage);
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching Vietsub anime:', err);
          setError(true);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    fetchAnimes();
    return () => {
      isCancelled = true;
    };
  }, [activePage, retryCount]);

  const handlePageChange = (newPage) => {
    navigate(`/anime?page=${newPage}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Title */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Anime Vietsub</h1>
            <p className="text-gray-400">Tổng hợp anime Vietsub mới nhất từ KKPhim</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/anime/filter')}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-primary-600/30"
          >
            <FiFilter size={18} />
            <span>Bộ Lọc</span>
          </button>
        </div>
      </div>

      {/* Anime Grid / Error State */}
      {error ? (
        <div className="text-center py-16 bg-dark-200/60 rounded-2xl border border-white/10">
          <p className="text-gray-300 text-lg mb-4">Không thể tải danh sách Anime</p>
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium transition-colors"
          >
            <FiRefreshCw size={16} />
            <span>Thử lại</span>
          </button>
        </div>
      ) : (
        <MovieGrid movies={animes} loading={loading} contentType="anime" />
      )}

      {/* Pagination */}
      {!loading && !error && animes.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

export default AnimePage;
