import { Suspense, lazy } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import useAppStore from './stores/appStore';

// Lazy load pages for better performance
const AnimeDetailPage = lazy(() => import('./pages/AnimeDetailPage'));
const AnimeFilterPage = lazy(() => import('./pages/AnimeFilterPage'));
const AnimePage = lazy(() => import('./pages/AnimePage'));
const FavouritesPage = lazy(() => import('./pages/FavouritesPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage'));
const MovieFilterPage = lazy(() => import('./pages/MovieFilterPage'));
const MoviesPage = lazy(() => import('./pages/MoviesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));

// Lazy load comic pages
const ComicHomePage = lazy(() => import('./pages/ComicHomePage'));
const ComicDetailPage = lazy(() => import('./pages/ComicDetailPage'));
const ComicReaderPage = lazy(() => import('./pages/ComicReaderPage'));

// Fallback loader while downloading chunks
const PageLoader = () => (
  <div className="min-h-[70vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
  </div>
);

function App() {
  const { appMode } = useAppStore();

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Main index routes dynamically based on appMode */}
            <Route index element={appMode === 'movie' ? <HomePage /> : <Navigate to="/comics" replace />} />
            
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
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
