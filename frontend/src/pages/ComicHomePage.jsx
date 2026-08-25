import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiClock, FiSearch, FiFilter, FiChevronLeft, FiChevronRight, FiX, FiBookOpen } from 'react-icons/fi';
import { comicApi } from '../services/comicApi';
import { formatTimeAgo } from '../utils/formatTime';
import useDocumentTitle from '../utils/useDocumentTitle';

// Prefetch cache đơn giản - lưu các request đã được prefetch
const prefetchedSlugs = new Set();

function prefetchComicDetail(slug) {
  if (!slug || prefetchedSlugs.has(slug)) return;
  prefetchedSlugs.add(slug);
  // Gọi API ngầm, backend sẽ cache kết quả → khi user click sẽ nhanh hơn
  comicApi.getComicDetails(slug).catch(() => {
    prefetchedSlugs.delete(slug); // Nếu lỗi thì xóa để có thể thử lại
  });
}

function ComicHomePage() {
  useDocumentTitle('Kho Truyện Tranh Online Hay & Mới Nhất');

  const [comics, setComics] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Lấy query từ URL
  const queryParams = new URLSearchParams(location.search);
  const q = queryParams.get('q') || '';

  const [activeFilter, setActiveFilter] = useState({ type: q ? 'search' : 'latest', value: q || null });
  const [searchQuery, setSearchQuery] = useState(q);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef(null);
  
  // Trạng thái hero section
  const [heroIndex, setHeroIndex] = useState(0);

  // Tự động chuyển slide hero
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Fetch thể loại một lần
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const data = await comicApi.getGenres();
        if (data?.data?.items) {
          setGenres(data.data.items);
        }
      } catch (err) {
        console.error('Lỗi khi tải thể loại:', err);
      }
    };
    fetchGenres();
  }, []);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterRef]);

  // Dùng useCallback để tránh phải dùng eslint-disable
  const fetchComics = useCallback(async (currentPage) => {
    try {
      setLoading(true);
      let data = null;

      if (activeFilter.type === 'latest') {
        data = await comicApi.getLatestComics(currentPage);
      } else if (activeFilter.type === 'genre') {
        data = await comicApi.getComicsByGenre(activeFilter.value, currentPage);
      } else if (activeFilter.type === 'search') {
        data = await comicApi.searchComics(activeFilter.value);
      }

      if (data && data.status === 'success') {
        const items = data.data.items || [];
        setComics(items);

        if (activeFilter.type !== 'search') {
          const pagination = data.data.pagination || data.data.params?.pagination;
          if (pagination) {
            setTotalPages(Math.ceil(pagination.totalItems / pagination.totalItemsPerPage));
          } else {
            setTotalPages(1);
          }
        } else {
          setTotalPages(1);
        }
        setPage(currentPage);
      } else {
        setComics([]);
        setTotalPages(1);
      }
      setError(null);
    } catch (err) {
      setError('Không thể tải dữ liệu truyện tranh');
    } finally {
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchComics(page);
  }, [activeFilter, page, fetchComics]);

  // Lắng nghe sự thay đổi của query parameters (khi user tìm kiếm từ Navbar)
  useEffect(() => {
    const currentQ = new URLSearchParams(location.search).get('q') || '';
    if (currentQ !== searchQuery) {
      setSearchQuery(currentQ);
      setPage(1);
      if (currentQ) {
        setActiveFilter({ type: 'search', value: currentQ });
      } else {
        // Nếu xóa q khỏi URL, quay lại latest (nếu không phải đang lọc thể loại)
        setActiveFilter(prev => prev.type === 'search' ? { type: 'latest', value: null } : prev);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (!searchQuery.trim()) {
      setActiveFilter({ type: 'latest', value: null });
      navigate('/comics');
      return;
    }
    setActiveFilter({ type: 'search', value: searchQuery.trim() });
    navigate(`/comics?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleGenreClick = (slug) => {
    setSearchQuery('');
    setPage(1);
    setActiveFilter({ type: 'genre', value: slug });
    setShowFilterDropdown(false);
    navigate('/comics'); // Xoá query string
  };

  const clearFilter = () => {
    setSearchQuery('');
    setPage(1);
    setActiveFilter({ type: 'latest', value: null });
    setShowFilterDropdown(false);
    navigate('/comics');
  };

  // Tên tiêu đề filter hiện tại
  const getFilterTitle = () => {
    if (activeFilter.type === 'latest') return 'Cập Nhật Mới Nhất';
    if (activeFilter.type === 'search') return `Kết quả cho "${activeFilter.value}"`;
    return genres.find(g => g.slug === activeFilter.value)?.name || '';
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
      <div className="flex items-center justify-center gap-2 mt-16 flex-wrap font-medium">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="p-3 rounded-lg border border-white/10 hover:border-white/30 text-white disabled:opacity-30 disabled:hover:border-white/10 transition-colors"
          aria-label="Trang trước"
        >
          <FiChevronLeft size={18} />
        </button>
        
        {startPage > 1 && (
          <>
            <button onClick={() => setPage(1)} className="px-4 py-2 rounded-lg border border-white/10 hover:border-white/30 text-white transition-colors">1</button>
            {startPage > 2 && <span className="text-zinc-600">...</span>}
          </>
        )}

        {pages.map(p => (
          <button 
            key={p} 
            onClick={() => setPage(p)}
            className={`px-4 py-2 rounded-lg border transition-colors ${page === p ? 'bg-white text-black border-white' : 'border-white/10 hover:border-white/30 text-zinc-400 hover:text-white'}`}
          >
            {p}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-zinc-600">...</span>}
            <button onClick={() => setPage(totalPages)} className="px-4 py-2 rounded-lg border border-white/10 hover:border-white/30 text-white transition-colors">{totalPages}</button>
          </>
        )}

        <button 
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="p-3 rounded-lg border border-white/10 hover:border-white/30 text-white disabled:opacity-30 disabled:hover:border-white/10 transition-colors"
          aria-label="Trang sau"
        >
          <FiChevronRight size={18} />
        </button>
      </div>
    );
  };

  return (
    <div className="pt-24 px-4 sm:px-8 lg:px-12 max-w-[1600px] mx-auto min-h-screen text-white pb-24 font-sans">
      
      {/* Thanh Lọc và Tìm Kiếm */}
      <div className="mb-12 flex flex-col md:flex-row gap-6 items-center justify-between relative z-20 border-b border-white/5 pb-8">
        
        {/* Tiêu đề ngữ cảnh */}
        <div className="w-full md:w-auto text-left">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-white">
            {getFilterTitle()}
          </h2>
        </div>

        <div className="flex w-full md:w-auto items-center gap-4 flex-col sm:flex-row">
          {/* Tìm kiếm */}
          <form onSubmit={handleSearch} className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="Tìm kiếm truyện..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-full py-2.5 px-10 text-sm text-zinc-200 focus:outline-none focus:border-white/40 transition-colors placeholder:text-zinc-600"
            />
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          </form>

          {/* Dropdown Lọc */}
          <div className="relative w-full sm:w-auto" ref={filterRef}>
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-900 border border-white/10 hover:border-white/30 rounded-full py-2.5 px-6 text-zinc-300 transition-colors"
            >
              <FiFilter size={16} className={activeFilter.type === 'genre' ? 'text-white' : 'text-zinc-500'} />
              <span className="text-sm font-medium">
                {activeFilter.type === 'genre' 
                  ? `${genres.find(g => g.slug === activeFilter.value)?.name || 'Đã lọc'}` 
                  : 'Lọc Thể Loại'}
              </span>
            </button>

            {/* Dropdown Menu */}
            {showFilterDropdown && (
              <div className="absolute top-full mt-3 right-0 w-full sm:w-[480px] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="flex justify-between items-center p-5 border-b border-white/5">
                  <h3 className="font-semibold text-white tracking-tight">Thể Loại</h3>
                  {activeFilter.type !== 'latest' && (
                    <button onClick={clearFilter} className="text-xs flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors">
                      <FiX size={14} /> Xóa Bộ Lọc
                    </button>
                  )}
                </div>
                <div className="max-h-[360px] overflow-y-auto p-3 grid grid-cols-2 gap-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {genres.map(genre => (
                    <button 
                      key={genre._id}
                      onClick={() => handleGenreClick(genre.slug)}
                      className={`text-left px-4 py-3 rounded-xl text-sm transition-colors truncate ${activeFilter.value === genre.slug ? 'bg-white text-black font-medium' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
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

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="flex flex-col animate-pulse">
              <div className="aspect-[2/3] w-full bg-zinc-800/60 rounded-lg mb-4" />
              <div className="h-3.5 bg-zinc-800/60 rounded w-full mb-2" />
              <div className="h-3.5 bg-zinc-800/40 rounded w-3/4 mb-3" />
              <div className="h-3 bg-zinc-800/30 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex justify-center py-20 relative z-10">
          <p className="text-zinc-400">{error}</p>
        </div>
      ) : comics.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-40 relative z-10 gap-4">
          <FiBookOpen size={48} strokeWidth={1} className="text-zinc-600" />
          <p className="text-zinc-500 text-lg">Không tìm thấy truyện nào.</p>
        </div>
      ) : (
        <>
          {/* Hero Cinematic - Chỉ hiện khi không lọc */}
          {activeFilter.type === 'latest' && !searchQuery && comics.length >= 3 && (
            <div className="relative w-full h-[600px] rounded-none md:rounded-[2rem] overflow-hidden mb-24 bg-[#050505]">
              {comics.slice(0, 3).map((comic, idx) => {
                const isActive = idx === heroIndex;
                const imgUrl = comic.thumb_url?.startsWith('http') ? comic.thumb_url : `https://img.otruyenapi.com/uploads/comics/${comic.thumb_url}`;
                return (
                  <div 
                    key={`hero-${comic.slug || comic.id || idx}`} 
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                  >
                    {/* Ảnh nền tối và cinematic */}
                    <div className="absolute inset-0">
                      <img src={imgUrl} alt="nền" className="w-full h-full object-cover opacity-30 object-top" />
                    </div>
                    {/* Gradient đổ bóng */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                    
                    {/* Nội dung */}
                    <div className="relative h-full flex flex-col justify-end p-8 md:p-16 lg:p-24 z-10 pb-20">
                      <div className="max-w-4xl">
                        <div className="flex items-center gap-3 mb-6">
                          <span className="w-8 h-[1px] bg-white/40"></span>
                          <span className="text-zinc-300 text-xs uppercase tracking-[0.2em] font-medium">
                            Nổi Bật
                          </span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-medium text-white mb-6 leading-[1.05] tracking-tight line-clamp-2">
                          {comic.name}
                        </h1>
                        <p className="text-zinc-400 text-sm md:text-lg mb-10 max-w-2xl leading-relaxed font-light line-clamp-2">
                          Mới nhất: Chương {comic.chaptersLatest?.[0]?.chapter_name || '?'}
                        </p>
                        <Link 
                          to={`/comics/${comic.slug}`} 
                          className="inline-flex items-center justify-center bg-white text-black px-8 py-4 rounded-full font-semibold transition-transform hover:scale-[1.02] text-sm tracking-wide"
                        >
                          Đọc Ngay
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Điều khiển slide */}
              <div className="absolute bottom-8 right-8 md:bottom-12 md:right-16 z-20 flex gap-3">
                {[0, 1, 2].map((idx) => (
                  <button 
                    key={`dot-${idx}`}
                    onClick={() => setHeroIndex(idx)}
                    className={`h-[2px] transition-all duration-500 ease-out ${heroIndex === idx ? 'w-12 bg-white' : 'w-6 bg-white/20 hover:bg-white/40'}`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Lưới Truyện */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
            {comics.map((comic, idx) => (
              <Link 
                to={`/comics/${comic.slug}`} 
                key={`${comic._id || comic.slug}-${idx}`}
                className="group flex flex-col"
                onMouseEnter={() => prefetchComicDetail(comic.slug)}
              >
                {/* Hình ảnh */}
                <div className="aspect-[2/3] w-full overflow-hidden bg-zinc-900 rounded-lg relative mb-4">
                  <img 
                    src={comic.thumb_url?.startsWith('http') ? comic.thumb_url : `https://img.otruyenapi.com/uploads/comics/${comic.thumb_url}`} 
                    alt={comic.name} 
                    className="w-full h-full object-cover transform group-hover:scale-[1.04] group-hover:opacity-90 transition-all duration-700 ease-out"
                    loading="lazy"
                    decoding="async"
                  />
                  {comic.chaptersLatest?.[0] && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium tracking-wide rounded">
                      Ch. {comic.chaptersLatest[0].chapter_name}
                    </div>
                  )}
                </div>

                {/* Thông tin */}
                <div className="flex-1 flex flex-col pr-2">
                  <h3 className="text-sm md:text-base font-medium text-zinc-200 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                    {comic.name}
                  </h3>
                  <div className="mt-2 flex items-center text-[11px] text-zinc-500">
                    <FiClock className="mr-1.5 opacity-70" size={12} />
                    <span>{formatTimeAgo(comic.updatedAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Phân trang */}
          {renderPagination()}
        </>
      )}
    </div>
  );
}

export default ComicHomePage;
