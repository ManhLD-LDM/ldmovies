import { useEffect, useState } from 'react';
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
        const fetchData = async () => {
            try {
                setLoading(true);

                // Tạo random page trước khi gọi (không cần await)
                const randomMoviesPage = Math.floor(Math.random() * 4) + 2;
                const randomAnimePage = Math.floor(Math.random() * 4) + 2;

                // FIX: Gom 4 API call độc lập vào Promise.all để fetch song song (~1x latency)
                // Thay vì await tuần tự (~4x latency như trước)
                const [moviesRes, animeRes, randomMoviesRes, randomAnimeRes] = await Promise.all([
                    kkphimApi.getLatestMovies(1, 20),
                    kkphimApi.getLatestAnime(1, 20),
                    kkphimApi.getAllMoviesAndSeries(randomMoviesPage, 20),
                    kkphimApi.getAllAnime(randomAnimePage, 20),
                ]);

                const moviesData = moviesRes.data || [];
                const animeData = animeRes.data || [];

                setLatestMovies(moviesData.slice(0, 10));
                setLatestAnime(animeData.slice(0, 10));

                const randomMoviesList = shuffleArray(randomMoviesRes.data || []);
                const randomAnimeList = shuffleArray(randomAnimeRes.data || []);

                setRandomMovies(randomMoviesList.slice(0, 10));
                setRandomAnime(randomAnimeList.slice(0, 10));

                // Create a mixed featured list for the banner to avoid potentially sensitive recent anime
                const mixedFeatured = [
                    ...randomMoviesList.slice(0, 3),
                    ...randomAnimeList.slice(0, 2)
                ];
                setFeaturedMovies(shuffleArray(mixedFeatured));

            } catch (error) {
                console.error('Error fetching homepage data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div>
            {/* Hero Section */}
            <HeroSection movies={featuredMovies} />

            {/* Continue Watching — hiển thị ngay dưới HeroSection nếu có lịch sử */}
            <div className="max-w-7xl mx-auto px-4">
                <ContinueWatching />
            </div>

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
