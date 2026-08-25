import { useEffect } from 'react';

const DEFAULT_TITLE = 'LDMovies & Comics - Xem Phim & Đọc Truyện Tranh Miễn Phí';

/**
 * Custom hook to dynamically update the document title and meta description.
 * 
 * @param {string} title - Page title to set
 * @param {string} [description] - Optional meta description to set
 */
export function useDocumentTitle(title, description) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | LDMovies & Comics`;
    } else {
      document.title = DEFAULT_TITLE;
    }

    if (description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', description);
      }
    }

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description]);
}

export default useDocumentTitle;
