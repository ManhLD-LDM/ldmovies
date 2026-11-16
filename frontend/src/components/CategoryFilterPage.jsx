import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiFilter, FiRefreshCw, FiX } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MovieGrid from './MovieGrid';
import Pagination from './Pagination';
import { sortMovies, SORT_OPTIONS } from '../utils/sortUtils';

const getNormalizedSlugsKey = (categories) =>
  categories.map((c) => c.slug).sort().join(',');

/**
 * Shared filter view used by both MovieFilterPage and AnimeFilterPage.
 */
function CategoryFilterPage({
  title,
  subtitle,
  itemNoun,
  backPath,
  filterPath,
  contentType,
  fetchCategories,
  fetchFilteredItems,
}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [appliedSlugsKey, setAppliedSlugsKey] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const sortParam = searchParams.get('sort') || 'newest';
  const [sortOption, setSortOption] = useState(sortParam);

  const resultsRef = useRef(null);
  const shouldScrollRef = useRef(false);
  const lastQueryKeyRef = useRef('');
  const rawItemsRef = useRef([]);

  const scrollToResults = useCallback(() => {
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  // Scroll smoothly to results once results section is rendered when triggered by search/pagination
  useEffect(() => {
    if (hasSearched && shouldScrollRef.current && resultsRef.current) {
      shouldScrollRef.current = false;
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hasSearched, loading, filteredItems]);

  // 1. Load categories only once on mount so skeleton never flickers on search/pagination
  useEffect(() => {
    let isCancelled = false;
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const categories = await fetchCategories();
        if (!isCancelled) {
          setAllCategories(categories);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        if (!isCancelled) {
          setCategoriesLoading(false);
        }
      }
    };

    loadCategories();
    return () => {
      isCancelled = true;
    };
  }, [fetchCategories]);

  // 2. React to URL searchParams once categories are available (single fetch per change)
  useEffect(() => {
    if (allCategories.length === 0) return;

    let isCancelled = false;
    const categoriesParam = searchParams.get('categories');
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const activePage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const currentSort = searchParams.get('sort') || 'newest';

    setSortOption(currentSort);

    if (!categoriesParam) {
      lastQueryKeyRef.current = '';
      rawItemsRef.current = [];
      setSelectedCategories([]);
      setAppliedSlugsKey('');
      setHasSearched(false);
      setFilteredItems([]);
      setTotalPages(1);
      setTotalItems(0);
      setCurrentPage(1);
      return;
    }

    const slugs = categoriesParam.split(',').filter(Boolean);
    const matchedCats = slugs
      .map((slug) => allCategories.find((c) => c.slug === slug))
      .filter(Boolean);

    if (matchedCats.length === 0) {
      lastQueryKeyRef.current = '';
      rawItemsRef.current = [];
      setHasSearched(false);
      setFilteredItems([]);
      setAppliedSlugsKey('');
      return;
    }

    const normalizedKey = getNormalizedSlugsKey(matchedCats);
    const queryKey = `${matchedCats.map((c) => c.slug).join(',')}|${activePage}`;

    setSelectedCategories(matchedCats);
    setAppliedSlugsKey(normalizedKey);

    // If only sort changed, re-sort locally without re-fetching API
    if (lastQueryKeyRef.current === queryKey && rawItemsRef.current.length > 0) {
      setFilteredItems(sortMovies(rawItemsRef.current, currentSort));
      return;
    }

    const runFilter = async () => {
      setLoading(true);
      setHasSearched(true);
      try {
        const response = await fetchFilteredItems(matchedCats, activePage, 24);
        if (isCancelled) return;
        const raw = response.data || [];
        rawItemsRef.current = raw;
        lastQueryKeyRef.current = queryKey;
        setFilteredItems(sortMovies(raw, currentSort));
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalItems(response.pagination?.totalItems ?? raw.length);
        setCurrentPage(response.pagination?.currentPage || activePage);
      } catch (error) {
        if (!isCancelled) {
          console.error('Error filtering items:', error);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    runFilter();

    return () => {
      isCancelled = true;
    };
  }, [searchParams, allCategories, fetchFilteredItems, scrollToResults]);

  const selectedSlugsKey = useMemo(
    () => getNormalizedSlugsKey(selectedCategories),
    [selectedCategories]
  );
  const hasPendingChanges =
    hasSearched &&
    selectedCategories.length > 0 &&
    selectedSlugsKey !== appliedSlugsKey;

  // Debounce auto-refetch when user modifies tags after an initial search
  useEffect(() => {
    if (!hasPendingChanges) return;

    const timer = setTimeout(() => {
      const slugs = selectedCategories.map((c) => c.slug).join(',');
      navigate(`${filterPath}?categories=${slugs}&page=1&sort=${sortOption}`, {
        replace: true,
      });
    }, 450);

    return () => clearTimeout(timer);
  }, [hasPendingChanges, selectedCategories, filterPath, sortOption, navigate]);

  const clearAll = useCallback(() => {
    lastQueryKeyRef.current = '';
    rawItemsRef.current = [];
    setSelectedCategories([]);
    setAppliedSlugsKey('');
    setFilteredItems([]);
    setHasSearched(false);
    setTotalPages(1);
    setTotalItems(0);
    setCurrentPage(1);
    navigate(filterPath, { replace: true });
  }, [filterPath, navigate]);

  const toggleCategory = (category) => {
    const exists = selectedCategories.some((c) => c.slug === category.slug);
    const nextSelected = exists
      ? selectedCategories.filter((c) => c.slug !== category.slug)
      : [...selectedCategories, category];

    if (nextSelected.length === 0) {
      if (hasSearched || searchParams.get('categories')) {
        clearAll();
      } else {
        setSelectedCategories([]);
      }
      return;
    }

    setSelectedCategories(nextSelected);
  };

  const handleSearch = (categories = selectedCategories) => {
    if (!categories || categories.length === 0) return;

    const slugs = categories.map((c) => c.slug).join(',');
    const currentCategoriesParam = searchParams.get('categories') || '';
    const currentPageParam = parseInt(searchParams.get('page') || '1', 10);

    if (
      currentCategoriesParam === slugs &&
      currentPageParam === 1 &&
      (searchParams.get('sort') || 'newest') === sortOption
    ) {
      scrollToResults();
      return;
    }

    shouldScrollRef.current = true;
    navigate(`${filterPath}?categories=${slugs}&page=1&sort=${sortOption}`);
  };

  const handleSortChange = (newSort) => {
    setSortOption(newSort);
    setFilteredItems(sortMovies(filteredItems, newSort));

    if (selectedCategories.length > 0 && hasSearched) {
      const slugs = selectedCategories.map((c) => c.slug).join(',');
      navigate(`${filterPath}?categories=${slugs}&page=${currentPage}&sort=${newSort}`, {
        replace: true,
      });
    }
  };

  const handlePageChange = (newPage) => {
    if (selectedCategories.length === 0) return;
    shouldScrollRef.current = true;
    const slugs = selectedCategories.map((c) => c.slug).join(',');
    navigate(`${filterPath}?categories=${slugs}&page=${newPage}&sort=${sortOption}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
              <FiFilter className="text-primary-500" />
              {title}
            </h1>
            <p className="text-gray-400">{subtitle}</p>
          </div>
          <button
            onClick={() => navigate(backPath)}
            className="px-4 py-2 bg-dark-300 hover:bg-dark-400 text-white rounded-lg transition-colors font-medium"
          >
            Quay Lại
          </button>
        </div>

        {/* Selected Categories Summary */}
        {selectedCategories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap p-4 bg-dark-300 rounded-lg border border-white/5">
            <span className="text-gray-300 font-medium">Đã chọn ({selectedCategories.length}):</span>
            {selectedCategories.map((cat) => (
              <span
                key={cat.slug}
                className="px-3 py-1 bg-primary-600 text-white rounded-full text-sm flex items-center gap-2"
              >
                {cat.name}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  aria-label={`Bỏ chọn thể loại ${cat.name}`}
                  className="hover:bg-primary-700 rounded-full p-0.5 transition-colors"
                >
                  <FiX size={15} />
                </button>
              </span>
            ))}
            <button
              type="button"
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
                const isSelected = selectedCategories.some((c) => c.slug === category.slug);
                return (
                  <button
                    key={category.slug}
                    type="button"
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

      {/* Search Button & Sort Options */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="hidden sm:block"></div>
        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={selectedCategories.length === 0 || loading}
          className={`px-8 py-3 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg shadow-lg flex items-center gap-2 ${
            hasPendingChanges
              ? 'bg-gradient-to-r from-primary-500 to-violet-600 hover:from-primary-600 hover:to-violet-700 shadow-primary-500/40 ring-2 ring-primary-400/50'
              : 'bg-primary-600 hover:bg-primary-700 shadow-primary-600/30'
          }`}
        >
          {hasPendingChanges && <FiRefreshCw size={18} className="animate-spin" />}
          <span>
            {loading
              ? 'Đang tìm kiếm...'
              : hasPendingChanges
                ? `Cập nhật kết quả (${selectedCategories.length} thể loại)`
                : `Tìm Kiếm${selectedCategories.length > 0 ? ` (${selectedCategories.length} thể loại)` : ''}`}
          </span>
        </button>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 bg-dark-300 px-3 py-2 rounded-lg border border-dark-400">
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
      </div>

      {/* Results */}
      {hasSearched && (
        <div ref={resultsRef} className="scroll-mt-20">
          {hasPendingChanges && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-primary-600/15 border border-primary-500/30 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-primary-200">
                Danh sách thể loại vừa thay đổi — đang tự động cập nhật kết quả...
              </span>
              <button
                type="button"
                onClick={() => handleSearch()}
                className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Cập nhật kết quả ngay
              </button>
            </div>
          )}

          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold text-white">Kết Quả</h2>
              <p className="text-gray-400 text-sm mt-1">
                {loading
                  ? `Đang tải danh sách ${itemNoun}...`
                  : `Tìm thấy ${totalItems.toLocaleString()} ${itemNoun} phù hợp ${
                      totalPages > 1 ? `(Trang ${currentPage} / ${totalPages})` : ''
                    }`}
              </p>
            </div>
          </div>

          {loading ? (
            <MovieGrid movies={[]} loading={true} contentType={contentType} />
          ) : filteredItems.length > 0 ? (
            <>
              <MovieGrid movies={filteredItems} loading={false} contentType={contentType} />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                scrollToTop={false}
              />
            </>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">😢</div>
              <p className="text-gray-400 text-lg">
                Không tìm thấy {itemNoun} nào với các thể loại đã chọn
              </p>
              <button
                type="button"
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

export default CategoryFilterPage;
