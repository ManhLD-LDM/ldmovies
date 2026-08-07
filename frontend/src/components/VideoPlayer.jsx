import Hls from 'hls.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    FiMaximize,
    FiMinimize,
    FiPause,
    FiPlay,
    FiRotateCcw,
    FiRotateCw,
    FiVolume2,
    FiVolumeX,
    FiSettings
} from 'react-icons/fi';
import useWatchHistoryStore from '../stores/watchHistoryStore';
import useDataSaverStore from '../stores/dataSaverStore';

// ─── ProgressBar Component ──────────────────────────────────────────────────
// Tách riêng thành component con để tránh re-render toàn bộ VideoPlayer
// khi currentTime thay đổi liên tục mỗi 250ms.
function ProgressBar({ videoRef, duration }) {
    const inputRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !inputRef.current) return;

        // Dùng requestAnimationFrame để update DOM trực tiếp, không qua React state
        const tick = () => {
            if (inputRef.current && video.duration > 0) {
                const pct = (video.currentTime / video.duration) * 100;
                inputRef.current.value = video.currentTime;
                inputRef.current.style.background =
                    `linear-gradient(to right, #dc2626 ${pct}%, #4b5563 ${pct}%)`;
            }
            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [videoRef, duration]);

    const handleSeek = (e) => {
        const newTime = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
        }
    };

    return (
        <input
            ref={inputRef}
            type="range"
            min="0"
            max={duration || 100}
            defaultValue={0}
            onChange={handleSeek}
            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            style={{
                background: 'linear-gradient(to right, #dc2626 0%, #4b5563 0%)',
            }}
        />
    );
}

// ─── TimeDisplay Component ──────────────────────────────────────────────────
// Chỉ hiển thị thời gian, cập nhật qua onTimeUpdate (state nhỏ, không re-render nhiều)
function TimeDisplay({ videoRef }) {
    const [displayTime, setDisplayTime] = useState({ current: 0, total: 0 });

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let lastCurrent = -1;
        let lastTotal = -1;
        const onTimeUpdate = () => {
            const current = Math.floor(video.currentTime);
            const total = Math.floor(video.duration || 0);
            if (current !== lastCurrent || total !== lastTotal) {
                setDisplayTime({ current, total });
                lastCurrent = current;
                lastTotal = total;
            }
        };

        video.addEventListener('timeupdate', onTimeUpdate);
        return () => video.removeEventListener('timeupdate', onTimeUpdate);
    }, [videoRef]);

    const fmt = (t) => {
        if (!t || isNaN(t)) return '00:00';
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
        <span className="text-white text-[10px] md:text-sm whitespace-nowrap">
            {fmt(displayTime.current)} / {fmt(displayTime.total)}
        </span>
    );
}

// ─── VideoPlayer Component ──────────────────────────────────────────────────
/**
 * Props:
 *  - videoUrl: string          — URL của video (.m3u8 hoặc embed)
 *  - episodeName: string       — Tên tập phim hiển thị
 *  - onClose: () => void       — Callback đóng player
 *  - initialTime: number       — (Deep link) Thời gian bắt đầu tính bằng giây (từ ?t=)
 *  - historyItem: object       — Thông tin để lưu vào lịch sử xem
 */
