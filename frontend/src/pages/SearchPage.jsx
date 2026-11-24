import { useEffect, useMemo, useState } from 'react';
import { FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import { kkphimApi } from '../services/kkphimApi';
import { sortMovies, SORT_OPTIONS } from '../utils/sortUtils';
import useDocumentTitle from '../utils/useDocumentTitle';

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const sortParam = searchParams.get('sort') || 'newest';

  useDocumentTitle(query ? `Tìm kiếm: "${query}"` : 'Tìm Kiếm Phim & Anime');

  const [searchQuery, setSearchQuery] = useState(query);
  const [rawResults, setRawResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [sortOption, setSortOption] = useState(sortParam);

  useEffect(() => {
    setSortOption(sortParam);
  }, [sortParam]);

  useEffect(() => {
    setSearchQuery(query);
    if (!query.trim()) {
      setRawResults([]);
      setError(false);
      return;
    }

    let isCancelled = false;
    const fetchResults = async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await kkphimApi.searchAnime(query.trim());
        if (isCancelled) return;
        setRawResults(response.data || []);
      } catch (err) {
        if (!isCancelled) {
          console.error('Error searching:', err);
          setError(true);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchResults();
    return () => {
      isCancelled = true;
    };
  }, [query, retryCount]);

  const sortedResults = useMemo(
    () => sortMovies(rawResults, sortOption),
    [rawResults, sortOption]
  );

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim(), sort: sortOption });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setRawResults([]);
    setSearchParams({});
  };

  const handleSortChange = (newSort) => {
    setSortOption(newSort);
    if (query) {
      setSearchParams({ q: query, sort: newSort }, { replace: true });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8" role="search">
        <div className="relative max-w-2xl mx-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm phim, anime..."
            aria-label="Tìm kiếm phim hoặc anime"
            className="w-full px-6 py-4 pl-14 pr-32 bg-dark-300 border border-dark-400 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 text-lg"
          />
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={24} />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute right-24 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <FiX size={18} />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors font-medium"
          >
            Tìm
          </button>
        </div>
      </form>

      {/* Results */}
      {query && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Kết quả tìm kiếm cho &quot;{query}&quot;
              </h1>
              {!loading && !error && (
                <p className="text-gray-400 text-sm mt-1">
                  Tìm thấy {sortedResults.length} kết quả phù hợp
                </p>
              )}
            </div>

            {/* Sort Selector */}
            {sortedResults.length > 0 && (
              <div className="flex items-center gap-2 bg-dark-300 px-3 py-2 rounded-lg border border-dark-400 self-start sm:self-auto">
                <span className="text-gray-400 text-sm font-medium whitespace-nowrap">Sắp xếp:</span>
                <select
                  value={sortOption}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-transparent text-white text-sm focus:outline-none cursor-pointer font-medium"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-dark-300 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error ? (
            <div className="text-center py-12 bg-dark-200/60 rounded-2xl border border-white/10">
              <p className="text-gray-300 text-lg mb-4">Không thể tìm kiếm lúc này</p>
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
            <MovieGrid movies={sortedResults} loading={loading} emptyMessage={null} />
          )}

          {!loading && !error && sortedResults.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Không tìm thấy kết quả cho &quot;{query}&quot;</p>
              <p className="text-gray-500 mt-2">Hãy thử tìm với từ khóa khác</p>
            </div>
          )}
        </div>
      )}

      {!query && (
        <div className="text-center py-12">
          <FiSearch className="mx-auto text-gray-500 mb-4" size={64} />
          <p className="text-gray-400 text-lg">Nhập từ khóa để tìm kiếm phim hoặc anime</p>
        </div>
      )}
    </div>
  );
}

export default SearchPage;
