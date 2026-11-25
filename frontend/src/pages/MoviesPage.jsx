import { useEffect, useState } from 'react';
import { FiFilter, FiRefreshCw } from 'react-icons/fi';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import MovieSection from '../components/MovieSection';
import Pagination from '../components/Pagination';
import { kkphimApi } from '../services/kkphimApi';
import useDocumentTitle from '../utils/useDocumentTitle';

const QUICK_MOVIE_CATEGORIES = [
  { label: 'Hành Động', slug: 'hanh-dong' },
  { label: 'Gây Cấn', slug: 'gay-can' },
  { label: 'Viễn Tưởng', slug: 'vien-tuong' },
  { label: 'Kinh Dị', slug: 'kinh-di' },
  { label: 'Tình Cảm', slug: 'tinh-cam' },
  { label: 'Hài Hước', slug: 'hai-huoc' },
  { label: 'Hình Sự', slug: 'hinh-su' },
  { label: 'Cổ Trang', slug: 'co-trang' },
  { label: 'TV Shows', slug: 'tv-shows' },
];

function MoviesPage() {
  useDocumentTitle('Danh Sách Phim Mới & Hot Nhất');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const typeParam = searchParams.get('type') || 'all';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const activePage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const showShowcases = typeParam === 'all' && activePage === 1;

  const [movies, setMovies] = useState([]);
  const [selectedType, setSelectedType] = useState(typeParam); // 'all', 'phim-le', 'phim-bo'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(activePage);
  const [totalPages, setTotalPages] = useState(1);

  const [showcases, setShowcases] = useState({
    single: [],
    series: [],
    action: [],
  });
  const [showcasesLoading, setShowcasesLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const fetchMovies = async () => {
      setLoading(true);
      setError(false);
      try {
        let response;

        if (typeParam === 'all') {
          response = await kkphimApi.getAllMoviesAndSeries(activePage, 24);
        } else if (typeParam === 'phim-le') {
          response = await kkphimApi.getAllMovies(activePage, 24);
        } else if (typeParam === 'phim-bo') {
          response = await kkphimApi.getAllTVSeries(activePage, 24);
        }

        if (isCancelled) return;

        setMovies(response?.data || []);
        setTotalPages(response?.pagination?.totalPages || 1);
        setCurrentPage(response?.pagination?.currentPage || activePage);
        setSelectedType(typeParam);
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching movies:', err);
          setError(true);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    fetchMovies();
    return () => {
      isCancelled = true;
    };
  }, [typeParam, activePage, retryCount]);

  useEffect(() => {
    if (!showShowcases) return undefined;
    let isCancelled = false;

    const fetchShowcases = async () => {
      setShowcasesLoading(true);
      const results = await Promise.allSettled([
        kkphimApi.getAllMovies(1, 12),
        kkphimApi.getAllTVSeries(1, 12),
        kkphimApi.filterMoviesByCategories([{ slug: 'hanh-dong' }], 1, 12),
      ]);
      if (isCancelled) return;

      setShowcases({
        single: results[0].status === 'fulfilled' ? results[0].value?.data || [] : [],
        series: results[1].status === 'fulfilled' ? results[1].value?.data || [] : [],
        action: results[2].status === 'fulfilled' ? (results[2].value?.data || []).slice(0, 12) : [],
      });
      setShowcasesLoading(false);
    };

    fetchShowcases();
    return () => {
      isCancelled = true;
    };
  }, [showShowcases, retryCount]);

  const handleTypeChange = (type) => {
    setSelectedType(type);
    navigate(`/movies?type=${type}&page=1`);
  };

  const handlePageChange = (newPage) => {
    navigate(`/movies?type=${selectedType}&page=${newPage}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Title */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Phim</h1>
            <p className="text-gray-400">Tổng hợp phim lẻ và phim bộ Vietsub mới nhất từ KKPhim &amp; NguonC</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/movies/filter')}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-primary-600/30"
          >
            <FiFilter size={18} />
            <span>Bộ Lọc</span>
          </button>
        </div>
      </div>

      {/* Type Filter */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedType === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-dark-300 text-gray-300 hover:bg-dark-400'
            }`}
          >
            Tất Cả
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('phim-le')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedType === 'phim-le'
                ? 'bg-primary-600 text-white'
                : 'bg-dark-300 text-gray-300 hover:bg-dark-400'
            }`}
          >
            Phim Lẻ
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('phim-bo')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedType === 'phim-bo'
                ? 'bg-primary-600 text-white'
                : 'bg-dark-300 text-gray-300 hover:bg-dark-400'
            }`}
          >
            Phim Bộ
          </button>
        </div>
      </div>

      {/* Quick Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-white/10 scrollbar-hide">
        {QUICK_MOVIE_CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            to={`/movies/filter?categories=${cat.slug}&page=1`}
            className="shrink-0 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-white/5 text-gray-300 border border-white/10 hover:border-primary-500/50 hover:text-white transition-colors"
          >
            {cat.label}
          </Link>
        ))}
      </div>

      {/* Curated Showcases when on /movies?type=all&page=1 */}
      {showShowcases && !error && (
        <div className="mb-8 space-y-2">
          <MovieSection
            title="Phim Lẻ Mới Nổi Bật"
            movies={showcases.single}
            loading={showcasesLoading}
            viewAllLink="/movies?type=phim-le"
            contentType="movie"
          />
          <MovieSection
            title="Phim Bộ Đang Hot"
            movies={showcases.series}
            loading={showcasesLoading}
            viewAllLink="/movies?type=phim-bo"
            contentType="movie"
          />
          <MovieSection
            title="Phim Hành Động Nổi Bật"
            movies={showcases.action}
            loading={showcasesLoading}
            viewAllLink="/movies/filter?categories=hanh-dong&page=1"
            contentType="movie"
          />
        </div>
      )}

      {/* Full Grid Section */}
      {showShowcases && !error && (
        <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-6">
          <span className="w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full" />
          <span>Khám Phá Toàn Bộ Kho Phim</span>
        </h2>
      )}

      {/* Movies Grid / Error State */}
      {error ? (
        <div className="text-center py-16 bg-dark-200/60 rounded-2xl border border-white/10">
          <p className="text-gray-300 text-lg mb-4">Không thể tải danh sách phim</p>
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
        <MovieGrid movies={movies} loading={loading} contentType="movie" />
      )}

      {/* Pagination */}
      {!loading && !error && movies.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

export default MoviesPage;
