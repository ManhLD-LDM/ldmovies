import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
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
  const [animes, setAnimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortOption, setSortOption] = useState(sortParam);

  useEffect(() => {
    if (query) {
      setSearchQuery(query);
      fetchAnimes(query, sortParam);
    }
  }, [query, sortParam]);

  const fetchAnimes = async (keyword, sort = sortOption) => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const response = await kkphimApi.searchAnime(keyword);
      const rawData = response.data || [];
      const sorted = sortMovies(rawData, sort);
      setAnimes(sorted);
    } catch (error) {
      console.error('Error searching Vietsub anime:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim(), sort: sortOption });
      setAnimes([]);
    }
  };

  const handleSortChange = (newSort) => {
    setSortOption(newSort);
    const sorted = sortMovies(animes, newSort);
    setAnimes(sorted);

    if (query) {
      setSearchParams({ q: query, sort: newSort });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative max-w-2xl mx-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm phim, anime..."
            className="w-full px-6 py-4 pl-14 bg-dark-300 border border-dark-400 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 text-lg"
          />
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
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
            <h1 className="text-2xl font-bold text-white">
              Kết quả tìm kiếm cho "{query}"
            </h1>

            {/* Sort Selector */}
            {animes.length > 0 && (
              <div className="flex items-center gap-2 bg-dark-300 px-3 py-2 rounded-lg border border-dark-400 self-start sm:self-auto">
                <span className="text-gray-400 text-sm font-medium whitespace-nowrap">Sắp xếp:</span>
                <select
                  value={sortOption}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-transparent text-white text-sm focus:outline-none cursor-pointer font-medium"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-dark-300 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <MovieGrid movies={animes} loading={loading} />

          {!loading && animes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Không tìm thấy kết quả cho "{query}"</p>
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
