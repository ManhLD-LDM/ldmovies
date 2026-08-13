import { useEffect, useState } from 'react';
import { FiFilter, FiX } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import Pagination from '../components/Pagination';
import { kkphimApi } from '../services/kkphimApi';

function AnimeFilterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [filteredAnimes, setFilteredAnimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Load categories and fetch filtered anime if URL contains query parameters
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const categories = await kkphimApi.getAllCategories();
        setAllCategories(categories);

        const categoriesParam = searchParams.get('categories');
        const pageParam = parseInt(searchParams.get('page') || '1', 10);
        const activePage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

        if (categoriesParam) {
          const slugs = categoriesParam.split(',');
          const cats = categories.filter(c => slugs.includes(c.slug));
          if (cats.length > 0) {
            setSelectedCategories(cats);
            fetchFilteredAnime(cats, activePage);
          } else {
            setHasSearched(false);
            setFilteredAnimes([]);
          }
        } else {
          setSelectedCategories([]);
          setHasSearched(false);
          setFilteredAnimes([]);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, [searchParams]);

  const fetchFilteredAnime = async (categories, page = 1) => {
    if (!categories || categories.length === 0) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await kkphimApi.filterAnimeByCategories(categories, page, 24);
      setFilteredAnimes(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalItems(response.pagination?.totalItems || response.data?.length || 0);
      setCurrentPage(response.pagination?.currentPage || page);
    } catch (error) {
      console.error('Error filtering anime:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev => {
      const exists = prev.find(c => c.slug === category.slug);
      if (exists) {
        return prev.filter(c => c.slug !== category.slug);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleSearch = (categories = selectedCategories) => {
    if (categories.length === 0) {
      alert('Vui lòng chọn ít nhất 1 thể loại');
      return;
    }

    const slugs = categories.map(c => c.slug).join(',');
    navigate(`/anime/filter?categories=${slugs}&page=1`);
  };

  const handlePageChange = (newPage) => {
    if (selectedCategories.length === 0) return;
    const slugs = selectedCategories.map(c => c.slug).join(',');
    navigate(`/anime/filter?categories=${slugs}&page=${newPage}`);
  };

  const clearAll = () => {
    setSelectedCategories([]);
    setFilteredAnimes([]);
    setHasSearched(false);
    setTotalPages(1);
    setTotalItems(0);
    setCurrentPage(1);
    navigate('/anime/filter');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
              <FiFilter className="text-primary-500" />
              Bộ Lọc Anime
            </h1>
            <p className="text-gray-400">Chọn các thể loại để tìm anime phù hợp</p>
          </div>
          <button
            onClick={() => navigate('/anime')}
            className="px-4 py-2 bg-dark-300 hover:bg-dark-400 text-white rounded-lg transition-colors font-medium"
          >
            Quay Lại
          </button>
        </div>

        {/* Selected Categories Summary */}
        {selectedCategories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap p-4 bg-dark-300 rounded-lg">
            <span className="text-gray-300 font-medium">Đã chọn ({selectedCategories.length}):</span>
            {selectedCategories.map(cat => (
              <span
                key={cat.slug}
                className="px-3 py-1 bg-primary-600 text-white rounded-full text-sm flex items-center gap-2"
              >
                {cat.name}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="hover:bg-primary-700 rounded-full"
                >
                  <FiX size={16} />
                </button>
              </span>
            ))}
            <button
              onClick={clearAll}
              className="ml-auto px-4 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
            >
              Xóa Tất Cả
            </button>
          </div>
        )}
      </div>

      {/* Categories Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Chọn Thể Loại</h2>
        {categoriesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {[...Array(18)].map((_, i) => (
              <div key={i} className="h-12 bg-dark-300 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {allCategories.map((category) => {
                const isSelected = selectedCategories.some(c => c.slug === category.slug);
                return (
                  <button
                    key={category.slug}
                    onClick={() => toggleCategory(category)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/50'
                        : 'bg-dark-300 text-gray-300 hover:bg-dark-400'
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Search Button */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => handleSearch()}
          disabled={selectedCategories.length === 0 || loading}
          className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg shadow-lg shadow-primary-600/30"
        >
          {loading ? 'Đang tìm kiếm...' : `Tìm Kiếm${selectedCategories.length > 0 ? ` (${selectedCategories.length} thể loại)` : ''}`}
        </button>
      </div>

      {/* Results */}
      {hasSearched && (
        <div>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold text-white">Kết Quả</h2>
              <p className="text-gray-400 text-sm mt-1">
                {loading
                  ? 'Đang tải danh sách anime...'
                  : `Tìm thấy ${totalItems.toLocaleString()} anime phù hợp ${
                      totalPages > 1 ? `(Trang ${currentPage} / ${totalPages})` : ''
                    }`}
              </p>
            </div>
          </div>

          {loading ? (
            <MovieGrid movies={[]} loading={true} contentType="anime" />
          ) : filteredAnimes.length > 0 ? (
            <>
              <MovieGrid movies={filteredAnimes} loading={false} contentType="anime" />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">😢</div>
              <p className="text-gray-400 text-lg">
                Không tìm thấy anime nào với các thể loại đã chọn
              </p>
              <button
                onClick={clearAll}
                className="mt-4 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
              >
                Thử Lại
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AnimeFilterPage;
