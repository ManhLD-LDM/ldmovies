import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiBookOpen, FiChevronLeft, FiChevronRight, FiClock, FiFilter, FiPlay, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';
import ComicSection from '../components/ComicSection';
import { comicApi } from '../services/comicApi';
import useAuthStore from '../stores/authStore';
import useComicHistoryStore from '../stores/comicHistoryStore';
import { formatTimeAgo } from '../utils/formatTime';
import { FALLBACK_POSTER } from '../utils/textUtils';
import useDocumentTitle from '../utils/useDocumentTitle';

const prefetchedSlugs = new Set();
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const QUICK_GENRES = [
  { label: 'Mới Cập Nhật', slug: '__latest__', to: '/comics?sort=latest' },
  { label: 'Manhwa', slug: 'manhwa', to: '/comics?genre=manhwa' },
  { label: 'Manhua', slug: 'manhua', to: '/comics?genre=manhua' },
  { label: 'Manga', slug: 'manga', to: '/comics?genre=manga' },
  { label: 'Action', slug: 'action', to: '/comics?genre=action' },
  { label: 'Fantasy', slug: 'fantasy', to: '/comics?genre=fantasy' },
  { label: 'Chuyển Sinh', slug: 'chuyen-sinh', to: '/comics?genre=chuyen-sinh' },
  { label: 'Romance', slug: 'romance', to: '/comics?genre=romance' },
  { label: 'Comedy', slug: 'comedy', to: '/comics?genre=comedy' },
  { label: 'Phiêu Lưu', slug: 'phieu-luu', to: '/comics?genre=phieu-luu' },
  { label: 'Võ Thuật', slug: 'martial-arts', to: '/comics?genre=martial-arts' },
  { label: 'Kinh Dị', slug: 'horror', to: '/comics?genre=horror' },
];

function resolveComicImageUrl(url) {
  if (!url) return FALLBACK_POSTER;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  if (url.startsWith('/api/')) return `${API_BASE}${url.slice(4)}`;
  if (url.startsWith('/')) return url;
  return `https://img.otruyenapi.com/uploads/comics/${url}`;
}

function prefetchComicDetail(slug) {
  if (!slug || prefetchedSlugs.has(slug)) return;
  prefetchedSlugs.add(slug);
  comicApi.getComicDetails(slug).catch(() => {
    prefetchedSlugs.delete(slug);
  });
}

