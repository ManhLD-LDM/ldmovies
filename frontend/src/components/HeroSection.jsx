import { useState, useEffect } from 'react';
import { FiInfo, FiPlay, FiHeart } from 'react-icons/fi';
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
      <div className="relative h-[70vh] min-h-[550px] md:min-h-[600px] bg-dark-200 animate-pulse">
        <div className="absolute bottom-0 left-0 right-0 p-8 pb-16 md:pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="h-12 bg-dark-300 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-dark-300 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-dark-300 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[70vh] min-h-[550px] md:min-h-[600px] overflow-hidden bg-bg-900">
      {movies.map((movie, index) => {
        const isActive = index === currentIndex;
        // "Xem Ngay" dẫn thẳng vào watch page, "Chi Tiết" vào trang thông tin
        const detailPath = movie.type === 'hoathinh' || !movie.type ? `/anime/${movie.slug}` : `/movies/${movie.slug}`;

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
                className={`w-full h-full object-cover ${isActive ? 'animate-slow-zoom' : ''}`}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50"></div>
            </div>

            {/* Nội dung */}
            <div className="absolute bottom-0 left-0 right-0 p-8 pb-16 md:pb-20">
              <div className="max-w-7xl mx-auto">
                <div className="max-w-2xl">
                  {/* Tên phim */}
                  <h1 className="text-5xl md:text-6xl font-black text-white mb-3 drop-shadow-lg">
                    {movie.name}
                  </h1>
                  {movie.origin_name && movie.origin_name !== movie.name && (
                    <p className="text-xl text-gray-300 mb-6">{movie.origin_name}</p>
                  )}

                  {/* Thông tin phim */}
                  <div className="flex flex-wrap items-center gap-3 text-gray-300 mb-6">
                    {movie.quality && (
                      <span className="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg text-sm font-bold shadow-lg">
                        {movie.quality}
                      </span>
                    )}
                    {movie.lang && (
                      <span className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-bold shadow-lg">
                        {movie.lang}
                      </span>
                    )}
                    {movie.year && <span className="font-semibold">{movie.year}</span>}
                    {movie.episode_current && (
                      <span className="text-green-400">{movie.episode_current}</span>
                    )}
                  </div>

                  {/* Thể loại */}
                  {movie.category && movie.category.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                      {movie.category.map((genre, idx) => (
                        <span key={idx} className="px-4 py-1.5 glass-effect text-gray-200 rounded-full text-sm font-medium backdrop-blur-md">
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Các nút hành động - Phân biệt rõ intent */}
                  <div className="flex items-center gap-4">
                    {/* Nút chính: Xem Ngay - dẫn vào trang chi tiết để chọn tập */}
                    <Link
                      to={detailPath}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                    >
                      <FiPlay size={20} />
                      <span>Xem Ngay</span>
                    </Link>
                    {/* Nút phụ: Thêm vào yêu thích */}
                    <Link
                      to={detailPath}
                      className="inline-flex items-center gap-2 px-6 py-3 glass-effect text-white rounded-lg hover:bg-white/20 transition-all font-medium"
                    >
                      <FiInfo size={20} />
                      <span>Chi Tiết</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Dots Indicator */}
      {movies.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
          {movies.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-[2px] transition-all duration-500 ease-out ${
                index === currentIndex ? 'w-12 bg-white' : 'w-6 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default HeroSection;
