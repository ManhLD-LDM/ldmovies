import { useState, useEffect } from 'react';
import { FiPlay } from 'react-icons/fi';

function EpisodeList({ episodes = [], selectedEpisode, onEpisodeClick, playerRef, title = "Danh sách tập" }) {
  const [activeRangeIndex, setActiveRangeIndex] = useState(0);

  // Phân nhóm tập 50 tập / nhóm nếu bộ phim có trên 30 tập
  const RANGE_SIZE = 50;
  const isLargeSeries = episodes.length > 30;

  const ranges = isLargeSeries
    ? Array.from({ length: Math.ceil(episodes.length / RANGE_SIZE) }, (_, i) => {
        const start = i * RANGE_SIZE + 1;
        const end = Math.min((i + 1) * RANGE_SIZE, episodes.length);
        return { start, end, label: `Tập ${start} - ${end}`, index: i };
      })
    : [];

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

  if (!episodes || episodes.length === 0) {
    return <p className="text-gray-400 text-center py-6 text-sm">Chưa có tập phim nào</p>;
  }

  const visibleEpisodes = isLargeSeries
    ? episodes.slice(activeRangeIndex * RANGE_SIZE, (activeRangeIndex + 1) * RANGE_SIZE)
    : episodes;

  return (
    <div className="space-y-4">
      {/* Tiêu đề & Các tab chọn khoảng tập (Cho phim dài tập) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {title && (
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="w-1.5 h-6 bg-gradient-to-b from-red-500 to-pink-500 rounded-full" />
            <span>{title}</span>
            <span className="text-xs sm:text-sm font-semibold text-gray-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
              {episodes.length} tập
            </span>
          </h2>
        )}

        {/* Tab khoảng tập */}
        {isLargeSeries && (
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
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
                      : 'bg-white/5 text-gray-400 hover:bg-white/15 hover:text-white border border-white/10'
                  }`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid danh sách tập với min-width 88px cố định & chống rớt dòng */}
      <div className="glass-effect rounded-2xl p-3 sm:p-5 border border-white/10 shadow-xl">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
          {visibleEpisodes.map((episode, idx) => {
            const isSelected =
              selectedEpisode?.name === episode.name ||
              (selectedEpisode?.slug && selectedEpisode?.slug === episode.slug);
            const globalIndex = isLargeSeries ? activeRangeIndex * RANGE_SIZE + idx + 1 : idx + 1;
            const displayName = episode.name || `Tập ${globalIndex}`;

            return (
              <button
                key={episode.slug || episode.name || idx}
                type="button"
                onClick={() => onEpisodeClick(episode, playerRef)}
                className={`h-10 px-2.5 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap flex items-center justify-center gap-1.5 transition-all transform active:scale-95 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-red-600 via-pink-600 to-red-500 text-white font-bold border-red-400/50 shadow-lg shadow-red-500/30 scale-105 z-10'
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
      </div>
    </div>
  );
}

export default EpisodeList;
