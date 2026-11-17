import { memo } from 'react';
import { FiPlay, FiStar, FiTv } from 'react-icons/fi';
import { Link } from 'react-router-dom';

// Poster fallback dạng SVG data URI - không cần network request
const FALLBACK_POSTER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect fill='%231E1E28' width='300' height='450'/%3E%3Ctext x='150' y='230' font-family='Arial' font-size='64' fill='%234B4B6A' text-anchor='middle'%3E🎬%3C/text%3E%3C/svg%3E`;

function MovieCard({ movie, contentType = 'movie' }) {
    const {
        id,
        slug,
        name,
        poster,
        thumb_url,
        year,
        episodes,
        quality,
        time,
    } = movie;

    const isAnimeItem = movie.type ? movie.type === 'hoathinh' : contentType === 'anime';
    const linkPath = isAnimeItem ? `/anime/${slug || id}` : `/movies/${slug || id}`;

    return (
        <Link
            to={linkPath}
            className="group block cursor-pointer"
        >
            {/* Card với hiệu ứng hover Netflix-style */}
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-dark-100 shadow-card hover-card">
                {/* Ảnh poster */}
                {(poster || thumb_url) ? (
                    <img
                        src={poster || thumb_url}
                        alt={name}
                        className="w-full h-full object-cover transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = FALLBACK_POSTER;
                        }}
                    />
                ) : (
                    <img
                        src={FALLBACK_POSTER}
                        alt={name}
                        className="w-full h-full object-cover"
                    />
                )}

                {/* Gradient phía dưới luôn hiển thị */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {/* Overlay nút play khi hover - chỉ scale overlay, không scale card lẫn img */}
                <div className="absolute inset-0 bg-primary-600/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center shadow-glow transform scale-75 group-hover:scale-100 transition-all duration-300">
                        <FiPlay className="text-white ml-1" size={24} />
                    </div>
                </div>

                {/* Badge trên cùng */}
                <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                    {/* Badge loại */}
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-primary-600/90 backdrop-blur-sm shadow-glow-sm text-white">
                        {movie.type === 'hoathinh' ? 'Anime' : (movie.type === 'series' ? 'Series' : 'Phim')}
                    </span>

                    {/* Badge chất lượng */}
                    {quality && (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-accent-gold/90 text-dark-500 flex items-center gap-1 backdrop-blur-sm">
                            <FiStar size={10} />
                            {quality}
                        </span>
                    )}
                </div>

                {/* Thông tin dưới cùng */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                    {episodes > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg glass-effect text-white">
                            <FiTv size={12} />
                            {episodes} tập
                        </span>
                    )}
                </div>
            </div>

            {/* Tiêu đề & Thông tin */}
            <div className="mt-3 px-1">
                <h3 className="text-white font-semibold line-clamp-2 group-hover:text-primary-400 transition-colors duration-200">
                    {name}
                </h3>
                <div className="flex items-center gap-2 mt-1.5">
                    {year && (
                        <span className="text-gray-400 text-sm">{year}</span>
                    )}
                    {time && year && (
                        <span className="text-gray-500">•</span>
                    )}
                    {time && (
                        <span className="text-gray-400 text-sm">{time}</span>
                    )}
                </div>
            </div>
        </Link>
    );
}

export default memo(MovieCard);
