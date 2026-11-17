import { useState, useEffect } from 'react';
import { FiInfo, FiPlay } from 'react-icons/fi';
import { Link } from 'react-router-dom';

function HeroSection({ movies = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!movies || movies.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % movies.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [movies]);

  if (!movies || movies.length === 0) {
    return (
      <div className="relative h-[70vh] min-h-[550px] md:min-h-[600px] bg-dark-200 animate-pulse -mt-16">
        <div className="absolute bottom-0 left-0 right-0 p-8 pb-16 md:pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="h-10 bg-dark-300 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-dark-300 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-dark-300 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[70vh] min-h-[550px] md:min-h-[600px] overflow-hidden bg-bg-900 -mt-16">
      {movies.map((movie, index) => {
        const isActive = index === currentIndex;
        const isNext = index === (currentIndex + 1) % movies.length;
        if (!isActive && !isNext) return null; // Tránh render nhiều DOM node & nạp ảnh cùng lúc

        const detailPath = movie.type === 'hoathinh' ? `/anime/${movie.slug}` : `/movies/${movie.slug}`;

        return (
          <div
            key={movie.slug || index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {/* Ảnh nền */}
            <div className="absolute inset-0">
              <img
                src={movie.thumb_url || movie.poster}
                alt={movie.name}
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchpriority={index === 0 ? 'high' : 'low'}
                decoding="async"
                className={`w-full h-full object-cover ${isActive ? 'animate-slow-zoom' : ''}`}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60"></div>
            </div>

            {/* Nội dung với top padding pt-24 sm:pt-28 chống đè Navbar */}
            <div className="absolute inset-0 pt-24 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-8 flex flex-col justify-end pointer-events-none">
              <div className="max-w-7xl mx-auto w-full pointer-events-auto">
                <div className="max-w-3xl">
                  {/* Tên phim với line-clamp & font scale hợp lý */}
                  {isActive ? (
                    <h1
                      title={movie.name}
                      className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 leading-tight drop-shadow-lg line-clamp-2 sm:line-clamp-3"
                    >
                      {movie.name}
                    </h1>
                  ) : (
                    <h2
                      title={movie.name}
                      className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 leading-tight drop-shadow-lg line-clamp-2 sm:line-clamp-3"
                    >
                      {movie.name}
                    </h2>
                  )}

                  {movie.origin_name && movie.origin_name !== movie.name && (
                    <p className="text-sm sm:text-base md:text-lg text-gray-300 mb-4 line-clamp-1">
                      {movie.origin_name}
                    </p>
                  )}

                  {/* Thông tin phim */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-gray-300 text-sm mb-4">
                    {movie.quality && (
                      <span className="px-2.5 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-md text-xs font-bold shadow-md">
                        {movie.quality}
                      </span>
                    )}
                    {movie.lang && (
                      <span className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-md text-xs font-bold shadow-md">
                        {movie.lang}
                      </span>
                    )}
                    {movie.year && <span className="font-semibold">{movie.year}</span>}
                    {movie.episode_current && (
                      <span className="text-green-400 font-medium">{movie.episode_current}</span>
                    )}
                  </div>

                  {/* Thể loại */}
                  {movie.category && movie.category.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {movie.category.slice(0, 5).map((genre, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white/10 text-gray-200 rounded-full text-xs font-medium backdrop-blur-md border border-white/10">
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Các nút hành động */}
                  <div className="flex items-center gap-3">
                    <Link
                      to={detailPath}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-all font-medium text-sm shadow-lg shadow-primary-600/30"
                    >
                      <FiPlay size={18} />
                      <span>Xem Ngay</span>
                    </Link>
                    <Link
                      to={detailPath}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all font-medium text-sm backdrop-blur-md border border-white/10"
                    >
                      <FiInfo size={18} />
                      <span>Chi Tiết</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Dots Indicator with accessible touch targets (≥44x44px) */}
      {movies.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center items-center gap-1">
          {movies.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 group"
              aria-label={`Chuyển đến phim ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            >
              <span
                className={`h-[3px] rounded-full transition-all duration-500 ease-out ${
                  index === currentIndex ? 'w-10 bg-white shadow-glow-sm' : 'w-5 bg-white/30 group-hover:bg-white/60'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default HeroSection;
