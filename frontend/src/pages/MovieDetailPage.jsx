import { useEffect, useRef, useState } from 'react';
import { FiCalendar, FiClock, FiHeart, FiPlay, FiStar, FiX } from 'react-icons/fi';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import EpisodeList from '../components/EpisodeList';
import MovieSection from '../components/MovieSection';
import VideoPlayer from '../components/VideoPlayer';
import { toCategorySlug } from '../services/kkphimApi';
import { useContentDetail } from '../stores/useContentDetail';
import { FALLBACK_POSTER, stripHtmlAndDecode } from '../utils/textUtils';
import useDocumentTitle from '../utils/useDocumentTitle';

function MovieDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const playerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [id]);

  // Dùng shared hook — xử lý content, episodes, favorites và recommendations
  const {
    content: movie,
    episodes,
    loading,
    selectedEpisode,
    showPlayer,
    initialTime,
    isFavorited,
    franchiseRecommendations,
    genreRecommendations,
    recommendationsLoading,
    handleEpisodeClick,
    closePlayer,
    handleFavoriteToggle,
  } = useContentDetail(id);

  const isTrueAnime = movie?.type === 'hoathinh';

  // Nếu thực tế là anime (hoathinh), chuyển hướng đúng sang /anime/:id
  useEffect(() => {
    if (!loading && movie?.type === 'hoathinh') {
      navigate(`/anime/${id}${location.search}`, { replace: true });
    }
  }, [loading, movie, id, location.search, navigate]);

  const cleanDescription = stripHtmlAndDecode(movie?.content || movie?.description);

  useDocumentTitle(
    movie?.name
      ? `${isTrueAnime ? 'Anime' : 'Phim'} ${movie.name}`
      : undefined,
    cleanDescription ? cleanDescription.slice(0, 160) : undefined
  );

  if (loading || movie?.type === 'hoathinh') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-96 bg-dark-300 rounded-lg mb-8" />
          <div className="h-8 bg-dark-300 rounded w-1/2 mb-4" />
          <div className="h-4 bg-dark-300 rounded w-full mb-2" />
          <div className="h-4 bg-dark-300 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-xl">Không tìm thấy phim</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section with Backdrop */}
      <div className="relative min-h-[75vh] -mt-16 flex items-end pt-28 pb-12 overflow-hidden">
        <div className="absolute inset-0">
          {(movie.thumb_url || movie.poster) && (
            <img
              src={movie.thumb_url || movie.poster}
              alt=""
              aria-hidden="true"
              decoding="async"
              className="w-full h-full object-cover scale-105 animate-slow-zoom"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/20" />
        </div>

        <div className="relative z-10 w-full px-4 md:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 items-start">
            {/* Poster */}
            <img
              src={movie.poster || FALLBACK_POSTER}
              alt={movie.name}
              className="w-48 h-72 object-cover rounded-lg shadow-2xl hidden md:block"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = FALLBACK_POSTER;
              }}
            />

            {/* Info */}
            <div className="flex-1 w-full">
              <h1 className="text-3xl md:text-5xl font-black text-white mb-3 drop-shadow-2xl">{movie.name}</h1>
              {movie.origin_name && movie.origin_name !== movie.name && (
                <p className="text-gray-300 text-xl mb-6">{movie.origin_name}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-4 mb-6">
                {movie.quality && (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <FiStar />
                    <span className="font-semibold">{movie.quality}</span>
                  </div>
                )}
                {movie.year && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <FiCalendar />
                    <span>{movie.year}</span>
                  </div>
                )}
                {episodes.length > 0 && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <FiPlay />
                    <span>{episodes.length} tập</span>
                  </div>
                )}
                {movie.time && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <FiClock />
                    <span>{movie.time}</span>
                  </div>
                )}
              </div>

              {/* Genres */}
              {((movie.categoryList && movie.categoryList.length > 0) || (movie.category && movie.category.length > 0)) && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {(movie.categoryList && movie.categoryList.length > 0
                    ? movie.categoryList
                    : movie.category.map((name) => ({ name, slug: toCategorySlug(name) }))
                  ).map((cat, idx) => (
                    <Link
                      key={cat.slug || idx}
                      to={`/movies/filter?categories=${cat.slug || toCategorySlug(cat.name)}`}
                      className="px-4 py-1.5 glass-effect text-gray-200 rounded-full text-sm font-medium backdrop-blur-md shadow-md hover:bg-white/20 hover:scale-105 transform transition-all duration-300 cursor-pointer"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                {episodes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleEpisodeClick(selectedEpisode || episodes[0], playerRef)}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg shadow-primary-600/30"
                  >
                    <FiPlay className="fill-current" size={18} />
                    <span>{selectedEpisode ? `Tiếp Tục (${selectedEpisode.name})` : 'Xem Ngay'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleFavoriteToggle(id, movie)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${isFavorited
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-dark-300 text-gray-300 hover:bg-dark-400'
                    }`}
                >
                  <FiHeart className={isFavorited ? 'fill-current' : ''} size={20} />
                  {isFavorited ? 'Đã thích' : 'Yêu thích'}
                </button>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h2 className="text-2xl font-black text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-primary-500 to-violet-500 rounded-full" />
                  <span>Nội dung</span>
                </h2>
                <div className="text-gray-300 leading-relaxed text-base whitespace-pre-line">
                  {(!isExpanded && cleanDescription.length > 250) ? (
                    <p>{cleanDescription.substring(0, 250)}...</p>
                  ) : (
                    <p>{cleanDescription || 'Không có mô tả'}</p>
                  )}
                  {cleanDescription.length > 250 && (
                    <button 
                      type="button"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-primary-400 hover:text-primary-300 font-semibold mt-2 transition-colors"
                    >
                      {isExpanded ? 'Ẩn bớt' : 'Xem thêm'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player Section */}
      {showPlayer && selectedEpisode && (() => {
        const currentEpisodeIndex = episodes.findIndex(
          (ep) =>
            (ep.slug && ep.slug === selectedEpisode.slug) ||
            ep.name === selectedEpisode.name
        );
        const hasNextEpisode = currentEpisodeIndex >= 0 && currentEpisodeIndex < episodes.length - 1;
        const handleNextEpisode = () => {
          if (hasNextEpisode) {
            handleEpisodeClick(episodes[currentEpisodeIndex + 1], playerRef);
          }
        };

        return (
          <div ref={playerRef} className="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-10">
            <div className="glass-effect rounded-2xl p-3 md:p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white">
                  Đang xem: {selectedEpisode.name || 'Tập phim'}
                </h2>
                <button
                  onClick={closePlayer}
                  className="p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 transform hover:scale-110"
                >
                  <FiX size={24} />
                </button>
              </div>
              <VideoPlayer
                videoUrl={selectedEpisode.link_m3u8 || selectedEpisode.link_embed}
                embedUrl={selectedEpisode.link_embed}
                episodeName={`${movie.name} - ${selectedEpisode.name}`}
                onClose={closePlayer}
                initialTime={initialTime}
                hasNextEpisode={hasNextEpisode}
                onNextEpisode={handleNextEpisode}
                historyItem={{
                  id: movie._id || id,
                  slug: movie.slug || id,
                  type: isTrueAnime ? 'anime' : 'movie',
                  name: movie.name,
                  episodeName: selectedEpisode.name,
                  poster: movie.thumb_url || movie.poster_url || movie.poster,
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* Episodes Section - Duy nhất 1 danh sách tập thống nhất */}
      <div className="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-6">
        <EpisodeList
          title="Danh sách tập"
          episodes={episodes}
          selectedEpisode={selectedEpisode}
          onEpisodeClick={handleEpisodeClick}
          playerRef={playerRef}
        />
      </div>

      {/* Recommendations Section */}
      <div className="max-w-7xl mx-auto px-2 md:px-4 pb-12 space-y-6">
        {franchiseRecommendations.length > 0 && (
          <MovieSection
            title="Gợi Ý Cùng Bộ (Franchise)"
            movies={franchiseRecommendations}
            loading={recommendationsLoading}
            contentType="movie"
          />
        )}

        {genreRecommendations.length > 0 && (
          <MovieSection
            title="Gợi Ý Cùng Thể Loại"
            movies={genreRecommendations}
            loading={recommendationsLoading}
            contentType="movie"
          />
        )}
      </div>
    </div>
  );
}

export default MovieDetailPage;
