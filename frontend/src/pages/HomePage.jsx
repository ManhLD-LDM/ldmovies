import { useEffect, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import ContinueWatching from '../components/ContinueWatching';
import HeroSection from '../components/HeroSection';
import MovieSection from '../components/MovieSection';
import { kkphimApi } from '../services/kkphimApi';
import useDocumentTitle from '../utils/useDocumentTitle';

function HomePage() {
    useDocumentTitle('Trang Chủ - Xem Phim & Anime Vietsub Miễn Phí');

    const [featuredMovies, setFeaturedMovies] = useState([]);
    const [latestMovies, setLatestMovies] = useState([]);
    const [latestAnime, setLatestAnime] = useState([]);
    const [randomMovies, setRandomMovies] = useState([]);
    const [randomAnime, setRandomAnime] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    // Shuffle array helper
    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    useEffect(() => {
        let isCancelled = false;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(false);

                const randomMoviesPage = Math.floor(Math.random() * 4) + 2;
                const randomAnimePage = Math.floor(Math.random() * 4) + 2;

                const results = await Promise.allSettled([
                    kkphimApi.getLatestMovies(1, 20),
                    kkphimApi.getLatestAnime(1, 20),
                    kkphimApi.getAllMoviesAndSeries(randomMoviesPage, 20),
                    kkphimApi.getAllAnime(randomAnimePage, 20),
                ]);

                if (isCancelled) return;

                const allFailed = results.every((r) => r.status === 'rejected');
                if (allFailed) {
                    setError(true);
                    return;
                }

                const [moviesRes, animeRes, randomMoviesRes, randomAnimeRes] = results.map((r) =>
                    r.status === 'fulfilled' ? r.value : null
                );

                const moviesData = moviesRes?.data || [];
                const animeData = animeRes?.data || [];

                setLatestMovies(moviesData.slice(0, 10));
                setLatestAnime(animeData.slice(0, 10));

                const randomMoviesList = shuffleArray(randomMoviesRes?.data || []);
                const randomAnimeList = shuffleArray(randomAnimeRes?.data || []);

                setRandomMovies(randomMoviesList.slice(0, 10));
                setRandomAnime(randomAnimeList.slice(0, 10));

                const mixedFeatured = [
                    ...randomMoviesList.slice(0, 3),
                    ...randomAnimeList.slice(0, 2),
                ];
                setFeaturedMovies(shuffleArray(mixedFeatured.length > 0 ? mixedFeatured : moviesData.slice(0, 5)));
            } catch (err) {
                if (!isCancelled) {
                    console.error('Error fetching homepage data:', err);
                    setError(true);
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        };

        fetchData();
        return () => {
            isCancelled = true;
        };
    }, [retryCount]);

    return (
        <div>
            {/* Hero Section */}
            <HeroSection movies={featuredMovies} loading={loading} />

            {/* Continue Watching — hiển thị ngay dưới HeroSection nếu có lịch sử */}
            <div className="max-w-7xl mx-auto px-4">
                <ContinueWatching />
            </div>

            {/* Error State */}
            {error && !loading && (
                <div className="max-w-7xl mx-auto px-4 py-16 text-center">
                    <div className="bg-dark-200 border border-white/10 rounded-2xl p-8 max-w-md mx-auto">
                        <p className="text-gray-300 text-lg font-semibold mb-2">
                            Không thể tải dữ liệu trang chủ
                        </p>
                        <p className="text-gray-400 text-sm mb-6">
                            Kết nối tới máy chủ phim tạm thời bị gián đoạn. Vui lòng thử lại.
                        </p>
                        <button
                            type="button"
                            onClick={() => setRetryCount((c) => c + 1)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold transition-colors"
                        >
                            <FiRefreshCw size={16} />
                            <span>Thử lại</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Content Sections */}
            <div className="max-w-7xl mx-auto px-4">
                <MovieSection
                    title="Phim Mới Nhất"
                    movies={latestMovies}
                    loading={loading}
                    viewAllLink="/movies"
                    contentType="movie"
                />

                <MovieSection
                    title="Anime Mới Nhất"
                    movies={latestAnime}
                    loading={loading}
                    viewAllLink="/anime"
                    contentType="anime"
                />

                <MovieSection
                    title="Hôm Nay Xem Gì"
                    movies={randomMovies}
                    loading={loading}
                    viewAllLink="/movies"
                    contentType="movie"
                />

                <MovieSection
                    title="Anime Đề Xuất"
                    movies={randomAnime}
                    loading={loading}
                    viewAllLink="/anime"
                    contentType="anime"
                />
            </div>
        </div>
    );
}

export default HomePage;
