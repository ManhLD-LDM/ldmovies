import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

function Pagination({ currentPage, totalPages, onPageChange, scrollToTop = true }) {
  if (!totalPages || totalPages <= 1) return null;

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate page numbers array with ellipses
  const getPageNumbers = () => {
    const maxVisiblePages = 5;
    const pages = [];

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        startPage = 2;
        endPage = 4;
      } else if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3;
        endPage = totalPages - 1;
      }

      pages.push(1);

      if (startPage > 2) {
        pages.push('ellipsis-start');
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages - 1) {
        pages.push('ellipsis-end');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2 my-8 flex-wrap font-medium">
      {/* Previous Button */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 rounded-lg border border-dark-400 bg-dark-300 hover:bg-dark-400 text-white disabled:opacity-30 disabled:hover:bg-dark-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        aria-label="Trang trước"
      >
        <FiChevronLeft size={18} />
        <span className="hidden sm:inline">Trước</span>
      </button>

      {/* Page Numbers */}
      {pageNumbers.map((page, index) => {
        if (page === 'ellipsis-start' || page === 'ellipsis-end') {
          return (
            <span key={`${page}-${index}`} className="px-3 py-2 text-gray-500 select-none">
              ...
            </span>
          );
        }

        const isCurrent = page === currentPage;
        return (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-colors ${
              isCurrent
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/40'
                : 'bg-dark-300 hover:bg-dark-400 border border-dark-400 text-gray-300 hover:text-white'
            }`}
          >
            {page}
          </button>
        );
      })}

      {/* Next Button */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 rounded-lg border border-dark-400 bg-dark-300 hover:bg-dark-400 text-white disabled:opacity-30 disabled:hover:bg-dark-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        aria-label="Trang sau"
      >
        <span className="hidden sm:inline">Sau</span>
        <FiChevronRight size={18} />
      </button>
    </div>
  );
}

export default Pagination;
