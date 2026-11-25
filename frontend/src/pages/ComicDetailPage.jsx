import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowDown, FiArrowUp, FiBookOpen, FiHeart, FiPlay, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { comicApi } from '../services/comicApi';
import useAuthStore from '../stores/authStore';
import useComicHistoryStore from '../stores/comicHistoryStore';
import useFavoritesStore from '../stores/favoritesStore';
import { FALLBACK_POSTER, stripHtmlAndDecode } from '../utils/textUtils';
import useDocumentTitle from '../utils/useDocumentTitle';

const getChapterIdOrName = (chap) =>
  chap?.chapter_api_data?.split('/').pop() || chap?.chapter_name;

const STATUS_LABELS = {
  ongoing: 'Đang tiến hành',
  completed: 'Hoàn thành',
  coming_soon: 'Sắp ra mắt',
};

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function resolveComicImageUrl(url) {
  if (!url) return FALLBACK_POSTER;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/api/')) return `${API_BASE}${url.slice(4)}`;
  if (url.startsWith('/')) return url;
  return `https://img.otruyenapi.com/uploads/comics/${url}`;
}

function ComicDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [comic, setComic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [chapterSearch, setChapterSearch] = useState('');
  const [chapterSortOrder, setChapterSortOrder] = useState('asc'); // 'asc' | 'desc'

  const cleanDescription = stripHtmlAndDecode(comic?.content || comic?.description);

  useDocumentTitle(
    comic?.name ? `Truyện ${comic.name}` : 'Chi Tiết Truyện Tranh',
    cleanDescription ? cleanDescription.slice(0, 160) : undefined
  );

  const { isAuthenticated } = useAuthStore();
  const favoritePendingRef = useRef(false);
  const { comicHistory, fetchComicHistory } = useComicHistoryStore();
  const {
    isComicFavorited,
    fetchFavoriteComics,
    addFavoriteComic,
    removeFavoriteComic,
  } = useFavoritesStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavoriteComics();
      fetchComicHistory();
    }
  }, [isAuthenticated, fetchFavoriteComics, fetchComicHistory]);

  useEffect(() => {
    let isCancelled = false;
    const fetchComicDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        setChapterSearch('');
        const data = await comicApi.getComicDetails(slug);
        if (isCancelled) return;
        if (data.status === 'success') {
          setComic(data.data);
        } else {
          setError('Không tìm thấy thông tin truyện');
        }
      } catch (err) {
        if (!isCancelled) {
          setError('Không thể tải thông tin truyện');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    if (slug) fetchComicDetails();
    return () => {
      isCancelled = true;
    };
  }, [slug, retryCount]);

  const isFavorited = comic
    ? isComicFavorited(comic.slug) || isComicFavorited(comic._id)
    : false;

  const handleToggleFavorite = async () => {
    // Chặn bấm liên tiếp khi request trước chưa xong (tránh toast trùng / gửi 2 lần)
    if (favoritePendingRef.current) return;
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để lưu truyện');
      navigate('/login');
      return;
    }

    const comicId = comic.slug || comic._id;
    favoritePendingRef.current = true;
    try {

    if (isFavorited) {
      const existingFavoriteId = isComicFavorited(comic.slug)
        ? comic.slug
        : isComicFavorited(comic._id)
          ? comic._id
          : comicId;
      const result = await removeFavoriteComic(existingFavoriteId);
      if (result.success) {
        toast.success('Đã bỏ theo dõi truyện');
      } else {
        toast.error(result.message);
      }
    } else {
      const result = await addFavoriteComic({
        comicId,
        title: comic.name,
        poster: comic.thumb_url,
      });
      if (result.success) {
        toast.success('Đã lưu truyện vào tủ sách');
      } else {
        toast.error(result.message);
      }
    }
    } finally {
      favoritePendingRef.current = false;
    }
  };

  const filteredChapters = useMemo(() => {
    const chapters = comic?.chapters || [];
    const ordered = chapterSortOrder === 'desc' ? [...chapters].reverse() : chapters;
    const query = chapterSearch.trim().toLowerCase();
    if (!query) return ordered;
    return ordered.filter(
      (chap) =>
        String(chap.chapter_name || '').toLowerCase().includes(query) ||
        String(chap.chapter_title || '').toLowerCase().includes(query)
    );
  }, [comic?.chapters, chapterSortOrder, chapterSearch]);

  if (loading) {
    return (
      <div className="pt-6 px-4 sm:px-8 lg:px-12 max-w-[1200px] mx-auto min-h-screen text-white pb-24 font-sans">
        <div className="flex flex-col md:flex-row gap-12 md:gap-16 mb-24 animate-pulse">
          {/* Skeleton poster */}
          <div className="w-full md:w-[320px] flex-shrink-0">
            <div className="aspect-[2/3] w-full bg-zinc-800/60 rounded-lg" />
          </div>
          {/* Skeleton info */}
          <div className="flex-1 flex flex-col pt-4 gap-4">
            <div className="h-3 bg-zinc-800/40 rounded w-24 mb-2" />
            <div className="h-12 bg-zinc-800/60 rounded w-3/4" />
            <div className="h-6 bg-zinc-800/40 rounded w-1/2 mb-4" />
            <div className="h-3 bg-zinc-800/30 rounded w-full" />
            <div className="h-3 bg-zinc-800/30 rounded w-full" />
            <div className="h-3 bg-zinc-800/30 rounded w-4/5" />
            <div className="h-3 bg-zinc-800/20 rounded w-2/3 mt-2" />
            <div className="flex gap-4 mt-8">
              <div className="h-12 bg-zinc-800/50 rounded-full w-36" />
              <div className="h-12 bg-zinc-800/30 rounded-full w-28" />
            </div>
          </div>
        </div>
        {/* Skeleton chapters */}
        <div className="border-t border-white/10 pt-16">
          <div className="h-6 bg-zinc-800/50 rounded w-32 mb-8 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-14 bg-zinc-800/30 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !comic) {
    return (
      <div className="pt-6 px-6 max-w-5xl mx-auto min-h-[70vh] text-white flex flex-col justify-center items-center gap-4">
        <p className="text-zinc-300 text-lg">{error || 'Không tìm thấy truyện'}</p>
        {error && (
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-full font-semibold text-sm hover:bg-zinc-200 transition-colors"
          >
            <FiRefreshCw size={15} />
            <span>Thử lại</span>
          </button>
        )}
      </div>
    );
  }

  const chapters = comic.chapters || [];
  const firstChapter = chapters[0];
  const latestChapter = chapters[chapters.length - 1];
  const readingHistoryItem = comicHistory.find((item) => item.slug === comic.slug);
  const authorText = comic.author?.filter(Boolean).join(', ') || 'Đang cập nhật';
  const statusText = STATUS_LABELS[comic.status] || comic.status || 'Đang cập nhật';

  return (
    <div className="pt-6 px-4 sm:px-8 lg:px-12 max-w-[1200px] mx-auto min-h-screen text-white pb-24 font-sans">

      {/* Editorial Split Header */}
      <div className="flex flex-col md:flex-row gap-12 md:gap-16 mb-24">

        {/* Left: Poster */}
        <div className="w-full md:w-[320px] flex-shrink-0">
          <div className="aspect-[2/3] w-full bg-zinc-900 rounded-lg overflow-hidden relative">
            <img
              src={resolveComicImageUrl(comic.thumb_url)}
              alt={comic.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = FALLBACK_POSTER;
              }}
            />
            {/* Subtle inner border for premium feel */}
            <div className="absolute inset-0 border border-white/10 rounded-lg pointer-events-none"></div>
          </div>
        </div>

        {/* Right: Info */}
        <div className="flex-1 flex flex-col pt-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-[1px] bg-white/40"></span>
            <span className="text-zinc-400 text-xs uppercase tracking-[0.2em] font-medium">
              {statusText}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-white mb-2 leading-[1.1]">
            {comic.name}
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 font-light tracking-wide mb-8">
            {comic.origin_name}
          </p>

          <div className="flex flex-col gap-4 mb-8 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-zinc-500 w-24 shrink-0">Tác giả</span>
              <span className="text-zinc-200">{authorText}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-zinc-500 w-24 shrink-0">Thể loại</span>
              <div className="flex flex-wrap gap-2">
                {comic.category && comic.category.length > 0 ? (
                  comic.category.map((cat, idx) => (
                    <Link
                      key={cat.id || cat.slug || idx}
                      to={`/comics?genre=${encodeURIComponent(cat.slug)}`}
                      className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/30 rounded-full text-xs text-zinc-200 hover:text-white transition-colors"
                    >
                      {cat.name}
                    </Link>
                  ))
                ) : (
                  <span className="text-zinc-400">Đang cập nhật</span>
                )}
              </div>
            </div>
          </div>

          <div className="mb-12 max-w-2xl">
            <p className="text-zinc-400 leading-relaxed font-light text-base md:text-lg whitespace-pre-line">
              {cleanDescription || 'Đang cập nhật mô tả...'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 sm:gap-4 mt-auto">
            {readingHistoryItem?.chapterId && (
              <Link
                to={`/comics/${comic.slug}/chapter/${readingHistoryItem.chapterId}`}
                className="px-7 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-full font-semibold transition-transform hover:scale-[1.02] flex items-center gap-2 text-sm tracking-wide shadow-lg shadow-primary-600/30"
              >
                <FiPlay size={16} className="fill-current" />
                <span>Đọc tiếp Ch. {readingHistoryItem.chapterName}</span>
              </Link>
            )}

            {chapters.length > 0 && (
              <>
                <Link
                  to={`/comics/${comic.slug}/chapter/${getChapterIdOrName(firstChapter)}`}
                  className="px-7 py-4 bg-white text-black rounded-full font-semibold transition-transform hover:scale-[1.02] flex items-center gap-2 text-sm tracking-wide"
                >
                  <FiBookOpen size={16} />
                  <span>Đọc Từ Đầu</span>
                </Link>
                <Link
                  to={`/comics/${comic.slug}/chapter/${getChapterIdOrName(latestChapter)}`}
                  className="px-7 py-4 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/20 rounded-full font-semibold transition-transform hover:scale-[1.02] flex items-center gap-2 text-sm tracking-wide"
                >
                  <span>Đọc Mới Nhất</span>
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`px-7 py-4 rounded-full font-semibold transition-transform hover:scale-[1.02] flex items-center gap-2 text-sm tracking-wide border ${
                isFavorited
                  ? 'bg-primary-600/20 text-primary-300 border-primary-500/50'
                  : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/30'
              }`}
            >
              <FiHeart className={isFavorited ? 'fill-current text-primary-400' : ''} />
              {isFavorited ? 'Đã lưu' : 'Lưu truyện'}
            </button>
          </div>
        </div>
      </div>

      {/* Chapters Section */}
      <div className="border-t border-white/10 pt-12 sm:pt-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-medium tracking-tight">Danh sách chương</h2>
            <span className="text-sm text-zinc-500 font-mono">{chapters.length} chương</span>
          </div>

          {chapters.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Quick Chapter Search */}
              <div className="relative w-full sm:w-52">
                <FiSearch
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                />
                <input
                  type="text"
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  placeholder="Tìm số chương..."
                  aria-label="Tìm số chương"
                  className="w-full pl-9 pr-8 py-2 bg-[#0A0A0A] border border-white/10 rounded-full text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
                />
                {chapterSearch && (
                  <button
                    type="button"
                    onClick={() => setChapterSearch('')}
                    aria-label="Xóa tìm kiếm chương"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>

              {/* Reverse Sort Toggle */}
              <button
                type="button"
                onClick={() =>
                  setChapterSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                }
                className="px-4 py-2 bg-[#0A0A0A] hover:bg-zinc-900 border border-white/10 hover:border-white/30 rounded-full text-xs sm:text-sm text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                {chapterSortOrder === 'desc' ? (
                  <>
                    <FiArrowDown size={14} />
                    <span>Mới nhất</span>
                  </>
                ) : (
                  <>
                    <FiArrowUp size={14} />
                    <span>Cũ nhất</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {chapters.length > 0 ? (
          filteredChapters.length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredChapters.map((chap, index) => {
                  const chapIdOrName = getChapterIdOrName(chap);

                  return (
                    <Link
                      key={chapIdOrName || index}
                      to={`/comics/${comic.slug}/chapter/${chapIdOrName}`}
                      className="group flex items-center justify-between bg-[#0A0A0A] hover:bg-zinc-900 border border-white/5 hover:border-white/20 rounded-lg p-5 transition-colors"
                    >
                      <span className="font-medium text-zinc-400 group-hover:text-white transition-colors text-sm truncate pr-2">
                        Chương {chap.chapter_name}
                      </span>
                      <span className="text-zinc-600 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transform duration-300 shrink-0">
                        →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center border border-white/5 border-dashed rounded-xl gap-3">
              <p className="text-zinc-500 text-sm">
                Không tìm thấy chương nào khớp với &quot;{chapterSearch}&quot;
              </p>
              <button
                type="button"
                onClick={() => setChapterSearch('')}
                className="text-xs text-white underline hover:text-zinc-300"
              >
                Hiện tất cả chương
              </button>
            </div>
          )
        ) : (
          <div className="py-20 flex justify-center border border-white/5 border-dashed rounded-xl">
            <p className="text-zinc-500">Hiện chưa có chương nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComicDetailPage;
