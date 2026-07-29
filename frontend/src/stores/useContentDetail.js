import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { kkphimApi } from '../services/kkphimApi';
import useAuthStore from './authStore';
import useFavoritesStore from './favoritesStore';
import useWatchHistoryStore from './watchHistoryStore';

/**
 * Shared hook cho MovieDetailPage & AnimeDetailPage.
 * Loại bỏ logic trùng lặp giữa 2 trang: fetch phim, sync URL params,
 * xử lý favorite, và deep link timestamp.
 *
 * @param {string} id - slug hoặc id của phim/anime (từ useParams)
 */
export function useContentDetail(id) {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const { isAuthenticated } = useAuthStore();
    const {
        addFavoriteAnime, removeFavoriteAnime, isAnimeFavorited, fetchFavoriteAnime,
        addFavoriteMovie, removeFavoriteMovie, isMovieFavorited, fetchFavoriteMovies,
    } = useFavoritesStore();

    const [content, setContent] = useState(null);  // movie hoặc anime object
    const [episodes, setEpisodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEpisode, setSelectedEpisode] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [initialTime, setInitialTime] = useState(0);
    const [hasClosedPlayer, setHasClosedPlayer] = useState(false);

    // Xác định loại nội dung: hoathinh = true anime; series/single = movie
    const isTrueAnime = content?.type === 'hoathinh';
    const isFavorited = content
        ? (isTrueAnime ? isAnimeFavorited(id) : isMovieFavorited(id))
        : false;

    // ── Fetch favorites khi auth thay đổi ─────────────────────────────────
    useEffect(() => {
        if (isAuthenticated) {
            fetchFavoriteAnime();
            fetchFavoriteMovies();
        }
    }, [isAuthenticated]);

    // ── Fetch content từ kkphimApi ─────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        const fetchContent = async () => {
            setLoading(true);
            try {
                const detail = await kkphimApi.getAnimeDetail(id);
                setContent(detail.data || null);
                setEpisodes(detail.data?.episodes || []);
            } catch (error) {
                setContent(null);
                setEpisodes([]);
                console.error('Error fetching content:', error);
                toast.error('Không thể tải thông tin phim');
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, [id]);

    // ── Sync player với URL params ─────────────────────────────────────────
    // Deep link format: ?ep=<tên tập>&t=<giây>
    useEffect(() => {
        const episodeParam = searchParams.get('ep');
        const timeParam = parseInt(searchParams.get('t') || '0', 10);

        if (episodeParam && episodes.length > 0) {
            const urlEpisode = episodes.find(
                ep => ep.name === episodeParam || ep.slug === episodeParam
            );
            if (urlEpisode) {
                setSelectedEpisode(urlEpisode);
                setShowPlayer(true);
                setInitialTime(isNaN(timeParam) ? 0 : timeParam);
            }
        } else if (!episodeParam && episodes.length > 0) {
            // Kiểm tra lịch sử xem để tự động mở tập phim đang xem dở
            if (!hasClosedPlayer) {
                const watchHistory = useWatchHistoryStore.getState().watchHistory;
                const historyItem = watchHistory.find(h => h.slug === id || h.id === id);
                if (historyItem && historyItem.episodeName) {
                    const historyEpIndex = episodes.findIndex(
                        ep => ep.name === historyItem.episodeName || ep.slug === historyItem.episodeName
                    );
                    
                    if (historyEpIndex >= 0) {
                        let targetEpisode = episodes[historyEpIndex];
                        // Nếu đã xem hết (còn < 10s) và có tập tiếp theo -> Chuyển tập tiếp
                        const isFinished = historyItem.duration > 0 && (historyItem.duration - historyItem.progress < 10);
                        if (isFinished && historyEpIndex + 1 < episodes.length) {
                            targetEpisode = episodes[historyEpIndex + 1];
                        }
                        
                        navigate(`?ep=${targetEpisode.name || targetEpisode.slug}`, { replace: true });
                        return; // Ngừng thực thi để đợi URL cập nhật
                    }
                }
            }
            
            setShowPlayer(false);
            setSelectedEpisode(null);
            setInitialTime(0);
        }
    }, [searchParams, episodes, id, navigate, hasClosedPlayer]);

    // ── Episode click handler ──────────────────────────────────────────────
    const handleEpisodeClick = (episode, playerRef) => {
        const isAlreadyPlaying = showPlayer && selectedEpisode;
        const epParam = episode.name || episode.slug;
        setInitialTime(0); // Reset timestamp khi đổi tập

        if (isAlreadyPlaying) {
            navigate(`?ep=${epParam}`, { replace: true });
        } else {
            navigate(`?ep=${epParam}`);
        }

        setTimeout(() => {
            playerRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    // ── Close player ───────────────────────────────────────────────────────
    const closePlayer = () => {
        setHasClosedPlayer(true);
        navigate(location.pathname, { replace: true });
    };

    // ── Favorite toggle ────────────────────────────────────────────────────
    const handleFavoriteToggle = async (contentId, contentData) => {
        if (!isAuthenticated) {
            toast.info('Vui lòng đăng nhập để lưu yêu thích');
            return;
        }
        if (!content) return;

        if (isTrueAnime) {
            // Xử lý anime favorite
            if (isFavorited) {
                const result = await removeFavoriteAnime(contentId);
                result.success
                    ? toast.success('Đã xóa khỏi danh sách yêu thích')
                    : toast.error(result.message);
            } else {
                const result = await addFavoriteAnime({
                    animeId: contentId,
                    title: contentData.name,
                    poster: contentData.poster_url || contentData.thumb_url,
                });
                result.success
                    ? toast.success('Đã thêm vào danh sách yêu thích')
                    : toast.error(result.message);
            }
        } else {
            // Xử lý movie/series favorite
            if (isFavorited) {
                const result = await removeFavoriteMovie(contentId);
                result.success
                    ? toast.success('Đã xóa khỏi danh sách yêu thích')
                    : toast.error(result.message);
            } else {
                const result = await addFavoriteMovie({
                    movieId: contentId,
                    title: contentData.name || contentData.title,
                    poster: contentData.poster || contentData.poster_url,
                });
                result.success
                    ? toast.success('Đã thêm vào danh sách yêu thích')
                    : toast.error(result.message);
            }
        }
    };

    return {
        content,
        episodes,
        loading,
        selectedEpisode,
        showPlayer,
        initialTime,
        isFavorited,
        isTrueAnime,
        handleEpisodeClick,
        closePlayer,
        handleFavoriteToggle,
    };
}