function VideoPlayer({ videoUrl, episodeName, onClose, initialTime = 0, historyItem }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const hlsRef = useRef(null);
    const controlsTimeoutRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(() => {
        const savedVolume = localStorage.getItem('ldmovies_volume');
        return savedVolume !== null ? parseFloat(savedVolume) : 1;
    });
    const [isMuted, setIsMuted] = useState(() => {
        const savedVolume = localStorage.getItem('ldmovies_volume');
        return savedVolume !== null ? parseFloat(savedVolume) === 0 : false;
    });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const interactionStartVisible = useRef(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMobile, setIsMobile] = useState(false);

    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [levels, setLevels] = useState([]);
    const [currentLevel, setCurrentLevel] = useState(-1);
    const [isAutoQuality, setIsAutoQuality] = useState(true);
    const [showQualityMenu, setShowQualityMenu] = useState(false);

    const speedMenuRef = useRef(null);
    const qualityMenuRef = useRef(null);

    const dataSaverEnabled = useDataSaverStore((state) => state.enabled);

    // History and Resume Prompt states
    const { addToHistory, updateProgress, syncHistoryItemToBackend } = useWatchHistoryStore();
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [savedProgress, setSavedProgress] = useState(0);
    const autoResumeRef = useRef(0);

    const historyItemStr = JSON.stringify(historyItem);

    // ── Xử lý Session và Resume Prompt ──────────────────────────────────────
    useEffect(() => {
        const item = historyItemStr ? JSON.parse(historyItemStr) : null;
        if (!item || !videoUrl) return;

        const sessionKey = `watching_${item.slug}_${item.episodeName}`;
        const hasSession = sessionStorage.getItem(sessionKey);

        const watchHistory = useWatchHistoryStore.getState().watchHistory;
        const existingItem = watchHistory.find(h => h.slug === item.slug && h.episodeName === item.episodeName);
        const existingProgress = existingItem ? existingItem.progress : 0;
        const existingDuration = existingItem ? existingItem.duration : 0;

        // Khởi tạo/cập nhật history item khi load video NHƯNG giữ lại progress cũ
        addToHistory({
            ...item,
            duration: videoRef.current?.duration || existingDuration,
            progress: initialTime > 0 ? initialTime : existingProgress,
        });

        // Chỉ xử lý prompt nếu không có initialTime (từ deeplink) và chưa có session
        if (!hasSession && initialTime === 0) {
            // Nếu có tiến trình > 5 giây và chưa xem hết (< duration - 10s)
            if (existingProgress > 5 && existingDuration > 0 && existingProgress < existingDuration - 10) {
                setSavedProgress(existingProgress);
                setShowResumePrompt(true);
            } else {
                sessionStorage.setItem(sessionKey, 'true');
            }
        } else if (hasSession && initialTime === 0) {
            // Tải lại trang (F5): Lấy tiến trình để auto-resume
            if (existingProgress > 0) {
                autoResumeRef.current = existingProgress;
            }
            sessionStorage.setItem(sessionKey, 'true');
        } else {
            sessionStorage.setItem(sessionKey, 'true');
        }
    }, [historyItemStr, videoUrl, initialTime, addToHistory]); // stringify obj để không re-run vô ích

    // ── Ghi lại tiến trình xem ───────────────────────────────────────────────
    useEffect(() => {
        const item = historyItemStr ? JSON.parse(historyItemStr) : null;
        if (!item) return;
        
        let lastSaveTime = 0;
        const handleTimeUpdate = () => {
            const video = videoRef.current;
            if (!video) return;
            
            const now = Date.now();
            // Cập nhật tiến trình mỗi 5 giây
            if (now - lastSaveTime > 5000 && video.currentTime > 0) {
                updateProgress(item.slug, item.episodeName, video.currentTime, video.duration);
                lastSaveTime = now;
            }
        };

        const video = videoRef.current;
        if (video) {
            video.addEventListener('timeupdate', handleTimeUpdate);
        }
        
        return () => {
            if (video) {
                video.removeEventListener('timeupdate', handleTimeUpdate);
            }
        };
    }, [historyItemStr, updateProgress]);

    // ── Sync history on unmount or beforeunload ──────────────────────────────
    useEffect(() => {
        const item = historyItemStr ? JSON.parse(historyItemStr) : null;
        if (!item) return;

        const syncToBackend = () => {
            const watchHistory = useWatchHistoryStore.getState().watchHistory;
            const currentItem = watchHistory.find(h => h.slug === item.slug && h.episodeName === item.episodeName);
            if (currentItem) {
                syncHistoryItemToBackend(currentItem);
            }
        };

        window.addEventListener('beforeunload', syncToBackend);
        
        return () => {
            window.removeEventListener('beforeunload', syncToBackend);
            syncToBackend(); // Sync on unmount
        };
    }, [historyItemStr, syncHistoryItemToBackend]);

    // Click outside handler for menus
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (speedMenuRef.current && !speedMenuRef.current.contains(e.target)) setShowSpeedMenu(false);
            if (qualityMenuRef.current && !qualityMenuRef.current.contains(e.target)) setShowQualityMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Detect mobile ──────────────────────────────────────────────────────
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // ── HLS.js setup ───────────────────────────────────────────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoUrl) return;

        // Fix cho Firefox: Xóa trạng thái của thẻ video trước khi nạp tập mới
        video.pause();
        video.removeAttribute('src');
        video.load();
        
        setIsLoading(true);

        // Cleanup HLS instance cũ nếu có
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        const isM3U8 = videoUrl.includes('.m3u8') || videoUrl.includes('m3u8');

        if (isM3U8) {
            if (Hls.isSupported()) {
                const savedQuality = localStorage.getItem('ldmovies_quality');
                const isAuto = !savedQuality || savedQuality === 'Auto' || savedQuality === '-1';

                // Chrome, Firefox, Edge: dùng hls.js với Data Saver tối ưu
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: false,
                    maxBufferLength: dataSaverEnabled ? 15 : 30, // 15s forward buffer khi bật Data Saver
                    maxMaxBufferLength: dataSaverEnabled ? 30 : 60,
                    startLevel: (dataSaverEnabled || !isAuto) ? 0 : -1, // Force start level 0 (thấp nhất) khi bật Data Saver
                    capLevelToPlayerSize: true, // Không bao giờ tải resolution > kích thước player
                    capLevelOnFPSDrop: true,
                    maxBufferSize: dataSaverEnabled ? 10 * 1000 * 1000 : 20 * 1000 * 1000,
                    backBufferLength: 30,
                    abrEwmaDefaultEstimate: dataSaverEnabled ? 400_000 : 800_000,
                    startFragPrefetch: false,
                });
                hlsRef.current = hls;
                
                // Chuẩn flow Hls.js: bind media trước khi loadSource
                hls.attachMedia(video);
                hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                    hls.loadSource(videoUrl);
                });

                hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                    // Áp dụng initialTime sau khi manifest sẵn sàng
                    if (initialTime > 0) {
                        video.currentTime = initialTime;
                    } else if (autoResumeRef.current > 0) {
                        video.currentTime = autoResumeRef.current;
                    }
                    setIsLoading(false);
                    video.play().catch(e => console.log('Auto-play blocked:', e));

                    // Lọc và lưu danh sách chất lượng video (chỉ lấy 1080, 720, 480, 360 nếu có)
                    if (data.levels && data.levels.length > 0) {
                        let mappedLevels = data.levels.map((l, idx) => ({ ...l, originalIndex: idx }));
                        const desiredHeights = [1080, 720, 480, 360];
                        let filteredLevels = mappedLevels.filter(l => 
                            desiredHeights.some(h => Math.abs(h - l.height) <= 50)
                        );
                        if (filteredLevels.length === 0) {
                            filteredLevels = mappedLevels;
                        }
                        filteredLevels.sort((a,b) => b.height - a.height);
                        setLevels(filteredLevels);

                        // --- Data Saver Enforcement ---
                        if (dataSaverEnabled) {
                            // Ép trần chất lượng tối đa (autoLevelCapping) không cho HLS auto nhảy lên 720p / 1080p
                            const maxAllowedHeight = 480;
                            let maxCapIndex = 0;
                            data.levels.forEach((l, idx) => {
                                if (l.height <= maxAllowedHeight + 50) {
                                    maxCapIndex = Math.max(maxCapIndex, idx);
                                }
                            });

                            hls.autoLevelCapping = maxCapIndex;
                            hls.currentLevel = maxCapIndex;
                            setCurrentLevel(maxCapIndex);
                            setIsAutoQuality(false);
                        } else {
                            hls.autoLevelCapping = -1;
                            if (isAuto) {
                                hls.currentLevel = -1;
                                setIsAutoQuality(true);
                            } else {
                                const isMobileScreen = window.innerWidth <= 768;
                                const targetHeight = parseInt(savedQuality, 10) || (isMobileScreen ? 480 : 720);
                                let targetLevel = filteredLevels.find(l => Math.abs(l.height - targetHeight) <= 50);
                                
                                if (targetLevel) {
                                    hls.currentLevel = targetLevel.originalIndex;
                                    setCurrentLevel(targetLevel.originalIndex);
                                    setIsAutoQuality(false);
                                } else {
                                    const lowestLevel = filteredLevels[filteredLevels.length - 1];
                                    hls.currentLevel = lowestLevel.originalIndex;
                                    setCurrentLevel(lowestLevel.originalIndex);
                                    setIsAutoQuality(false);
                                }
                            }
                        }
                    }
                });
                hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                    setCurrentLevel(data.level);
                });
                hls.on(Hls.Events.ERROR, (_, data) => {
                    if (data.fatal) {
                        setError('Không thể tải video. Vui lòng thử tập khác.');
                        setIsLoading(false);
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari: hỗ trợ HLS native
                video.src = videoUrl;
                const onMeta = () => {
                    if (initialTime > 0) video.currentTime = initialTime;
                    else if (autoResumeRef.current > 0) video.currentTime = autoResumeRef.current;
                    setIsLoading(false);
                    video.play().catch(e => console.log('Auto-play blocked:', e));
                    video.removeEventListener('loadedmetadata', onMeta);
                };
                video.addEventListener('loadedmetadata', onMeta);
            } else {
                setError('Trình duyệt của bạn không hỗ trợ định dạng HLS.');
                setIsLoading(false);
            }
        } else {
            // Direct video URL (mp4, webm, …)
            video.src = videoUrl;
            const onMeta = () => {
                if (initialTime > 0 || autoResumeRef.current > 0) {
                    video.currentTime = initialTime > 0 ? initialTime : autoResumeRef.current;
                }
                setIsLoading(false);
                video.play().catch(e => console.log('Auto-play blocked:', e));
                video.removeEventListener('loadedmetadata', onMeta);
            };
            video.addEventListener('loadedmetadata', onMeta);
        }

        // Cleanup khi component unmount hoặc videoUrl thay đổi
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [videoUrl, initialTime, dataSaverEnabled]);

    // Dừng tải fragment khi tab ẩn / video pause để tiết kiệm data
    useEffect(() => {
        const onVisibilityChange = () => {
            const hls = hlsRef.current;
            if (!hls) return;
            if (document.hidden && videoRef.current?.paused) {
                hls.stopLoad();
            } else if (!document.hidden) {
                hls.startLoad();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, []);

    // ── Controls hide/show ─────────────────────────────────────────────────
    // Fix: memory leak — cleanup timeout khi unmount
    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, []);

    const handleMouseMove = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
    }, []);

    const handleTouchStart = useCallback(() => {
        setShowControls(prev => {
            interactionStartVisible.current = prev;
            return true;
        });
    }, []);

    // ── Playback controls ──────────────────────────────────────────────────
    const togglePlay = useCallback(() => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
        } else {
            videoRef.current.pause();
        }
    }, []);

    const skip = useCallback((seconds) => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.max(
                0,
                Math.min(videoRef.current.currentTime + seconds, videoRef.current.duration || 0)
            );
        }
    }, []);

    const lastTapRef = useRef({ time: 0, didTogglePlay: false });
    const handleVideoClick = useCallback((e) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        const wasHidden = !interactionStartVisible.current;
        
        if (now - lastTapRef.current.time < DOUBLE_TAP_DELAY) {
            // Double tap detected
            
            // Revert single tap's togglePlay only if the first tap actually toggled it
            if (lastTapRef.current.didTogglePlay) {
                togglePlay(); 
            }
            
            lastTapRef.current = { time: 0, didTogglePlay: false };
            
            const rect = e.target.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            if (clickX > rect.width / 2) {
                skip(5);
            } else {
                skip(-5);
            }
        } else {
            // Single tap
            if (wasHidden) {
                // Just wake up UI, don't pause/play
                setShowControls(true);
                lastTapRef.current = { time: now, didTogglePlay: false };
            } else {
                togglePlay();
                lastTapRef.current = { time: now, didTogglePlay: true };
            }
        }
    }, [skip, togglePlay]);

    const changeSpeed = useCallback((rate) => {
        if (videoRef.current) {
            videoRef.current.playbackRate = rate;
            setPlaybackRate(rate);
            setShowSpeedMenu(false);
        }
    }, []);

    const changeQuality = useCallback((levelIndex) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = levelIndex;
            setIsAutoQuality(levelIndex === -1);
            if (levelIndex !== -1) {
                setCurrentLevel(levelIndex);
                const levelObj = hlsRef.current.levels[levelIndex];
                if (levelObj) {
                    localStorage.setItem('ldmovies_quality', levelObj.height.toString());
                }
            } else {
                localStorage.setItem('ldmovies_quality', 'Auto');
            }
            setShowQualityMenu(false);
        }
    }, []);

    const toggleFullscreen = useCallback(() => {
        const isIOSFullscreen = videoRef.current && videoRef.current.webkitDisplayingFullscreen;

        if (!document.fullscreenElement && !isIOSFullscreen) {
            if (containerRef.current?.requestFullscreen) {
                containerRef.current.requestFullscreen();
            } else if (containerRef.current?.webkitRequestFullscreen) {
                containerRef.current.webkitRequestFullscreen();
            } else if (videoRef.current?.webkitEnterFullscreen) {
                // Fallback cho iOS Safari (chỉ hỗ trợ fullscreen trên thẻ video)
                videoRef.current.webkitEnterFullscreen();
            }
        } else {
            if (isIOSFullscreen) {
                videoRef.current.webkitExitFullscreen?.();
            } else {
                (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
            }
        }
    }, []);

    const toggleMute = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    }, []);

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        localStorage.setItem('ldmovies_volume', newVolume.toString());
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            setIsMuted(newVolume === 0);
        }
    };

    // Áp dụng volume khởi tạo khi load video
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume;
            videoRef.current.muted = isMuted;
        }
    }, [videoUrl]);

    // ── Keyboard shortcuts ─────────────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Do not trigger shortcuts if the user is typing in an input or textarea
            if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
                return;
            }

            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (!e.repeat) skip(-5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (!e.repeat) skip(5);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setVolume(prev => {
                        const newVol = Math.min(1, prev + 0.1);
                        localStorage.setItem('ldmovies_volume', newVol.toString());
                        if (videoRef.current) {
                            videoRef.current.volume = newVol;
                            setIsMuted(newVol === 0);
                        }
                        return newVol;
                    });
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setVolume(prev => {
                        const newVol = Math.max(0, prev - 0.1);
                        localStorage.setItem('ldmovies_volume', newVol.toString());
                        if (videoRef.current) {
                            videoRef.current.volume = newVol;
                            setIsMuted(newVol === 0);
                        }
                        return newVol;
                    });
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'Escape':
                    if (document.fullscreenElement) {
                        document.exitFullscreen?.();
                    } else if (onClose) {
                        onClose();
                    }
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, skip, toggleFullscreen, toggleMute, onClose]);

    // ── Fullscreen change event ────────────────────────────────────────────
    useEffect(() => {
        const lockOrientation = () => {
            if (window.screen?.orientation?.lock) {
                window.screen.orientation.lock('landscape').catch(e => console.log('Orientation lock error:', e));
            } else if (window.screen?.lockOrientation) {
                window.screen.lockOrientation('landscape');
            } else if (window.screen?.mozLockOrientation) {
                window.screen.mozLockOrientation('landscape');
            } else if (window.screen?.msLockOrientation) {
                window.screen.msLockOrientation('landscape');
            }
        };

        const unlockOrientation = () => {
            if (window.screen?.orientation?.unlock) {
                window.screen.orientation.unlock();
            } else if (window.screen?.unlockOrientation) {
                window.screen.unlockOrientation();
            } else if (window.screen?.mozUnlockOrientation) {
                window.screen.mozUnlockOrientation();
            } else if (window.screen?.msUnlockOrientation) {
                window.screen.msUnlockOrientation();
            }
        };

        const handleFsChange = () => {
            const isFs = !!document.fullscreenElement;
            setIsFullscreen(isFs);
            if (isFs) lockOrientation();
            else unlockOrientation();
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        
        // Hỗ trợ cập nhật state cho iOS Safari khi dùng webkitEnterFullscreen
        const video = videoRef.current;
        const handleWebkitBeginFs = () => {
            setIsFullscreen(true);
            lockOrientation();
        };
        const handleWebkitEndFs = () => {
            setIsFullscreen(false);
            unlockOrientation();
        };
        
        if (video) {
            video.addEventListener('webkitbeginfullscreen', handleWebkitBeginFs);
            video.addEventListener('webkitendfullscreen', handleWebkitEndFs);
        }

        return () => {
            document.removeEventListener('fullscreenchange', handleFsChange);
            if (video) {
                video.removeEventListener('webkitbeginfullscreen', handleWebkitBeginFs);
                video.removeEventListener('webkitendfullscreen', handleWebkitEndFs);
            }
        };
    }, [videoUrl]);

    // ── Check embed URL ────────────────────────────────────────────────────
    const isM3U8Url = videoUrl?.includes('.m3u8') || videoUrl?.includes('m3u8');
    const isEmbedUrl = !isM3U8Url && (videoUrl?.includes('embed') || videoUrl?.includes('player') || videoUrl?.includes('share'));

    if (isEmbedUrl) {
        return (
            <div
                ref={containerRef}
                className="relative bg-black rounded-lg overflow-hidden"
                style={{ aspectRatio: '16/9' }}
            >
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-40 pointer-events-none">
                    <span className="text-white font-medium text-sm md:text-base drop-shadow-md">{episodeName}</span>
                </div>
                <iframe
                    src={videoUrl}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    frameBorder="0"
                    title={episodeName}
                />
            </div>
        );
    }

    // ── Native / HLS video player ──────────────────────────────────────────
    const roundedClass = isFullscreen ? '' : 'rounded-lg';
    const roundedTopClass = isFullscreen ? '' : 'rounded-t-lg';
    const roundedBottomClass = isFullscreen ? '' : 'rounded-b-lg';

    return (
        <div
            ref={containerRef}
            className={`relative bg-black ${roundedClass} group aspect-video w-full`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
            onTouchStart={handleTouchStart}
        >
            {/* Episode name */}
            <div
                onClickCapture={(e) => {
                    if (!interactionStartVisible.current) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }}
                onMouseDownCapture={(e) => {
                    if (!interactionStartVisible.current) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }}
                onPointerDownCapture={(e) => {
                    if (!interactionStartVisible.current) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }}
                className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-4 z-40 pointer-events-none transition-opacity ${roundedTopClass} ${showControls ? 'opacity-100' : 'opacity-0'}`}
            >
                <span className="text-white font-medium text-sm md:text-base drop-shadow-md">{episodeName}</span>
            </div>

            {/* Video element — src bị set bởi useEffect HLS */}
            <video
                ref={videoRef}
                className={`w-full h-full object-contain cursor-pointer ${roundedClass}`}
                onClick={handleVideoClick}
                onLoadedMetadata={() => {
                    setDuration(videoRef.current?.duration || 0);
                    setIsLoading(false);
                }}
                onWaiting={() => setIsLoading(true)}
                onPlaying={() => {
                    setIsLoading(false);
                    setIsPlaying(true);
                }}
                onPause={() => setIsPlaying(false)}
                onError={() => {
                    // Chỉ trigger error khi không dùng HLS (HLS tự xử lý lỗi)
                    if (!hlsRef.current) {
                        setError('Không thể phát video. Vui lòng thử tập khác.');
                        setIsLoading(false);
                    }
                }}
                playsInline
            />

            {/* Loading spinner */}
            {isLoading && (
                <div className={`absolute inset-0 flex items-center justify-center bg-black/50 ${roundedClass}`}>
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className={`absolute inset-0 flex items-center justify-center bg-black/80 ${roundedClass}`}>
                    <p className="text-red-400 text-center px-4">{error}</p>
                </div>
            )}

            {/* Resume Prompt Dialog */}
            {showResumePrompt && (
                <div className={`absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto ${roundedClass}`}>
                    <div className="bg-dark-200 p-6 rounded-2xl max-w-sm w-full mx-4 text-center shadow-2xl border border-white/10">
                        <h3 className="text-xl font-bold text-white mb-2">Tiếp tục xem?</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Bạn đã xem đến <span className="text-primary-500 font-semibold">{Math.floor(savedProgress / 60)}:{String(Math.floor(savedProgress % 60)).padStart(2, '0')}</span>. Bạn có muốn xem tiếp không?
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (videoRef.current) {
                                        videoRef.current.currentTime = savedProgress;
                                        videoRef.current.play().catch(e => console.log('Auto-play failed:', e));
                                    }
                                    sessionStorage.setItem(`watching_${historyItem.slug}_${historyItem.episodeName}`, 'true');
                                    setShowResumePrompt(false);
                                    setIsPlaying(true);
                                }}
                                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors flex-1"
                            >
                                Tiếp tục
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (videoRef.current) {
                                        videoRef.current.currentTime = 0;
                                        videoRef.current.play().catch(e => console.log('Auto-play failed:', e));
                                    }
                                    sessionStorage.setItem(`watching_${historyItem.slug}_${historyItem.episodeName}`, 'true');
                                    setShowResumePrompt(false);
                                    setIsPlaying(true);
                                }}
                                className="px-5 py-2.5 bg-dark-400 hover:bg-dark-500 text-white rounded-xl font-semibold transition-colors flex-1"
                            >
                                Từ đầu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Play/Pause overlay */}
            {!isPlaying && !isLoading && !error && !showResumePrompt && (
                <div
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                    onClick={togglePlay}
                >
                    <div className="w-20 h-20 bg-primary-600/80 rounded-full flex items-center justify-center">
                        <FiPlay size={40} className="text-white ml-2" />
                    </div>
                </div>
            )}

            {/* Controls */}
            <div
                onClickCapture={(e) => {
                    if (!interactionStartVisible.current) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }}
                onMouseDownCapture={(e) => {
                    if (!interactionStartVisible.current) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }}
                onPointerDownCapture={(e) => {
                    if (!interactionStartVisible.current) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }}
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 sm:p-4 transition-opacity ${roundedBottomClass} ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                {/* Progress bar — Component con tách riêng, không re-render VideoPlayer */}
                <div className="mb-3">
                    <ProgressBar videoRef={videoRef} duration={duration} />
                </div>

                {/* Control buttons */}
                <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-2">
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                        {/* Play/Pause */}
                        <button
                            onClick={togglePlay}
                            className="text-white hover:text-primary-500 transition-colors p-2 md:p-0"
                        >
                            {isPlaying
                                ? <FiPause size={isMobile ? 20 : 24} />
                                : <FiPlay size={isMobile ? 20 : 24} />}
                        </button>

                        {/* Skip backward */}
                        <button
                            onClick={() => skip(-5)}
                            className="text-white hover:text-primary-500 transition-colors flex items-center gap-1 p-2 md:p-0"
                            title="Lùi 5 giây"
                        >
                            <FiRotateCcw size={isMobile ? 18 : 20} />
                            {!isMobile && <span className="text-xs">5s</span>}
                        </button>

                        {/* Skip forward */}
                        <button
                            onClick={() => skip(5)}
                            className="text-white hover:text-primary-500 transition-colors flex items-center gap-1 p-2 md:p-0"
                            title="Tiến 5 giây"
                        >
                            <FiRotateCw size={isMobile ? 18 : 20} />
                            {!isMobile && <span className="text-xs">5s</span>}
                        </button>

                        {/* Skip Intro 90s */}
                        <button
                            onClick={(e) => { e.stopPropagation(); skip(90); }}
                            className="text-white hover:text-primary-500 transition-colors flex items-center gap-1 p-1 md:p-0 ml-1"
                            title="Bỏ qua Opening (90s)"
                        >
                            <span className="text-[10px] md:text-xs font-bold border border-white/50 rounded px-1.5 py-0.5 bg-black/40 hover:bg-white/20 hover:border-white transition-all">
                                +90s
                            </span>
                        </button>

                        {/* Volume — ẩn trên mobile */}
                        {!isMobile && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleMute}
                                    className="text-white hover:text-primary-500 transition-colors"
                                >
                                    {isMuted || volume === 0
                                        ? <FiVolumeX size={20} />
                                        : <FiVolume2 size={20} />}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        )}

                        {/* Time display — component con riêng */}
                        <TimeDisplay videoRef={videoRef} />
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Speed Control */}
                        <div className="relative" ref={speedMenuRef}>
                            <button
                                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                className="text-white hover:text-primary-500 transition-colors text-[10px] md:text-xs font-semibold px-2 py-1 bg-black/40 rounded hover:bg-white/20"
                                title="Tốc độ phát"
                            >
                                {playbackRate}x
                            </button>
                            {showSpeedMenu && (
                                <div className="absolute bottom-full left-0 md:left-1/2 md:-translate-x-1/2 mb-2 w-32 md:w-20 bg-black/90 border border-white/20 rounded-lg shadow-xl overflow-hidden z-50">
                                    <div className="grid grid-cols-2 md:grid-cols-1 p-1">
                                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                                            <button
                                                key={rate}
                                                onClick={() => changeSpeed(rate)}
                                                className={`w-full text-center md:text-left px-2 md:px-3 py-1.5 text-xs rounded hover:bg-white/20 transition-colors ${playbackRate === rate ? 'bg-white/10 text-primary-500 font-bold' : 'text-white'}`}
                                            >
                                                {rate === 1 ? 'Chuẩn' : `${rate}x`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quality Control */}
                        {levels.length > 0 && (
                            <div className="relative" ref={qualityMenuRef}>
                                <button
                                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                                    className="text-white hover:text-primary-500 transition-colors text-[10px] md:text-xs font-semibold px-2 py-1 bg-black/40 rounded hover:bg-white/20 flex items-center gap-1"
                                    title="Chất lượng video"
                                >
                                    <FiSettings size={isMobile ? 12 : 14} />
                                    {isAutoQuality 
                                        ? `Auto${levels.find(l => l.originalIndex === currentLevel) ? ` (${levels.find(l => l.originalIndex === currentLevel).height}p)` : ''}` 
                                        : `${levels.find(l => l.originalIndex === currentLevel)?.height || ''}p`}
                                </button>
                                {showQualityMenu && (
                                    <div className="absolute bottom-full left-0 md:right-0 md:left-auto mb-2 w-28 bg-black/90 border border-white/20 rounded-lg shadow-xl overflow-hidden z-50">
                                        <button
                                            onClick={() => changeQuality(-1)}
                                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/20 transition-colors ${isAutoQuality ? 'text-primary-500 font-bold bg-white/10' : 'text-white'}`}
                                        >
                                            Auto
                                        </button>
                                        {levels.map((level) => (
                                            <button
                                                key={level.originalIndex}
                                                onClick={() => changeQuality(level.originalIndex)}
                                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/20 transition-colors ${!isAutoQuality && currentLevel === level.originalIndex ? 'text-primary-500 font-bold bg-white/10' : 'text-white'}`}
                                            >
                                                {level.height}p
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Fullscreen */}
                        <button
                            onClick={toggleFullscreen}
                            className="text-white hover:text-primary-500 transition-colors p-2 md:p-1"
                            title={isFullscreen ? 'Thu nhỏ' : 'Phóng to'}
                        >
                            {isFullscreen
                                ? <FiMinimize size={isMobile ? 24 : 24} />
                                : <FiMaximize size={isMobile ? 24 : 24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom styles for range input thumb */}
            <style>{`
                .slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 14px;
                    height: 14px;
                    background: #dc2626;
                    border-radius: 50%;
                    cursor: pointer;
                }
                .slider::-moz-range-thumb {
                    width: 14px;
                    height: 14px;
                    background: #dc2626;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                }
            `}</style>
        </div>
    );
}

export default VideoPlayer;
