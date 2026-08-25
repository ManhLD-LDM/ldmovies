import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiBookOpen, FiClock, FiUser, FiInfo, FiList, FiHeart } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { comicApi } from '../services/comicApi';
import useAuthStore from '../stores/authStore';
import useFavoritesStore from '../stores/favoritesStore';
import useDocumentTitle from '../utils/useDocumentTitle';

function ComicDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [comic, setComic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useDocumentTitle(
    comic?.name ? `Truyện ${comic.name}` : 'Chi Tiết Truyện Tranh',
    comic?.description ? comic.description.replace(/<[^>]*>/g, '').slice(0, 160) : undefined
  );
  
  const { isAuthenticated } = useAuthStore();
  const { isComicFavorited, addFavoriteComic, removeFavoriteComic } = useFavoritesStore();

  useEffect(() => {
    const fetchComicDetails = async () => {
      try {
        setLoading(true);
        const data = await comicApi.getComicDetails(slug);
        if (data.status === 'success') {
          setComic(data.data);
        }
      } catch (err) {
        setError('Không thể tải thông tin truyện');
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchComicDetails();
  }, [slug]);

  const isFavorited = comic ? isComicFavorited(comic._id || comic.slug) : false;

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để lưu truyện');
      navigate('/login');
      return;
    }

    const comicId = comic._id || comic.slug;

    if (isFavorited) {
      const result = await removeFavoriteComic(comicId);
      if (result.success) {
        toast.success('Đã bỏ theo dõi truyện');
      } else {
        toast.error(result.message);
      }
    } else {
      const result = await addFavoriteComic({
        comicId,
        title: comic.name,
        poster: comic.thumb_url
      });
      if (result.success) {
        toast.success('Đã lưu truyện vào tủ sách');
      } else {
        toast.error(result.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="pt-24 px-4 sm:px-8 lg:px-12 max-w-[1200px] mx-auto min-h-screen text-white pb-24 font-sans">
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
      <div className="pt-24 px-6 max-w-5xl mx-auto min-h-screen text-white flex justify-center items-center">
        <p className="text-zinc-400">{error || 'Không tìm thấy truyện'}</p>
      </div>
    );
  }

  return (
    <div className="pt-24 px-4 sm:px-8 lg:px-12 max-w-[1200px] mx-auto min-h-screen text-white pb-24 font-sans">
      
      {/* Editorial Split Header */}
      <div className="flex flex-col md:flex-row gap-12 md:gap-16 mb-24">
        
        {/* Left: Poster */}
        <div className="w-full md:w-[320px] flex-shrink-0">
          <div className="aspect-[2/3] w-full bg-zinc-900 rounded-lg overflow-hidden relative">
            <img 
              src={comic.thumb_url} 
              alt={comic.name} 
              className="w-full h-full object-cover"
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
              {comic.status === 'ongoing' ? 'Ongoing' : comic.status}
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
              <span className="text-zinc-500 w-24">Author</span>
              <span className="text-zinc-200">{comic.author?.join(', ') || 'Unknown'}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-zinc-500 w-24">Genres</span>
              <div className="flex flex-wrap gap-2">
                {comic.category?.map(cat => (
                  <span key={cat.id} className="text-zinc-200">
                    {cat.name}{cat !== comic.category[comic.category.length - 1] && ', '}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-12 max-w-2xl">
            <div 
              className="text-zinc-400 leading-relaxed font-light text-base md:text-lg"
              dangerouslySetInnerHTML={{ __html: comic.content }}
            ></div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 mt-auto">
            {comic.chapters && comic.chapters.length > 0 && (
              <Link 
                to={`/comics/${comic.slug}/chapter/${comic.chapters[comic.chapters.length - 1].chapter_api_data?.split('/').pop() || comic.chapters[comic.chapters.length - 1].chapter_name}`}
                className="px-8 py-4 bg-white text-black rounded-full font-semibold transition-transform hover:scale-[1.02] flex items-center gap-2 text-sm tracking-wide"
              >
                Start Reading
              </Link>
            )}
            
            <button
              onClick={handleToggleFavorite}
              className={`px-8 py-4 rounded-full font-semibold transition-transform hover:scale-[1.02] flex items-center gap-2 text-sm tracking-wide border ${
                isFavorited 
                  ? 'bg-transparent text-white border-white/20' 
                  : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/30'
              }`}
            >
              <FiHeart className={isFavorited ? 'fill-white text-white' : ''} /> 
              {isFavorited ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Chapters Section */}
      <div className="border-t border-white/10 pt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-medium tracking-tight">Chapters</h2>
          <span className="text-sm text-zinc-500 font-mono">{comic.chapters?.length || 0} total</span>
        </div>
        
        {comic.chapters && comic.chapters.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {comic.chapters.map((chap, index) => {
              const chapIdOrName = chap.chapter_api_data?.split('/').pop() || chap.chapter_name;
              
              return (
                <Link
                  key={index}
                  to={`/comics/${comic.slug}/chapter/${chapIdOrName}`}
                  className="group flex items-center justify-between bg-[#0A0A0A] hover:bg-zinc-900 border border-white/5 hover:border-white/20 rounded-lg p-5 transition-colors"
                >
                  <span className="font-medium text-zinc-400 group-hover:text-white transition-colors text-sm">
                    Chapter {chap.chapter_name}
                  </span>
                  <span className="text-zinc-600 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transform duration-300">
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-20 flex justify-center border border-white/5 border-dashed rounded-xl">
            <p className="text-zinc-500">No chapters available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComicDetailPage;
