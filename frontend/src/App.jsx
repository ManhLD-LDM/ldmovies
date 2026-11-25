import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';

// Tự động reload 1 lần nếu lazy chunk bị lệch hash sau khi deploy bản mới
const lazyWithRetry = (importFn) =>
  lazy(() =>
    importFn().catch((err) => {
      const msg = String(err?.message || err || '');
      const isChunkErr =
        /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
          msg
        );
      if (isChunkErr) {
        try {
          const lastReload = Number(sessionStorage.getItem('ldmovies_chunk_reload_at') || 0);
          if (!lastReload || Date.now() - lastReload > 10000) {
            sessionStorage.setItem('ldmovies_chunk_reload_at', String(Date.now()));
            window.location.reload();
            return new Promise(() => {});
          }
        } catch {
          window.location.reload();
          return new Promise(() => {});
        }
      }
      throw err;
    })
  );

// Lazy load pages for better performance
const AnimeDetailPage = lazyWithRetry(() => import('./pages/AnimeDetailPage'));
const AnimeFilterPage = lazyWithRetry(() => import('./pages/AnimeFilterPage'));
const AnimePage = lazyWithRetry(() => import('./pages/AnimePage'));
const FavouritesPage = lazyWithRetry(() => import('./pages/FavouritesPage'));
const HomePage = lazyWithRetry(() => import('./pages/HomePage'));
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'));
const MovieDetailPage = lazyWithRetry(() => import('./pages/MovieDetailPage'));
const MovieFilterPage = lazyWithRetry(() => import('./pages/MovieFilterPage'));
const MoviesPage = lazyWithRetry(() => import('./pages/MoviesPage'));
const ProfilePage = lazyWithRetry(() => import('./pages/ProfilePage'));
const HistoryPage = lazyWithRetry(() => import('./pages/HistoryPage'));
const RegisterPage = lazyWithRetry(() => import('./pages/RegisterPage'));
const SearchPage = lazyWithRetry(() => import('./pages/SearchPage'));
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage'));

// Lazy load comic pages
const ComicHomePage = lazyWithRetry(() => import('./pages/ComicHomePage'));
const ComicDetailPage = lazyWithRetry(() => import('./pages/ComicDetailPage'));
const ComicReaderPage = lazyWithRetry(() => import('./pages/ComicReaderPage'));

// Fallback loader while downloading chunks
const PageLoader = () => (
  <div className="min-h-[70vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
  </div>
);

// Scroll to top immediately on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

function App() {
  const location = useLocation();

  // Tự động tải lại trang (tối đa 1 lần trong 10s) nếu Vite gặp chunk hash cũ sau khi deploy
  useEffect(() => {
    const handlePreloadError = () => {
      try {
        const lastReload = Number(sessionStorage.getItem('ldmovies_chunk_reload_at') || 0);
        if (!lastReload || Date.now() - lastReload > 10000) {
          sessionStorage.setItem('ldmovies_chunk_reload_at', String(Date.now()));
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    };
    window.addEventListener('vite:preloadError', handlePreloadError);
    return () => window.removeEventListener('vite:preloadError', handlePreloadError);
  }, []);

  return (
    <ErrorBoundary resetKey={`${location.pathname}${location.search}`}>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Root always renders Movie HomePage */}
            <Route index element={<HomePage />} />
            
            {/* Auth and User routes */}
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="favourites" element={<FavouritesPage />} />
            
            {/* Movie Routes */}
            <Route path="movies" element={<MoviesPage />} />
            <Route path="movies/filter" element={<MovieFilterPage />} />
            <Route path="movies/:id" element={<MovieDetailPage />} />
            <Route path="anime" element={<AnimePage />} />
            <Route path="anime/filter" element={<AnimeFilterPage />} />
            <Route path="anime/:id" element={<AnimeDetailPage />} />
            <Route path="search" element={<SearchPage />} />

            {/* Comic Routes */}
            <Route path="comics">
              <Route index element={<ComicHomePage />} />
              <Route path=":slug" element={<ComicDetailPage />} />
              <Route path=":slug/chapter/:chapterId" element={<ComicReaderPage />} />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
