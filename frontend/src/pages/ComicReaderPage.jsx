import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiList, FiHome, FiRefreshCw } from 'react-icons/fi';
import { comicApi } from '../services/comicApi';
import useAuthStore from '../stores/authStore';
import useComicHistoryStore from '../stores/comicHistoryStore';
import useDataSaverStore from '../stores/dataSaverStore';
import useDocumentTitle from '../utils/useDocumentTitle';

const extractChapterId = (chapter) => {
  if (!chapter) return null;
  return chapter.chapter_api_data?.split('/').pop() || chapter.chapter_name;
};

function ComicReaderPage() {
  const { slug, chapterId } = useParams();
  const navigate = useNavigate();
  const [chapterData, setChapterData] = useState(null);
  const [comicData, setComicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useDocumentTitle(
    chapterData?.item?.comic_name
      ? `Đọc Truyện ${chapterData.item.comic_name} - Chương ${chapterData.item.chapter_name}`
      : 'Đang Đọc Truyện'
  );
  
  // Toolbar & scroll progress state
  const [showToolbar, setShowToolbar] = useState(true);
  const [showChapterList, setShowChapterList] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [failedImages, setFailedImages] = useState({});
  const [retryTokens, setRetryTokens] = useState({});
  const [loadedImages, setLoadedImages] = useState({});
  const [chapterRetry, setChapterRetry] = useState(0);
  const [detailRetry, setDetailRetry] = useState(0);
  const [detailError, setDetailError] = useState(false);
  const lastScrollY = useRef(0);
  
  const activeChapterRef = useRef(null);
  const chapterListRef = useRef(null);
  const listBtnRef = useRef(null);

  const { isAuthenticated } = useAuthStore();
  const syncComicHistory = useComicHistoryStore((s) => s.syncComicHistory);
  const dataSaver = useDataSaverStore((state) => state.enabled);
  const lastSyncedRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && comicData && chapterData) {
      const syncKey = `${comicData.slug}-${chapterId}`;
      if (lastSyncedRef.current !== syncKey) {
        syncComicHistory({
          slug: comicData.slug,
          name: comicData.name,
          chapterName: chapterData.item.chapter_name,
          chapterId: chapterId,
          poster: comicData.thumb_url
        });
        lastSyncedRef.current = syncKey;
      }
    }
  }, [isAuthenticated, comicData, chapterData, chapterId, syncComicHistory]);

  // Click outside to close chapter list
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        chapterListRef.current && 
        !chapterListRef.current.contains(event.target) &&
        listBtnRef.current &&
        !listBtnRef.current.contains(event.target)
      ) {
        setShowChapterList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showChapterList && activeChapterRef.current) {
      activeChapterRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showChapterList]);

  // Smart hide toolbar & track reading progress on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (currentScrollY / docHeight) * 100)));
      }

      if (currentScrollY > lastScrollY.current && currentScrollY > 150) {
        setShowToolbar(false);
        setShowChapterList(false);
      } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
        setShowToolbar(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch thông tin truyện theo slug (chỉ gọi lại khi đổi truyện, không gọi lại mỗi khi chuyển chương)
  useEffect(() => {
    let isCancelled = false;
    let retryTimer = null;
    if (!slug) return undefined;
    setDetailError(false);
    const load = (attempt) => {
      comicApi
        .getComicDetails(slug)
        .then((cData) => {
          if (isCancelled) return;
          if (cData?.status === 'success') {
            setComicData(cData.data);
          } else {
            setDetailError(true);
          }
        })
        .catch(() => {
          if (isCancelled) return;
          // Thử lại tự động 1 lần, sau đó hiện nút "Thử lại" trên thanh điều khiển
          if (attempt === 0) {
            retryTimer = setTimeout(() => load(1), 1500);
          } else {
            setDetailError(true);
          }
        });
    };
    load(0);
    return () => {
      isCancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [slug, detailRetry]);

  useEffect(() => {
    let isCancelled = false;
    const fetchChapter = async () => {
      try {
        setLoading(true);
        setError(null);
        setFailedImages({});
        setRetryTokens({});
        setLoadedImages({});
        setScrollProgress(0);
        const chapData = await comicApi.getComicChapter(chapterId);

        if (isCancelled) return;

        if (chapData.status === 'success') {
          setChapterData(chapData.data);
        } else {
          throw new Error('Chapter not found');
        }
      } catch (err) {
        if (!isCancelled) {
          setError('Không thể tải nội dung chương này.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    if (chapterId && slug) fetchChapter();
    return () => {
      isCancelled = true;
    };
  }, [chapterId, slug, chapterRetry]);

  let prevChapter = null;
  let nextChapter = null;

  if (comicData && comicData.chapters) {
    const allChapters = comicData.chapters;
    const currentIndex = allChapters.findIndex(c => extractChapterId(c) === chapterId);
    if (currentIndex !== -1) {
      if (currentIndex > 0) prevChapter = allChapters[currentIndex - 1];
      if (currentIndex < allChapters.length - 1) nextChapter = allChapters[currentIndex + 1];
    }
  }

  // Keyboard shortcuts (ArrowLeft / ArrowRight) for switching chapters
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt+← / Alt+→ là Back/Forward của trình duyệt — không đè lên
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      if (e.key === 'ArrowLeft' && prevChapter) {
        navigate(`/comics/${slug}/chapter/${extractChapterId(prevChapter)}`);
      } else if (e.key === 'ArrowRight' && nextChapter) {
        navigate(`/comics/${slug}/chapter/${extractChapterId(nextChapter)}`);
      } else if (e.key === 'Escape') {
        setShowChapterList(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevChapter, nextChapter, slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
      </div>
    );
  }

  if (error || !chapterData) {
    return (
      <div className="min-h-screen bg-black text-zinc-400 flex justify-center items-center flex-col gap-6">
        <p>{error || 'Đã xảy ra lỗi khi tải nội dung'}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setChapterRetry((c) => c + 1)}
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-black font-medium rounded-full transition-transform hover:scale-105"
          >
            <FiRefreshCw size={16} />
            Thử lại
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-full transition-colors"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const { item: chapterInfo, domain_cdn } = chapterData;
  const imagePath = chapterInfo.chapter_path;
  const images = chapterInfo.chapter_image || [];

  const API_BASE = import.meta.env.VITE_API_URL || '/api';
  const targetWidth = dataSaver ? 540 : Math.min(Math.round((window.innerWidth || 800) * (window.devicePixelRatio || 1)), 900);
  const targetQuality = dataSaver ? 45 : 62;

  return (
    <div className="bg-[#000000] min-h-screen relative text-zinc-200 font-sans selection:bg-white/20">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-white/10 z-50 pointer-events-none">
        <div
          className="h-full bg-primary-500 transition-[width] duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      
      {/* Top Floating Nav - Minimal Pill */}
      <div 
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${showToolbar ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-12 opacity-0 pointer-events-none'}`}
      >
        <div className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-full px-2 py-2 flex items-center gap-4 shadow-2xl">
          <button onClick={() => navigate(`/comics/${slug}`)} aria-label="Về trang truyện" className="w-10 h-10 flex justify-center items-center rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white">
            <FiChevronLeft size={20} />
          </button>
          
          <div className="flex flex-col items-center px-4 max-w-[200px] sm:max-w-[300px]">
            <h1 className="text-[13px] font-medium text-white truncate w-full text-center tracking-wide">{chapterData.item.comic_name}</h1>
            <p className="text-[11px] text-zinc-500">Chương {chapterData.item.chapter_name}</p>
          </div>

          <Link to="/comics" aria-label="Trang chủ truyện" className="w-10 h-10 flex justify-center items-center rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white">
            <FiHome size={18} />
          </Link>
        </div>
      </div>

      {/* Reader Images Container - Tap/click to toggle toolbar */}
      <div
        className="max-w-4xl mx-auto w-full flex flex-col items-center pb-32 cursor-pointer"
        onClick={() => {
          setShowToolbar((prev) => !prev);
          setShowChapterList(false);
        }}
      >
        {images.map((img, index) => {
          const rawUrl = img.image_file?.startsWith('http')
            ? img.image_file
            : `${domain_cdn}/${imagePath}/${img.image_file}`;
          const retryCount = retryTokens[index] || 0;
          const baseProxyUrl = dataSaver
            ? `${API_BASE}/img?url=${encodeURIComponent(rawUrl)}&w=${targetWidth}&q=${targetQuality}`
            : `${API_BASE}/img?url=${encodeURIComponent(rawUrl)}&raw=1`;
          const proxyUrl = retryCount > 0 ? `${baseProxyUrl}&_r=${retryCount}` : baseProxyUrl;
          const isFailed = failedImages[index];

          return (
            <div key={`${chapterId}-${index}`} className={`w-full relative flex items-center justify-center bg-black ${loadedImages[index] ? '' : 'min-h-[600px]'}`}>
              {isFailed ? (
                <div className="py-12 px-4 text-center flex flex-col items-center gap-3 border border-white/10 rounded-xl my-4 bg-zinc-950 w-full max-w-md">
                  <p className="text-xs text-zinc-400">Không thể tải trang {index + 1}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFailedImages((prev) => ({ ...prev, [index]: false }));
                      setRetryTokens((prev) => ({ ...prev, [index]: (prev[index] || 0) + 1 }));
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-full transition-colors"
                  >
                    <FiRefreshCw size={12} />
                    <span>Tải lại ảnh</span>
                  </button>
                </div>
              ) : (
                <img
                  src={proxyUrl}
                  alt={`Trang ${index + 1}`}
                  className="w-full h-auto object-contain select-none"
                  loading={index < 1 ? "eager" : "lazy"}
                  decoding="async"
                  onLoad={() => setLoadedImages((prev) => (prev[index] ? prev : { ...prev, [index]: true }))}
                  onError={() => {
                    if (retryCount < 1) {
                      setTimeout(() => {
                        setRetryTokens((prev) => ({ ...prev, [index]: (prev[index] || 0) + 1 }));
                      }, 1200);
                    } else {
                      setFailedImages((prev) => ({ ...prev, [index]: true }));
                    }
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Floating Controls - Minimal Pill */}
      <div 
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${showToolbar ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-12 opacity-0 pointer-events-none'}`}
      >
        <div className="relative">
          
          {/* Chapter List Dropdown */}
          {showChapterList && comicData && (
            <div 
              ref={chapterListRef}
              className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-[300px] max-h-[50vh] bg-[#0A0A0A]/90 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex justify-between items-center p-4 border-b border-white/5">
                <h3 className="font-medium text-white text-sm">Danh Sách Chương</h3>
                <span className="text-xs text-zinc-500">{comicData.chapters.length} chương</span>
              </div>
              <div className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10 flex-1">
                {comicData.chapters.map((chap) => {
                  const chapId = extractChapterId(chap);
                  const isActive = chapId === chapterId;
                  return (
                    <button
                      key={chapId}
                      ref={isActive ? activeChapterRef : null}
                      onClick={() => {
                        setShowChapterList(false);
                        navigate(`/comics/${slug}/chapter/${chapId}`);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors mb-1 ${isActive ? 'bg-white text-black font-medium' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                    >
                      Chương {chap.chapter_name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {detailError && !comicData && (
            <button
              type="button"
              onClick={() => setDetailRetry((c) => c + 1)}
              className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 whitespace-nowrap inline-flex items-center gap-1.5 px-4 py-2 bg-[#0A0A0A]/90 border border-white/10 rounded-full text-xs text-zinc-300 hover:text-white"
            >
              <FiRefreshCw size={12} />
              Không tải được danh sách chương — Thử lại
            </button>
          )}

          {/* Control Bar */}
          <div className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-full p-2 flex items-center gap-2 shadow-2xl">
            <button 
              onClick={() => prevChapter && navigate(`/comics/${slug}/chapter/${extractChapterId(prevChapter)}`)}
              disabled={!prevChapter}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-full transition-colors text-sm font-medium whitespace-nowrap ${prevChapter ? 'hover:bg-white/10 text-white' : 'text-zinc-600 cursor-not-allowed'}`}
            >
              <FiChevronLeft /> Trước
            </button>
            
            <button 
              ref={listBtnRef}
              onClick={() => setShowChapterList(!showChapterList)}
              className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-full transition-colors ${showChapterList ? 'bg-white text-black' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
              aria-label="Danh sách chương"
            >
              <FiList size={18} />
            </button>

            <button 
              onClick={() => nextChapter && navigate(`/comics/${slug}/chapter/${extractChapterId(nextChapter)}`)}
              disabled={!nextChapter}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-full transition-colors text-sm font-medium whitespace-nowrap ${nextChapter ? 'bg-white text-black hover:bg-gray-200' : 'text-zinc-600 cursor-not-allowed'}`}
            >
              Tiếp <FiChevronRight />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ComicReaderPage;
