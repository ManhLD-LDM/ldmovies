import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiList, FiHome } from 'react-icons/fi';
import { comicApi } from '../services/comicApi';
import useAuthStore from '../stores/authStore';
import useComicHistoryStore from '../stores/comicHistoryStore';

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
  
  // Toolbar state
  const [showToolbar, setShowToolbar] = useState(true);
  const [showChapterList, setShowChapterList] = useState(false);
  const lastScrollY = useRef(0);
  
  const activeChapterRef = useRef(null);
  const chapterListRef = useRef(null);
  const listBtnRef = useRef(null);

  const { isAuthenticated } = useAuthStore();
  const { syncComicHistory } = useComicHistoryStore();
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

  // Smart hide toolbar on scroll down
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
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

  useEffect(() => {
    const fetchChapterAndComic = async () => {
      try {
        setLoading(true);
        const [chapData, cData] = await Promise.all([
          comicApi.getComicChapter(chapterId),
          comicApi.getComicDetails(slug)
        ]);

        if (chapData.status === 'success') {
          setChapterData(chapData.data);
        } else {
          throw new Error('Chapter not found');
        }

        if (cData.status === 'success') {
          setComicData(cData.data);
        }
      } catch (err) {
        setError('Không thể tải nội dung chương này.');
      } finally {
        setLoading(false);
      }
    };
    if (chapterId && slug) fetchChapterAndComic();
  }, [chapterId, slug]);

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
        <button onClick={() => navigate(-1)} className="px-8 py-3 bg-white text-black font-medium rounded-full transition-transform hover:scale-105">
          Quay lại
        </button>
      </div>
    );
  }

  const { item: chapterInfo, domain_cdn } = chapterData;
  const imagePath = chapterInfo.chapter_path;
  const images = chapterInfo.chapter_image || [];

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

  const API_BASE = import.meta.env.VITE_API_URL || '/api';
  const dataSaver = localStorage.getItem('ldmovies_datasaver') === '1';
  const targetWidth = dataSaver ? 540 : Math.min(Math.round((window.innerWidth || 800) * (window.devicePixelRatio || 1)), 900);
  const targetQuality = dataSaver ? 45 : 62;

  return (
    <div className="bg-[#000000] min-h-screen relative text-zinc-200 font-sans selection:bg-white/20">
      
      {/* Top Floating Nav - Minimal Pill */}
      <div 
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${showToolbar ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-12 opacity-0 pointer-events-none'}`}
      >
        <div className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-full px-2 py-2 flex items-center gap-4 shadow-2xl">
          <button onClick={() => navigate(`/comics/${slug}`)} className="w-10 h-10 flex justify-center items-center rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white">
            <FiChevronLeft size={20} />
          </button>
          
          <div className="flex flex-col items-center px-4 max-w-[200px] sm:max-w-[300px]">
            <h1 className="text-[13px] font-medium text-white truncate w-full text-center tracking-wide">{chapterData.item.comic_name}</h1>
            <p className="text-[11px] text-zinc-500">Ch. {chapterData.item.chapter_name}</p>
          </div>

          <Link to="/comics" className="w-10 h-10 flex justify-center items-center rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white">
            <FiHome size={18} />
          </Link>
        </div>
      </div>

      {/* Reader Images Container */}
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center pb-32">
        {images.map((img, index) => {
          const rawUrl = `${domain_cdn}/${imagePath}/${img.image_file}`;
          const proxyUrl = `${API_BASE}/img?url=${encodeURIComponent(rawUrl)}&w=${targetWidth}&q=${targetQuality}`;

          return (
            <div key={index} className="w-full relative flex items-center justify-center bg-black min-h-[300px]">
              <img 
                src={proxyUrl}
                alt={`Trang ${index + 1}`}
                className="w-full h-auto object-contain select-none"
                loading={index < 2 ? "eager" : "lazy"}
                decoding="async"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = rawUrl; // Fallback directly to original CDN if proxy fails
                }}
              />
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

          {/* Control Bar */}
          <div className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-full p-2 flex items-center gap-2 shadow-2xl">
            <button 
              onClick={() => prevChapter && navigate(`/comics/${slug}/chapter/${extractChapterId(prevChapter)}`)}
              disabled={!prevChapter}
              className={`flex items-center gap-2 px-6 py-3 rounded-full transition-colors text-sm font-medium ${prevChapter ? 'hover:bg-white/10 text-white' : 'text-zinc-600 cursor-not-allowed'}`}
            >
              <FiChevronLeft /> Trước
            </button>
            
            <button 
              ref={listBtnRef}
              onClick={() => setShowChapterList(!showChapterList)}
              className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${showChapterList ? 'bg-white text-black' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
            >
              <FiList size={18} />
            </button>

            <button 
              onClick={() => nextChapter && navigate(`/comics/${slug}/chapter/${extractChapterId(nextChapter)}`)}
              disabled={!nextChapter}
              className={`flex items-center gap-2 px-6 py-3 rounded-full transition-colors text-sm font-medium ${nextChapter ? 'bg-white text-black hover:bg-gray-200' : 'text-zinc-600 cursor-not-allowed'}`}
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
