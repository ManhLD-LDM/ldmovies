import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useWatchHistoryStore from '../stores/watchHistoryStore';
import Footer from './Footer';
import Navbar from './Navbar';

function Layout() {
  const { isAuthenticated } = useAuthStore();
  const { fetchHistoryFromBackend } = useWatchHistoryStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistoryFromBackend();
    }
  }, [isAuthenticated, fetchHistoryFromBackend]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Skip to main content link for keyboard accessibility (WCAG 2.1 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:font-semibold focus:rounded-lg focus:shadow-2xl focus:outline-none focus:ring-2 focus:ring-white transition-all"
      >
        Chuyển đến nội dung chính
      </a>

      <Navbar />
      <main id="main-content" tabIndex="-1" className="flex-1 pt-16 outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
