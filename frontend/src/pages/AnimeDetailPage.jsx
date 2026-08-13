import { useRef, useState } from 'react';
import { FiCalendar, FiClock, FiHeart, FiStar, FiTv, FiX } from 'react-icons/fi';
import { Link, useLocation, useParams } from 'react-router-dom';
import MovieSection from '../components/MovieSection';
import VideoPlayer from '../components/VideoPlayer';
import { useContentDetail } from '../stores/useContentDetail';

function AnimeDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const playerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Dùng shared hook — xử lý content, episodes, favorites và recommendations
  const {
    content: anime,
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

  // Xác định filter path dựa trên URL hiện tại
  const isAnime = location.pathname.startsWith('/anime');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-xl">Không tìm thấy anime Vietsub</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section with Backdrop */}
      <div className="relative min-h-[75vh] flex items-end pt-28 pb-12 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 animate-slow-zoom"
          style={{ backgroundImage: `url(${anime.thumb_url || anime.poster || ''})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/20" />
        </div>

        <div className="relative z-10 w-full px-4 md:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 items-start">
            {/* Poster */}
            <img
              src={anime.poster || anime.thumb_url}
              alt={anime.name}
              className="w-48 h-72 object-cover rounded-lg shadow-2xl hidden md:block"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='192' height='288' viewBox='0 0 192 288'%3E%3Crect fill='%231E1E28' width='192' height='288'/%3E%3Ctext x='96' y='148' font-family='Arial' font-size='48' fill='%234B4B6A' text-anchor='middle'%3E🎬%3C/text%3E%3C/svg%3E`;
              }}
            />

            {/* Info */}
            <div className="flex-1 w-full">
              <h1 className="text-3xl md:text-5xl font-black text-white mb-3 drop-shadow-2xl">{anime.name}</h1>
              {anime.origin_name && anime.origin_name !== anime.name && (
                <p className="text-gray-300 text-xl mb-6">{anime.origin_name}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 text-yellow-400">
                  <FiStar />
                  <span className="font-semibold">{anime.quality || 'HD'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <FiCalendar />
                  <span>{anime.year || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <FiTv />
                  <span>{episodes.length || '?'} tập</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <FiClock />
                  <span>{anime.time || 'N/A'}</span>
                </div>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-6">
                {anime.category?.map((genre, idx) => {
                  const categorySlug = genre.toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/\+/g, '');
                  const filterPath = isAnime ? '/anime/filter' : '/movies/filter';
                  return (
                    <Link
                      key={idx}
                      to={`${filterPath}?categories=${categorySlug}`}
                      className="px-4 py-1.5 glass-effect text-gray-200 rounded-full text-sm font-medium backdrop-blur-md shadow-md hover:bg-white/20 hover:scale-105 transform transition-all duration-300 cursor-pointer"
                    >
                      {genre}
                    </Link>
                  );
                })}
              </div>

              {/* Favorite Button */}
              <div className="mb-6">
                <button
                  onClick={() => handleFavoriteToggle(id, anime)}
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
                  <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-pink-500 rounded-full" />
                  <span>Nội dung</span>
                </h2>
                <div className="text-gray-300 leading-relaxed text-base">
                  {(!isExpanded && (anime.content || anime.description)?.length > 250) ? (
                    <p>{(anime.content || anime.description).substring(0, 250)}...</p>
                  ) : (
                    <p>{anime.content || anime.description || 'Không có mô tả'}</p>
                  )}
                  {(anime.content || anime.description)?.length > 250 && (
                    <button 
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-red-500 hover:text-red-400 font-semibold mt-2 transition-colors"
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
      {showPlayer && selectedEpisode && (
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
              episodeName={`${anime.name} - ${selectedEpisode.name}`}
              onClose={closePlayer}
              initialTime={initialTime}
              historyItem={{
                id: anime._id || id,
                slug: anime.slug || id,
                type: 'anime',
                name: anime.name,
                episodeName: selectedEpisode.name,
                poster: anime.thumb_url || anime.poster_url || anime.poster,
              }}
            />

            {/* Episode navigation below video */}
            <div className="mt-8">
              <h3 className="text-xl font-black text-white mb-5 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-pink-500 rounded-full" />
                <span>Chọn tập khác</span>
              </h3>
              <div className="max-h-64 overflow-y-auto glass-effect rounded-xl p-3 sm:p-4 custom-scrollbar">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2 sm:gap-3">
                  {episodes.map((ep, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleEpisodeClick(ep, playerRef)}
                      className={`px-3 py-2.5 rounded-xl font-semibold text-sm transition-all transform hover:scale-105 shadow-md ${selectedEpisode?.name === ep.name
                        ? 'bg-gradient-to-br from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'bg-white/10 text-gray-300 hover:bg-gradient-to-br hover:from-red-600 hover:to-red-500 hover:text-white'
                        }`}
                    >
                      {ep.name || `${idx + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Episodes List — chỉ hiện khi player chưa mở */}
      {!showPlayer && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-red-500 to-pink-500 rounded-full" />
            <span>Danh Sách Tập Vietsub</span>
          </h2>
          {episodes.length > 0 ? (
            episodes.length > 24 ? (
              <div className="max-h-96 overflow-y-auto glass-effect rounded-xl p-4 sm:p-5 custom-scrollbar">
                <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 xl:grid-cols-12 gap-2 sm:gap-3">
                  {episodes.map((ep, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleEpisodeClick(ep, playerRef)}
                      className={`px-4 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-md ${selectedEpisode?.name === ep.name
                        ? 'bg-gradient-to-br from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'glass-effect text-gray-300 hover:bg-gradient-to-br hover:from-red-600 hover:to-red-500 hover:text-white'
                        }`}
                    >
                      {ep.name || `Tập ${idx + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 xl:grid-cols-12 gap-2 sm:gap-3">
                {episodes.map((ep, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleEpisodeClick(ep, playerRef)}
                    className={`px-4 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-md ${selectedEpisode?.name === ep.name
                      ? 'bg-gradient-to-br from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30'
                      : 'glass-effect text-gray-300 hover:bg-gradient-to-br hover:from-red-600 hover:to-red-500 hover:text-white'
                      }`}
                  >
                    {ep.name || `Tập ${idx + 1}`}
                  </button>
                ))}
              </div>
            )
          ) : (
            <p className="text-gray-400 text-center py-8">Chưa có video Vietsub nào</p>
          )}
        </div>
      )}

      {/* Recommendations Section */}
      <div className="max-w-7xl mx-auto px-2 md:px-4 pb-12 space-y-6">
        {franchiseRecommendations.length > 0 && (
          <MovieSection
            title="Gợi Ý Cùng Bộ (Franchise)"
            movies={franchiseRecommendations}
            loading={recommendationsLoading}
            contentType="anime"
          />
        )}

        {genreRecommendations.length > 0 && (
          <MovieSection
            title="Gợi Ý Cùng Thể Loại"
            movies={genreRecommendations}
            loading={recommendationsLoading}
            contentType="anime"
          />
        )}
      </div>
    </div>
  );
}

export default AnimeDetailPage;
