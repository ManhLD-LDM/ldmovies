import { useEffect, useState } from 'react';
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiList } from 'react-icons/fi';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import VideoPlayer from '../components/VideoPlayer';
import { episodeApi, movieApi } from '../services/api';

// WatchPage dành cho phim từ MongoDB backend (khác với MovieDetailPage/AnimeDetailPage
// dùng kkphimApi). Thay ReactPlayer bằng VideoPlayer custom để:
//   1. Tích hợp HLS.js (play file .m3u8)
//   2. Đồng nhất UI/UX với các trang còn lại
//   3. Hỗ trợ deep link ?t=<giây>

function WatchPage() {
  const { id, episodeNumber } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [movie, setMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEpisodeList, setShowEpisodeList] = useState(false);

  // Deep link: lấy thời gian từ ?t=<giây>
  const initialTime = parseInt(searchParams.get('t') || '0', 10);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const movieRes = await movieApi.getById(id);
        setMovie(movieRes.data);

        let fetchedEpisodes = [];
        try {
          const episodesRes = await episodeApi.getByMovieId(id);
          fetchedEpisodes = episodesRes.data;
          setEpisodes(fetchedEpisodes);
        } catch {
          // Tạo episode mặc định cho phim không có data tập
          fetchedEpisodes = [{
            id: 1,
            episodeNumber: 1,
            title: `${movieRes.data.title} - Full Movie`,
            description: movieRes.data.description,
          }];
          setEpisodes(fetchedEpisodes);
        }

        // Increment view count (fire-and-forget)
        movieApi.incrementView(id).catch(() => {});

        // Set current episode
        const targetNum = parseInt(episodeNumber) || 1;
        const ep = fetchedEpisodes.find(e => e.episodeNumber === targetNum);
        setCurrentEpisode(ep || fetchedEpisodes[0] || null);

      } catch (error) {
        console.error('Error fetching watch data:', error);
        toast.error('Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, episodeNumber]);

  const getVideoUrl = () =>
    currentEpisode?.videoUrl || movie?.videoUrl || null;

  const currentEpNum = currentEpisode?.episodeNumber || parseInt(episodeNumber) || 1;
  const hasPrevEpisode = episodes.some(ep => ep.episodeNumber === currentEpNum - 1);
  const hasNextEpisode = episodes.some(ep => ep.episodeNumber === currentEpNum + 1);

  const goToPrevEpisode = () => {
    if (hasPrevEpisode) navigate(`/watch/${id}/episode/${currentEpNum - 1}`);
  };

  const goToNextEpisode = () => {
    if (hasNextEpisode) navigate(`/watch/${id}/episode/${currentEpNum + 1}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-xl">Video not found</p>
      </div>
    );
  }

  const videoUrl = getVideoUrl();

  return (
    <div className="min-h-screen bg-black">
      {/* Video Player */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        {videoUrl ? (
          <VideoPlayer
            videoUrl={videoUrl}
            episodeName={
              currentEpisode
                ? `${movie.title} - Tập ${currentEpisode.episodeNumber}`
                : movie.title
            }
            initialTime={initialTime}
            onClose={() => navigate(`/movie/${id}`)}
            historyItem={{
              id: movie._id || id,
              slug: movie.slug || id,
              type: 'movie',
              name: movie.title,
              episodeName: currentEpisode ? `Tập ${currentEpisode.episodeNumber}` : 'Full',
              poster: movie.posterUrl || movie.poster,
            }}
          />
        ) : (
          <div className="aspect-video bg-dark-200 rounded-lg flex flex-col items-center justify-center text-gray-400">
            <p className="text-xl mb-4">Video not available</p>
            <p className="text-sm">The video URL has not been set for this content</p>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-dark-200 py-4 mt-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Back Button & Title */}
            <div className="flex items-center gap-4">
              <Link
                to={`/movie/${id}`}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <FiArrowLeft />
                <span>Back</span>
              </Link>
              <div>
                <h1 className="text-white font-medium">{movie.title}</h1>
                {currentEpisode && (
                  <p className="text-gray-400 text-sm">
                    Episode {currentEpisode.episodeNumber}: {currentEpisode.title || ''}
                  </p>
                )}
              </div>
            </div>

            {/* Episode Navigation */}
            {episodes.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevEpisode}
                  disabled={!hasPrevEpisode}
                  className="flex items-center gap-1 px-4 py-2 bg-dark-300 text-white rounded-lg hover:bg-dark-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <button
                  onClick={() => setShowEpisodeList(!showEpisodeList)}
                  className="flex items-center gap-1 px-4 py-2 bg-dark-300 text-white rounded-lg hover:bg-dark-400 transition-colors"
                >
                  <FiList />
                  <span className="hidden sm:inline">Episodes</span>
                </button>

                <button
                  onClick={goToNextEpisode}
                  disabled={!hasNextEpisode}
                  className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Next</span>
                  <FiChevronRight />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Episode List (collapsible) */}
      {showEpisodeList && episodes.length > 0 && (
        <div className="bg-dark-100 py-6">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xl font-bold text-white mb-4">All Episodes</h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {episodes.map((episode) => (
                <Link
                  key={episode.id}
                  to={`/watch/${id}/episode/${episode.episodeNumber}`}
                  className={`px-3 py-2 rounded text-center transition-colors ${
                    episode.episodeNumber === currentEpNum
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-300 text-gray-300 hover:bg-dark-400'
                  }`}
                >
                  {episode.episodeNumber}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Movie Info */}
      <div className="bg-dark-100 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-white mb-4">{movie.title}</h2>
          <p className="text-gray-400 leading-relaxed">{movie.description}</p>
        </div>
      </div>
    </div>
  );
}

export default WatchPage;