function ComicHomePage() {
  useDocumentTitle('Kho Truyện Tranh Online Hay & Mới Nhất');

  const { isAuthenticated } = useAuthStore();
  const { comicHistory, fetchComicHistory } = useComicHistoryStore();

  const [comics, setComics] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Curated genre carousels for Discovery Hub (/comics)
  const [curatedSections, setCuratedSections] = useState({
    manhwa: [],
    action: [],
    fantasy: [],
    manhua: [],
  });
  const [curatedLoading, setCuratedLoading] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const genreParam = searchParams.get('genre') || '';
  const sortParam = searchParams.get('sort') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const isDiscoveryHome = !q && !genreParam && sortParam !== 'latest' && page === 1;

  const activeFilter = q
    ? { type: 'search', value: q }
    : genreParam
      ? { type: 'genre', value: genreParam }
      : { type: 'latest', value: null };

  const [searchQuery, setSearchQuery] = useState(q);
  const [totalPages, setTotalPages] = useState(1);

  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef(null);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    setSearchQuery(q);
  }, [q]);

  useEffect(() => {
    if (isAuthenticated && isDiscoveryHome) {
      fetchComicHistory();
    }
  }, [isAuthenticated, isDiscoveryHome, fetchComicHistory]);

  // Tự động chuyển slide hero
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Fetch thể loại một lần
  useEffect(() => {
    let isCancelled = false;
    comicApi
      .getGenres()
      .then((data) => {
        if (!isCancelled && data?.data?.items) {
          setGenres(data.data.items);
        }
      })
      .catch((err) => {
        if (!isCancelled) console.error('Lỗi khi tải thể loại:', err);
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  // Đóng dropdown khi click bên ngoài hoặc nhấn Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setShowFilterDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fetch main comics list
  useEffect(() => {
    let isCancelled = false;

    const fetchComics = async () => {
      try {
        setLoading(true);
        setError(null);
        let data = null;

        if (q) {
          data = await comicApi.searchComics(q);
        } else if (genreParam) {
          data = await comicApi.getComicsByGenre(genreParam, page);
        } else {
          data = await comicApi.getLatestComics(page);
        }

        if (isCancelled) return;

        if (data && data.status === 'success') {
          const items = data.data.items || [];
          setComics(items);

          if (!q) {
            const pagination = data.data.pagination || data.data.params?.pagination;
            if (pagination) {
              setTotalPages(
                Math.max(1, Math.ceil(pagination.totalItems / (pagination.totalItemsPerPage || 24)))
              );
            } else {
              setTotalPages(1);
            }
          } else {
            setTotalPages(1);
          }
        } else {
          setComics([]);
          setTotalPages(1);
        }
      } catch (err) {
        if (!isCancelled) {
          setError('Không thể tải dữ liệu truyện tranh');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };

    fetchComics();
    return () => {
      isCancelled = true;
    };
  }, [q, genreParam, sortParam, page, retryCount]);

  // Fetch curated sections only on Discovery Home (/comics)
  useEffect(() => {
    if (!isDiscoveryHome) return undefined;
    let isCancelled = false;

    const fetchCurated = async () => {
      setCuratedLoading(true);
      const results = await Promise.allSettled([
        comicApi.getComicsByGenre('manhwa', 1),
        comicApi.getComicsByGenre('action', 1),
        comicApi.getComicsByGenre('fantasy', 1),
        comicApi.getComicsByGenre('manhua', 1),
      ]);
      if (isCancelled) return;

      const extractItems = (res) =>
        res.status === 'fulfilled' && res.value?.status === 'success'
          ? (res.value.data?.items || []).slice(0, 14)
          : [];

      setCuratedSections({
        manhwa: extractItems(results[0]),
        action: extractItems(results[1]),
        fantasy: extractItems(results[2]),
        manhua: extractItems(results[3]),
      });
      setCuratedLoading(false);
    };

    fetchCurated();
    return () => {
      isCancelled = true;
    };
  }, [isDiscoveryHome, retryCount]);

  const setPage = (nextPageOrUpdater) => {
    const nextPage = typeof nextPageOrUpdater === 'function' ? nextPageOrUpdater(page) : nextPageOrUpdater;
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    const params = {};
    if (q) params.q = q;
    else if (genreParam) params.genre = genreParam;
    else if (sortParam === 'latest') params.sort = 'latest';
    if (clamped > 1) params.page = String(clamped);
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchParams({});
      return;
    }
    setSearchParams({ q: searchQuery.trim() });
  };

  const handleGenreClick = (slug) => {
    setSearchQuery('');
    setShowFilterDropdown(false);
    setSearchParams({ genre: slug });
  };

  const clearFilter = () => {
    setSearchQuery('');
    setShowFilterDropdown(false);
    setSearchParams({});
  };

  const getFilterTitle = () => {
    if (activeFilter.type === 'search') return `Kết quả cho "${activeFilter.value}"`;
    if (activeFilter.type === 'genre') {
      return genres.find((g) => g.slug === activeFilter.value)?.name || 'Theo Thể Loại';
    }
    if (sortParam === 'latest' || page > 1) return 'Truyện Mới Cập Nhật';
    return 'Khám Phá Truyện Tranh';
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-14 flex-wrap font-medium">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="p-3 rounded-lg border border-white/10 hover:border-teal-400/50 text-white disabled:opacity-30 transition-colors"
          aria-label="Trang trước"
        >
          <FiChevronLeft size={18} />
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => setPage(1)}
              className="px-4 py-2 rounded-lg border border-white/10 hover:border-teal-400/50 text-white transition-colors"
            >
              1
            </button>
            {startPage > 2 && <span className="text-zinc-600">...</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => setPage(p)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              page === p
                ? 'bg-teal-500 text-black font-bold border-teal-400'
                : 'border-white/10 hover:border-teal-400/50 text-zinc-400 hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-zinc-600">...</span>}
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              className="px-4 py-2 rounded-lg border border-white/10 hover:border-teal-400/50 text-white transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="p-3 rounded-lg border border-white/10 hover:border-teal-400/50 text-white disabled:opacity-30 transition-colors"
          aria-label="Trang sau"
        >
          <FiChevronRight size={18} />
        </button>
      </div>
    );
  };

  return (
    <div className="pt-6 px-4 sm:px-8 lg:px-12 max-w-[1600px] mx-auto min-h-screen text-white pb-24 font-sans">
      {/* Header + Search + Filter */}
      <div className="mb-6 flex flex-col md:flex-row gap-5 items-center justify-between relative z-20">
        <div className="w-full md:w-auto text-left">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            {getFilterTitle()}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {isDiscoveryHome
              ? 'Tuyển tập truyện tranh theo thể loại & cập nhật mới nhất mỗi ngày'
              : 'Danh sách đầy đủ sắp xếp theo thời gian cập nhật mới nhất'}
          </p>
        </div>

        <div className="flex w-full md:w-auto items-center gap-3 flex-col sm:flex-row">
          <form onSubmit={handleSearch} className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Tìm kiếm truyện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Tìm kiếm truyện tranh"
              className="w-full bg-zinc-900 border border-white/10 rounded-full py-2.5 pl-10 pr-9 text-sm text-zinc-200 focus:outline-none focus:border-teal-400/60 transition-colors placeholder:text-zinc-600"
            />
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  if (q) setSearchParams({});
                }}
                aria-label="Xóa tìm kiếm truyện"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
              >
                <FiX size={14} />
              </button>
            )}
          </form>

          <div className="relative w-full sm:w-auto" ref={filterRef}>
            <button
              type="button"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-900 border border-white/10 hover:border-teal-400/50 rounded-full py-2.5 px-5 text-zinc-300 transition-colors"
            >
              <FiFilter size={16} className={activeFilter.type === 'genre' ? 'text-teal-400' : 'text-zinc-500'} />
              <span className="text-sm font-medium">
                {activeFilter.type === 'genre'
                  ? `${genres.find((g) => g.slug === activeFilter.value)?.name || 'Đã lọc'}`
                  : 'Tất Cả Thể Loại'}
              </span>
            </button>

            {showFilterDropdown && (
              <div className="absolute top-full mt-3 right-0 w-full sm:w-[480px] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="flex justify-between items-center p-5 border-b border-white/5">
                  <h3 className="font-semibold text-white tracking-tight">Thể Loại ({genres.length})</h3>
                  {(activeFilter.type !== 'latest' || sortParam === 'latest') && (
                    <button
                      type="button"
                      onClick={clearFilter}
                      className="text-xs flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                    >
                      <FiX size={14} /> Về Trang Chủ
                    </button>
                  )}
                </div>
                <div className="max-h-[360px] overflow-y-auto p-3 grid grid-cols-2 gap-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {genres.map((genre) => (
                    <button
                      type="button"
                      key={genre._id}
                      onClick={() => handleGenreClick(genre.slug)}
                      className={`text-left px-4 py-2.5 rounded-xl text-sm transition-colors truncate ${
                        activeFilter.value === genre.slug
                          ? 'bg-teal-500 text-black font-semibold'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                      }`}
                      title={genre.name}
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Genre Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-white/5 scrollbar-hide">
        <Link
          to="/comics"
          className={`shrink-0 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors border ${
            isDiscoveryHome
              ? 'bg-teal-500 text-black border-teal-400 font-semibold'
              : 'bg-white/5 text-zinc-300 border-white/10 hover:border-white/30 hover:text-white'
          }`}
        >
          Khám Phá
        </Link>
        {QUICK_GENRES.map((g) => {
          const isActive =
            (g.slug === '__latest__' && sortParam === 'latest' && !genreParam && !q) ||
            genreParam === g.slug;
          return (
            <Link
              key={g.slug}
              to={g.to}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors border ${
                isActive
                  ? 'bg-teal-500 text-black border-teal-400 font-semibold'
                  : 'bg-white/5 text-zinc-300 border-white/10 hover:border-teal-400/40 hover:text-white'
              }`}
            >
              {g.label}
            </Link>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="bg-dark-200 rounded-xl overflow-hidden border border-white/5 animate-pulse">
              <div className="aspect-[2/3] w-full bg-zinc-800/60" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 bg-zinc-800/60 rounded w-full" />
                <div className="h-3 bg-zinc-800/40 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 relative z-10 gap-4 bg-dark-200/40 rounded-2xl border border-white/5">
          <p className="text-zinc-300 text-lg">{error}</p>
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-500 text-black rounded-full font-semibold text-sm hover:bg-teal-400 transition-colors"
          >
            <FiRefreshCw size={15} />
            <span>Thử lại</span>
          </button>
        </div>
      ) : comics.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-36 relative z-10 gap-4">
          <FiBookOpen size={48} strokeWidth={1} className="text-zinc-600" />
          <p className="text-zinc-500 text-lg">Không tìm thấy truyện nào.</p>
        </div>
      ) : isDiscoveryHome ? (
        /* ─── DISCOVERY HUB VIEW (/comics) ─── */
        <>
          {/* Hero Cinematic */}
          {comics.length >= 3 && (
            <div className="relative w-full h-[460px] md:h-[540px] rounded-2xl md:rounded-[2rem] overflow-hidden mb-10 bg-[#050505] border border-white/10">
              {comics.slice(0, 3).map((comic, idx) => {
                const isActive = idx === heroIndex;
                const imgUrl = resolveComicImageUrl(comic.thumb_url);
                return (
                  <div
                    key={`hero-${comic.slug || comic.id || idx}`}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                      isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    <div className="absolute inset-0">
                      <img
                        src={imgUrl}
                        alt={comic.name}
                        className="w-full h-full object-cover opacity-35 object-top"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = FALLBACK_POSTER;
                        }}
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />

                    <div className="relative h-full flex flex-col justify-end p-6 sm:p-10 md:p-14 z-10 pb-14">
                      <div className="max-w-3xl">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="w-8 h-[1px] bg-teal-400" />
                          <span className="text-teal-300 text-xs uppercase tracking-[0.2em] font-semibold">
                            Nổi Bật Hôm Nay
                          </span>
                        </div>
                        <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-[1.08] tracking-tight line-clamp-2">
                          {comic.name}
                        </h2>
                        <p className="text-zinc-300 text-sm md:text-base mb-7 max-w-xl font-light">
                          Mới nhất: Chương {comic.chaptersLatest?.[0]?.chapter_name || '?'} • {formatTimeAgo(comic.updatedAt)}
                        </p>
                        <Link
                          to={`/comics/${comic.slug}`}
                          className="inline-flex items-center justify-center bg-teal-500 hover:bg-teal-400 text-black px-8 py-3.5 rounded-full font-bold transition-transform hover:scale-[1.02] text-sm tracking-wide shadow-lg shadow-teal-500/20"
                        >
                          Đọc Ngay
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="absolute bottom-6 right-6 md:bottom-10 md:right-12 z-20 flex gap-3">
                {[0, 1, 2].map((idx) => (
                  <button
                    type="button"
                    key={`dot-${idx}`}
                    onClick={() => setHeroIndex(idx)}
                    className={`h-[3px] rounded-full transition-all duration-500 ease-out ${
                      heroIndex === idx ? 'w-12 bg-teal-400' : 'w-6 bg-white/25 hover:bg-white/45'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Đọc Tiếp Gần Đây (nếu đã đăng nhập và có lịch sử) */}
          {isAuthenticated && comicHistory.length > 0 && (
            <section className="py-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                  <span className="w-1 h-7 bg-gradient-to-b from-teal-400 to-emerald-400 rounded-full" />
                  <span>Đọc Tiếp Gần Đây</span>
                </h2>
                <Link
                  to="/history"
                  className="text-sm font-medium text-gray-400 hover:text-teal-400 transition-colors"
                >
                  Tất cả lịch sử →
                </Link>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-3 custom-scrollbar-horizontal">
                {comicHistory.slice(0, 8).map((item) => (
                  <Link
                    key={item.slug}
                    to={`/comics/${item.slug}/chapter/${item.chapterId}`}
                    className="flex-none w-64 bg-dark-200 border border-white/5 hover:border-teal-500/40 rounded-xl p-3 flex items-center gap-3 group transition-all shadow-md"
                  >
                    <img
                      src={resolveComicImageUrl(item.poster)}
                      alt={item.name}
                      className="w-14 h-20 object-cover rounded-lg shrink-0"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = FALLBACK_POSTER;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-white group-hover:text-teal-400 line-clamp-2 transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-xs text-teal-400 mt-1 flex items-center gap-1 font-medium">
                        <FiPlay size={11} /> Chương {item.chapterName}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Curated Genre Carousels */}
          <ComicSection
            title="Mới Cập Nhật Hôm Nay"
            comics={comics.slice(0, 14)}
            loading={loading}
            viewAllLink="/comics?sort=latest"
            resolveImageUrl={resolveComicImageUrl}
            onPrefetch={prefetchComicDetail}
          />
          <ComicSection
            title="Manhwa Hàn Quốc Nổi Bật"
            comics={curatedSections.manhwa}
            loading={curatedLoading}
            viewAllLink="/comics?genre=manhwa"
            resolveImageUrl={resolveComicImageUrl}
            onPrefetch={prefetchComicDetail}
          />
          <ComicSection
            title="Action & Chiến Đấu"
            comics={curatedSections.action}
            loading={curatedLoading}
            viewAllLink="/comics?genre=action"
            resolveImageUrl={resolveComicImageUrl}
            onPrefetch={prefetchComicDetail}
          />
          <ComicSection
            title="Fantasy & Chuyển Sinh"
            comics={curatedSections.fantasy}
            loading={curatedLoading}
            viewAllLink="/comics?genre=fantasy"
            resolveImageUrl={resolveComicImageUrl}
            onPrefetch={prefetchComicDetail}
          />
          <ComicSection
            title="Manhua & Tiên Hiệp"
            comics={curatedSections.manhua}
            loading={curatedLoading}
            viewAllLink="/comics?genre=manhua"
            resolveImageUrl={resolveComicImageUrl}
            onPrefetch={prefetchComicDetail}
          />
        </>
      ) : (
        /* ─── FULL PAGINATED GRID VIEW (?sort=latest, ?genre=, ?q=, or page > 1) ─── */
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {comics.map((comic, idx) => (
              <Link
                to={`/comics/${comic.slug}`}
                key={`${comic._id || comic.slug}-${idx}`}
                className="group flex flex-col bg-dark-200 rounded-xl overflow-hidden border border-white/5 hover:border-teal-500/40 transition-all shadow-lg"
                onMouseEnter={() => prefetchComicDetail(comic.slug)}
              >
                <div className="aspect-[2/3] w-full overflow-hidden bg-zinc-900 relative">
                  <img
                    src={resolveComicImageUrl(comic.thumb_url)}
                    alt={comic.name}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-all duration-500"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_POSTER;
                    }}
                  />
                  {comic.chaptersLatest?.[0] && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-black/75 backdrop-blur-md text-teal-300 text-[10px] font-semibold tracking-wide rounded border border-teal-500/20">
                      Ch. {comic.chaptersLatest[0].chapter_name}
                    </div>
                  )}
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between">
                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-teal-400 transition-colors line-clamp-2 leading-snug">
                    {comic.name}
                  </h3>
                  <div className="mt-2 flex items-center text-[11px] text-zinc-500">
                    <FiClock className="mr-1.5 opacity-70" size={11} />
                    <span>{formatTimeAgo(comic.updatedAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {renderPagination()}
        </>
      )}
    </div>
  );
}

export default ComicHomePage;
