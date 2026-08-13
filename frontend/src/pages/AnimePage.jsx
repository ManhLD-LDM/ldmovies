import { useEffect, useState } from 'react';
import { FiFilter } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import Pagination from '../components/Pagination';
import { kkphimApi } from '../services/kkphimApi';

function AnimePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const activePage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const [animes, setAnimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(activePage);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchAnimes = async () => {
      setLoading(true);
      try {
        const response = await kkphimApi.getAllAnime(activePage, 24);
        setAnimes(response?.data || []);
        setTotalPages(response?.pagination?.totalPages || 1);
        setCurrentPage(response?.pagination?.currentPage || activePage);
      } catch (error) {
        console.error('Error fetching Vietsub anime:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnimes();
  }, [activePage]);

  const handlePageChange = (newPage) => {
    navigate(`/anime?page=${newPage}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Title */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Anime Vietsub</h1>
            <p className="text-gray-400">Tổng hợp anime Vietsub mới nhất từ KKPhim</p>
          </div>
          <button
            onClick={() => navigate('/anime/filter')}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-primary-600/30"
          >
            <FiFilter size={20} />
            <span>Bộ Lọc</span>
          </button>
        </div>
      </div>

      {/* Anime Grid */}
      <MovieGrid movies={animes} loading={loading} contentType="anime" />

      {/* Pagination */}
      {!loading && animes.length > 0 && (
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
