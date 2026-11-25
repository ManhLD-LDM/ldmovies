import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { kkphimApi } from '../services/kkphimApi';
import useAuthStore from './authStore';
import useFavoritesStore from './favoritesStore';
import useWatchHistoryStore from './watchHistoryStore';

// Helper trích xuất từ khóa thương hiệu (franchise keyword) từ tên phim
function getFranchiseKeyword(name, originName) {
    if (!name && !originName) return null;
    const target = name || originName;
    const cleanName = target.split(/[:\-\–\—]|Movie|Phần|Season|Part/i)[0].trim();
    const wordOnly = cleanName.replace(/\s+\d+.*$/, '').trim();
    return wordOnly.length >= 3 ? wordOnly : null;
}

// Tìm tập theo tên/slug; nếu không khớp chính xác thì so theo SỐ tập.
// Cần vì mỗi nguồn đặt tên khác nhau: KKPhim "Tập 01", NguonC "1". Khi KKPhim lỗi và trang
// fallback sang NguonC, ?ep=Tập 01 / lịch sử xem vẫn phải mở đúng tập.
const episodeNumberKey = (value) => {
    const str = String(value ?? '').trim().toLowerCase();
    const match = str.match(/\d+/);
    return match ? String(Number(match[0])) : str;
};

export function findEpisodeIndex(episodes, nameOrSlug) {
    if (!nameOrSlug || !Array.isArray(episodes)) return -1;
    const exact = episodes.findIndex((ep) => ep.name === nameOrSlug || ep.slug === nameOrSlug);
    if (exact >= 0) return exact;
    const key = episodeNumberKey(nameOrSlug);
    return episodes.findIndex((ep) => episodeNumberKey(ep.name) === key);
}

