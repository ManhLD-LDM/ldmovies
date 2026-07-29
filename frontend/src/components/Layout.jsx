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
      <Navbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
