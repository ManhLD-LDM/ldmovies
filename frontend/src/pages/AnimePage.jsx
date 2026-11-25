import { useEffect, useState } from 'react';
import { FiFilter, FiRefreshCw } from 'react-icons/fi';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import MovieSection from '../components/MovieSection';
import Pagination from '../components/Pagination';
import { kkphimApi } from '../services/kkphimApi';
import useDocumentTitle from '../utils/useDocumentTitle';

const QUICK_ANIME_CATEGORIES = [
  { label: 'Hành Động', slug: 'hanh-dong' },
  { label: 'Phiêu Lưu', slug: 'phieu-luu' },
  { label: 'Viễn Tưởng', slug: 'vien-tuong' },
  { label: 'Hài Hước', slug: 'hai-huoc' },
  { label: 'Học Đường', slug: 'hoc-duong' },
  { label: 'Giả Tưởng', slug: 'gia-tuong' },
  { label: 'Kinh Dị', slug: 'kinh-di' },
  { label: 'Tình Cảm', slug: 'tinh-cam' },
];

function AnimePage() {
  useDocumentTitle('Kho Anime Vietsub Hay Nhất');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const activePage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const rawSort = searchParams.get('sort') || 'updated';
  const sortParam = ['updated', 'year_desc', 'year_asc'].includes(rawSort) ? rawSort : 'updated';
  const showShowcases = activePage === 1 && sortParam === 'updated';

  const [animes, setAnimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(activePage);
  const [totalPages, setTotalPages] = useState(1);

  const [showcases, setShowcases] = useState({
    action: [],
    adventure: [],
  });
  const [showcasesLoading, setShowcasesLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const fetchAnimes = async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await kkphimApi.getAllAnime(activePage, 24, sortParam);
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
  }, [activePage, sortParam, retryCount]);

  useEffect(() => {
    if (!showShowcases) return undefined;
    let isCancelled = false;

    const fetchShowcases = async () => {
      setShowcasesLoading(true);
      const results = await Promise.allSettled([
        kkphimApi.getCategoryPreview('hanh-dong', 'anime', 12),
        kkphimApi.getCategoryPreview('phieu-luu', 'anime', 12),
      ]);
      if (isCancelled) return;

      setShowcases({
        action: results[0].status === 'fulfilled' ? (results[0].value?.data || []).slice(0, 12) : [],
        adventure: results[1].status === 'fulfilled' ? (results[1].value?.data || []).slice(0, 12) : [],
      });
      setShowcasesLoading(false);
    };

    fetchShowcases();
    return () => {
      isCancelled = true;
    };
  }, [showShowcases, retryCount]);

  const handlePageChange = (newPage) => {
    navigate(`/anime?page=${newPage}${sortParam !== 'updated' ? `&sort=${sortParam}` : ''}`);
  };

  const handleSortChange = (e) => {
    const newSort = e.target.value;
    navigate(newSort === 'updated' ? '/anime?page=1' : `/anime?page=1&sort=${newSort}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Title */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Anime Vietsub</h1>
            <p className="text-gray-400">Tổng hợp anime Vietsub mới nhất từ KKPhim &amp; NguonC</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <select
              value={sortParam}
              onChange={handleSortChange}
              aria-label="Sắp xếp anime"
              className="bg-dark-200 border border-white/10 text-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="updated">Mới cập nhật</option>
              <option value="year_desc">Năm: Mới → Cũ</option>
              <option value="year_asc">Năm: Cũ → Mới</option>
            </select>
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
      </div>

      {/* Quick Genre Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-white/10 scrollbar-hide">
        {QUICK_ANIME_CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            to={`/anime/filter?categories=${cat.slug}&page=1`}
            className="shrink-0 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-white/5 text-gray-300 border border-white/10 hover:border-primary-500/50 hover:text-white transition-colors"
          >
            {cat.label}
          </Link>
        ))}
      </div>

      {/* Curated Anime Showcases */}
      {showShowcases && !error && (
        <div className="mb-8 space-y-2">
          <MovieSection
            title="Anime Hành Động & Chiến Đấu"
            movies={showcases.action}
            loading={showcasesLoading}
            viewAllLink="/anime/filter?categories=hanh-dong&page=1"
            contentType="anime"
          />
          <MovieSection
            title="Anime Phiêu Lưu & Giả Tưởng"
            movies={showcases.adventure}
            loading={showcasesLoading}
            viewAllLink="/anime/filter?categories=phieu-luu&page=1"
            contentType="anime"
          />
        </div>
      )}

      {/* Full Grid Section */}
      {showShowcases && !error && (
        <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-6">
          <span className="w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full" />
          <span>Toàn Bộ Kho Anime</span>
        </h2>
      )}

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
