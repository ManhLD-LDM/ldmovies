import { useRef } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import MovieCard from './MovieCard';

function MovieSection({ title, movies, loading, viewAllLink, contentType = 'anime' }) {
    const scrollRef = useRef(null);

    const scrollByAmount = (direction) => {
        const container = scrollRef.current;
        if (!container) return;
        const step = Math.max(container.clientWidth * 0.75, 320);
        container.scrollBy({
            left: direction === 'left' ? -step : step,
            behavior: 'smooth',
        });
    };

    if (loading) {
        return (
            <section className="py-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="h-8 bg-dark-200 rounded-lg w-48 skeleton" />
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {[...Array(6)].map((_, index) => (
                        <div key={index} className="flex-none w-44">
                            <div className="aspect-[2/3] bg-dark-200 rounded-xl skeleton" />
                            <div className="mt-3 h-4 bg-dark-200 rounded w-3/4 skeleton" />
                            <div className="mt-2 h-3 bg-dark-200 rounded w-1/2 skeleton" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (!movies || movies.length === 0) {
        return null;
    }

    return (
        <section className="py-8">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full" />
                    {title}
                </h2>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => scrollByAmount('left')}
                            aria-label={`Cuộn trái ${title}`}
                            className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 transition-colors"
                        >
                            <FiChevronLeft size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollByAmount('right')}
                            aria-label={`Cuộn phải ${title}`}
                            className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 transition-colors"
                        >
                            <FiChevronRight size={16} />
                        </button>
                    </div>
                    {viewAllLink && (
                        <Link
                            to={viewAllLink}
                            className="flex items-center gap-1 min-h-[44px] -my-3 text-gray-400 hover:text-primary-400 transition-colors duration-200 group"
                        >
                            <span className="text-sm font-medium">Xem tất cả</span>
                            <FiChevronRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
                        </Link>
                    )}
                </div>
            </div>

            {/* Horizontal Scroll Movie Cards */}
            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pt-3 pb-4 custom-scrollbar-horizontal snap-x snap-mandatory"
            >
                {movies.map((movie) => (
                    <div key={movie.id || movie.slug} className="flex-none w-40 sm:w-44 md:w-48 snap-start">
                        <MovieCard movie={movie} contentType={contentType} />
                    </div>
                ))}
            </div>
        </section>
    );
}

export default MovieSection;
