import { useRef } from 'react';
import { FiChevronLeft, FiChevronRight, FiClock } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { formatTimeAgo } from '../utils/formatTime';
import { FALLBACK_POSTER } from '../utils/textUtils';

function ComicSection({ title, comics, loading, viewAllLink, resolveImageUrl, onPrefetch }) {
  const scrollRef = useRef(null);

  const scrollByAmount = (direction) => {
    const container = scrollRef.current;
    if (!container) return;
    const step = Math.max(container.clientWidth * 0.75, 320);
    container.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return (
      <section className="py-6">
        <div className="flex items-center justify-between mb-5">
          <div className="h-7 bg-dark-200 rounded-lg w-52 skeleton" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="flex-none w-40 sm:w-44 md:w-48">
              <div className="aspect-[2/3] bg-dark-200 rounded-xl skeleton" />
              <div className="mt-3 h-4 bg-dark-200 rounded w-3/4 skeleton" />
              <div className="mt-2 h-3 bg-dark-200 rounded w-1/2 skeleton" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!comics || comics.length === 0) {
    return null;
  }

  return (
    <section className="py-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
          <span className="w-1 h-7 bg-gradient-to-b from-teal-400 to-cyan-500 rounded-full" />
          <span>{title}</span>
        </h2>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollByAmount('left')}
              aria-label={`Cuộn trái ${title}`}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 transition-colors"
            >
              <FiChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollByAmount('right')}
              aria-label={`Cuộn phải ${title}`}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 transition-colors"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="flex items-center gap-1 min-h-[44px] -my-3 text-gray-400 hover:text-teal-400 transition-colors duration-200 group"
            >
              <span className="text-sm font-medium">Xem tất cả</span>
              <FiChevronRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          )}
        </div>
      </div>

      {/* Horizontal Scroll Comic Cards */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pt-2 pb-4 custom-scrollbar-horizontal snap-x snap-mandatory"
      >
        {comics.map((comic, idx) => (
          <div key={`${comic._id || comic.slug}-${idx}`} className="flex-none w-40 sm:w-44 md:w-48 snap-start">
            <Link
              to={`/comics/${comic.slug}`}
              onMouseEnter={() => onPrefetch?.(comic.slug)}
              className="group flex flex-col bg-dark-200 rounded-xl overflow-hidden border border-white/5 hover:border-teal-500/40 transition-all shadow-lg h-full"
            >
              <div className="aspect-[2/3] w-full overflow-hidden bg-zinc-900 relative">
                <img
                  src={resolveImageUrl(comic.thumb_url)}
                  alt={comic.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
          </div>
        ))}
      </div>
    </section>
  );
}

export default ComicSection;
