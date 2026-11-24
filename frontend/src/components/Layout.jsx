import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import useAppStore from '../stores/appStore';
import useAuthStore from '../stores/authStore';
import useWatchHistoryStore from '../stores/watchHistoryStore';
import Footer from './Footer';
import Navbar from './Navbar';

function Layout() {
  const location = useLocation();
  const { setAppMode } = useAppStore();
  const { isAuthenticated } = useAuthStore();
  const { fetchHistoryFromBackend } = useWatchHistoryStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistoryFromBackend();
    }
  }, [isAuthenticated, fetchHistoryFromBackend]);

  // Đồng bộ chế độ xem phim / đọc truyện theo URL hiện tại
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/comics')) {
      setAppMode('comic');
    } else if (
      path === '/' ||
      path.startsWith('/movies') ||
      path.startsWith('/anime') ||
      path.startsWith('/search')
    ) {
      setAppMode('movie');
    }
  }, [location.pathname, setAppMode]);

  const isComicReader = /^\/comics\/[^/]+\/chapter\/[^/]+/.test(location.pathname);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Skip to main content link for keyboard accessibility (WCAG 2.1 AA) */}
      {!isComicReader && (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:font-semibold focus:rounded-lg focus:shadow-2xl focus:outline-none focus:ring-2 focus:ring-white transition-all"
        >
          Chuyển đến nội dung chính
        </a>
      )}

      {!isComicReader && <Navbar />}
      <main id="main-content" tabIndex="-1" className={`flex-1 ${isComicReader ? '' : 'pt-16'} outline-none`}>
        <Outlet />
      </main>
      {!isComicReader && <Footer />}
    </div>
  );
}

export default Layout;
