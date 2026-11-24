import { useEffect, useMemo, useState } from 'react';
import { FiPlay, FiSearch, FiX } from 'react-icons/fi';

function EpisodeList({ episodes = [], selectedEpisode, onEpisodeClick, playerRef, title = 'Danh sách tập' }) {
  const [activeRangeIndex, setActiveRangeIndex] = useState(0);
  const [episodeSearch, setEpisodeSearch] = useState('');

  // Phân nhóm 50 tập / nhóm nếu bộ phim có trên 30 tập
  const RANGE_SIZE = 50;
  const isLargeSeries = episodes.length > 30;
  const showSearch = episodes.length > 15;

  const ranges = useMemo(() => {
    if (!isLargeSeries) return [];
    return Array.from({ length: Math.ceil(episodes.length / RANGE_SIZE) }, (_, i) => {
      const start = i * RANGE_SIZE + 1;
      const end = Math.min((i + 1) * RANGE_SIZE, episodes.length);
      return { start, end, label: `Tập ${start} - ${end}`, index: i };
    });
  }, [episodes.length, isLargeSeries]);

  // Reset search khi đổi sang phim/anime khác
  useEffect(() => {
    setEpisodeSearch('');
  }, [episodes]);

  // Tự động chuyển tới nhóm tập chứa tập đang chọn
  useEffect(() => {
    if (isLargeSeries && selectedEpisode) {
      const selectedIdx = episodes.findIndex(
        (ep) => ep.name === selectedEpisode.name || ep.slug === selectedEpisode.slug
      );
      if (selectedIdx >= 0) {
        const rangeIdx = Math.floor(selectedIdx / RANGE_SIZE);
        setActiveRangeIndex(rangeIdx);
      }
    }
  }, [selectedEpisode, episodes, isLargeSeries]);

  const trimmedSearch = episodeSearch.trim().toLowerCase();

  const visibleEntries = useMemo(() => {
    if (trimmedSearch) {
      return episodes
        .map((ep, idx) => ({ ep, globalIndex: idx + 1 }))
        .filter(({ ep, globalIndex }) => {
          const nameStr = String(ep.name || '').toLowerCase();
          const slugStr = String(ep.slug || '').toLowerCase();
          return (
            nameStr.includes(trimmedSearch) ||
            slugStr.includes(trimmedSearch) ||
            String(globalIndex).includes(trimmedSearch)
          );
        });
    }

    if (isLargeSeries) {
      return episodes
        .slice(activeRangeIndex * RANGE_SIZE, (activeRangeIndex + 1) * RANGE_SIZE)
        .map((ep, idx) => ({ ep, globalIndex: activeRangeIndex * RANGE_SIZE + idx + 1 }));
    }

    return episodes.map((ep, idx) => ({ ep, globalIndex: idx + 1 }));
  }, [episodes, trimmedSearch, isLargeSeries, activeRangeIndex]);

  if (!episodes || episodes.length === 0) {
    return <p className="text-gray-400 text-center py-6 text-sm">Chưa có tập phim nào</p>;
  }

  return (
    <div className="space-y-4">
      {/* Tiêu đề & Ô tìm kiếm nhanh tập phim */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {title && (
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-gradient-to-b from-primary-500 to-violet-500 rounded-full" />
            <span>{title}</span>
            <span className="text-xs sm:text-sm font-semibold text-gray-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
              {episodes.length} tập
            </span>
          </h2>
        )}

        {showSearch && (
          <div className="relative w-full sm:w-56">
            <FiSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={episodeSearch}
              onChange={(e) => setEpisodeSearch(e.target.value)}
              placeholder="Tìm số tập..."
              aria-label="Tìm số tập"
              className="w-full pl-9 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-primary-500/70 focus:bg-white/10 transition-all"
            />
            {episodeSearch && (
              <button
                type="button"
                onClick={() => setEpisodeSearch('')}
                aria-label="Xóa tìm kiếm tập"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab khoảng tập (khi không lọc bằng search) */}
      {isLargeSeries && !trimmedSearch && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar-horizontal">
          {ranges.map((range) => {
            const isActive = range.index === activeRangeIndex;
            return (
              <button
                key={range.index}
                type="button"
                onClick={() => setActiveRangeIndex(range.index)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/15 hover:text-white border border-white/10'
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid danh sách tập với min-width 88px cố định & chống rớt dòng */}
      <div className="glass-effect rounded-2xl p-3 sm:p-5 border border-white/10 shadow-xl">
        {visibleEntries.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-gray-400 text-sm">
              Không tìm thấy tập phù hợp với &quot;{episodeSearch}&quot;
            </p>
            <button
              type="button"
              onClick={() => setEpisodeSearch('')}
              className="text-xs text-primary-400 hover:text-primary-300 font-semibold underline"
            >
              Hiển thị tất cả tập
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
            {visibleEntries.map(({ ep: episode, globalIndex }, idx) => {
              const isSelected =
                selectedEpisode?.name === episode.name ||
                (selectedEpisode?.slug && selectedEpisode?.slug === episode.slug);
              const displayName = episode.name || `Tập ${globalIndex}`;

              return (
                <button
                  key={episode.slug || episode.name || idx}
                  type="button"
                  onClick={() => onEpisodeClick(episode, playerRef)}
                  className={`h-10 px-2.5 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap flex items-center justify-center gap-1.5 transition-all transform active:scale-95 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-primary-600 via-violet-600 to-primary-500 text-white font-bold border-primary-400/50 shadow-lg shadow-primary-500/30 scale-105 z-10'
                      : 'bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border-white/10 hover:border-white/20'
                  }`}
                  title={displayName}
                >
                  {isSelected && <FiPlay className="text-white fill-current shrink-0" size={12} />}
                  <span className="truncate">{displayName}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default EpisodeList;