/**
 * Shared hook cho MovieDetailPage & AnimeDetailPage.
 * Xử lý fetch phim, sync URL params, favorite, deep link,
 * và tự động gợi ý xem tiếp (Cùng bộ & Cùng thể loại).
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

    // Ref kiểm soát tự động khôi phục lịch sử xem (chỉ tự động mở 1 lần duy nhất khi mới mount trang)
    const hasCheckedAutoResumeRef = useRef(false);

    // Reset ref khi id phim thay đổi
    useEffect(() => {
        hasCheckedAutoResumeRef.current = false;
        setHasClosedPlayer(false);
    }, [id]);

    // State lưu gợi ý xem tiếp
    const [franchiseRecommendations, setFranchiseRecommendations] = useState([]);
    const [genreRecommendations, setGenreRecommendations] = useState([]);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);

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
        let isCancelled = false;

        const fetchContent = async () => {
            setLoading(true);
            try {
                const detail = await kkphimApi.getAnimeDetail(id);
                if (isCancelled) return;
                setContent(detail.data || null);
                setEpisodes(detail.data?.episodes || []);
            } catch (error) {
                if (!isCancelled) {
                    setContent(null);
                    setEpisodes([]);
                    console.error('Error fetching content:', error);
                    toast.error('Không thể tải thông tin phim');
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        };
        fetchContent();

        return () => {
            isCancelled = true;
        };
    }, [id]);

    // ── Fetch Recommendations (Cùng bộ & Cùng thể loại) ────────────────────
    useEffect(() => {
        if (!content) return;
        let isCancelled = false;

        const fetchRecommendations = async () => {
            setRecommendationsLoading(true);
            try {
                let franchiseItems = [];

                // 1. Gợi ý cùng bộ (Franchise Recommendations)
                const franchiseKeyword = getFranchiseKeyword(content.name, content.origin_name);
                if (franchiseKeyword) {
                    try {
                        const searchRes = await kkphimApi.searchAnime(franchiseKeyword);
                        if (isCancelled) return;
                        franchiseItems = (searchRes.data || []).filter(
                            item => item.slug !== id && item.id !== id && item.slug !== content.slug
                        );
                        setFranchiseRecommendations(franchiseItems);
                    } catch (err) {
                        if (!isCancelled) {
                            console.error('Error fetching franchise recommendations:', err);
                            setFranchiseRecommendations([]);
                        }
                    }
                } else {
                    setFranchiseRecommendations([]);
                }

                // 2. Gợi ý cùng thể loại (Genre Recommendations)
                const categories = content.category || [];
                if (categories.length > 0) {
                    try {
                        const allCatObjects = await kkphimApi.getAllCategories();
                        if (isCancelled) return;
                        
                        const matchedCatObjects = categories.map(cat => {
                            if (typeof cat === 'object' && cat.slug) return cat;
                            const catName = typeof cat === 'string' ? cat : cat.name;
                            return allCatObjects.find(c => c.name.toLowerCase() === (catName || '').toLowerCase());
                        }).filter(Boolean);

                        if (matchedCatObjects.length > 0) {
                            const isAnime = content.type === 'hoathinh';
                            const genreRes = isAnime
                                ? await kkphimApi.getCategoryPreview(matchedCatObjects[0].slug, 'anime', 24)
                                : await kkphimApi.getCategoryPreview(matchedCatObjects[0].slug, 'movie', 24);
                            if (isCancelled) return;

                            const franchiseSlugs = new Set(franchiseItems.map(f => f.slug));
                            const genreItems = (genreRes.data || []).filter(
                                item => item.slug !== id && item.id !== id && item.slug !== content.slug && !franchiseSlugs.has(item.slug)
                            );

                            setGenreRecommendations(genreItems);
                        } else {
                            setGenreRecommendations([]);
                        }
                    } catch (err) {
                        if (!isCancelled) {
                            console.error('Error fetching genre recommendations:', err);
                            setGenreRecommendations([]);
                        }
                    }
                } else {
                    setGenreRecommendations([]);
                }
            } catch (error) {
                if (!isCancelled) {
                    console.error('Error fetching recommendations:', error);
                }
            } finally {
                if (!isCancelled) {
                    setRecommendationsLoading(false);
                }
            }
        };

        fetchRecommendations();
        return () => {
            isCancelled = true;
        };
    }, [content, id]);

    // ── Sync player với URL params & Khôi phục lịch sử xem ─────────────────
    useEffect(() => {
        const episodeParam = searchParams.get('ep');
        const autoplayParam = searchParams.get('autoplay');
        const timeParam = parseInt(searchParams.get('t') || '0', 10);

        if (episodeParam && episodes.length > 0) {
            const urlEpisode = episodes[findEpisodeIndex(episodes, episodeParam)];
            if (urlEpisode) {
                setSelectedEpisode(urlEpisode);
                setShowPlayer(true);
                setInitialTime(isNaN(timeParam) ? 0 : timeParam);
                hasCheckedAutoResumeRef.current = true;
            }
        } else if (!episodeParam && episodes.length > 0) {
            if (autoplayParam === '1') {
                hasCheckedAutoResumeRef.current = true;
                const watchHistory = useWatchHistoryStore.getState().watchHistory;
                const historyItem = watchHistory.find(h => h.slug === id || h.id === id);
                let targetEpisode = episodes[0];

                if (historyItem?.episodeName) {
                    const historyEpIndex = findEpisodeIndex(episodes, historyItem.episodeName);
                    if (historyEpIndex >= 0) {
                        targetEpisode = episodes[historyEpIndex];
                        const isFinished = historyItem.duration > 0 && (historyItem.duration - historyItem.progress < 10);
                        if (isFinished && historyEpIndex + 1 < episodes.length) {
                            targetEpisode = episodes[historyEpIndex + 1];
                        }
                    }
                }

                const epParam = encodeURIComponent(targetEpisode.name || targetEpisode.slug);
                navigate(`?ep=${epParam}`, { replace: true });
                return;
            }

            // Tự động khôi phục lịch sử xem CHỈ KHI lần đầu tiên load trang và chưa xem tập nào
            if (!hasCheckedAutoResumeRef.current && !hasClosedPlayer) {
                hasCheckedAutoResumeRef.current = true;
                const watchHistory = useWatchHistoryStore.getState().watchHistory;
                const historyItem = watchHistory.find(h => h.slug === id || h.id === id);
                if (historyItem && historyItem.episodeName) {
                    const historyEpIndex = findEpisodeIndex(episodes, historyItem.episodeName);
                    
                    if (historyEpIndex >= 0) {
                        let targetEpisode = episodes[historyEpIndex];
                        const isFinished = historyItem.duration > 0 && (historyItem.duration - historyItem.progress < 10);
                        if (isFinished && historyEpIndex + 1 < episodes.length) {
                            targetEpisode = episodes[historyEpIndex + 1];
                        }
                        
                        navigate(`?ep=${encodeURIComponent(targetEpisode.name || targetEpisode.slug)}`, { replace: true });
                        return;
                    }
                }
            }
            
            // Nếu không có ?ep trong URL (do người dùng ấn BACK hoặc ấn nút Đóng player):
            setShowPlayer(false);
            setSelectedEpisode(null);
            setInitialTime(0);
        }
    }, [searchParams, episodes, id, navigate, hasClosedPlayer]);

    // ── Episode click handler ──────────────────────────────────────────────
    const handleEpisodeClick = (episode, playerRef) => {
        const isAlreadyPlaying = showPlayer && selectedEpisode;
        const epParam = encodeURIComponent(episode.name || episode.slug);
        setInitialTime(0);

        if (isAlreadyPlaying) {
            navigate(`?ep=${epParam}`, { replace: true });
        } else {
            // Mở trình phát video lần đầu bằng URL ?ep=...
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
    const favoritePendingRef = useRef(false);
    const handleFavoriteToggle = async (contentId, contentData) => {
        // Chặn bấm liên tiếp khi request trước chưa xong (tránh toast trùng / gửi 2 lần)
        if (favoritePendingRef.current) return;
        if (!isAuthenticated) {
            toast.info('Vui lòng đăng nhập để lưu yêu thích');
            return;
        }
        if (!content) return;

        favoritePendingRef.current = true;
        try {
        if (isTrueAnime) {
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
        } finally {
            favoritePendingRef.current = false;
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
        franchiseRecommendations,
        genreRecommendations,
        recommendationsLoading,
        handleEpisodeClick,
        closePlayer,
        handleFavoriteToggle,
    };
}
