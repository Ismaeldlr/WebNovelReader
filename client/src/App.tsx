import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import AddNovelsPage from './pages/AddNovelsPage';
import AuthPage from './pages/AuthPage';
import ExplorePage from './pages/ExplorePage';
import HistoryPage from './pages/HistoryPage';
import LibraryPage from './pages/LibraryPage';
import NovelEditPage from './pages/NovelEditPage';
import NovelDetailPage from './pages/NovelDetailPage';
import PlaceholderPage from './pages/PlaceholderPage';
import ProfilePage from './pages/ProfilePage';
import ReaderPage from './pages/ReaderPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="app-loading">Loading...</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Routes>
      <Route
        path="/reader/:novelId/:chapterNumber"
        element={<ReaderPage />}
      />
      <Route element={<AppLayout />}>
        <Route index element={<LibraryPage />} />
        <Route path="/add" element={<AddNovelsPage />} />
        <Route
          path="/explore"
          element={<ExplorePage />}
        />
        <Route
          path="/history"
          element={<HistoryPage />}
        />
        <Route
          path="/novels/:id"
          element={<NovelDetailPage />}
        />
        <Route
          path="/novels/:id/edit"
          element={<NovelEditPage />}
        />
        <Route
          path="/profile"
          element={<ProfilePage />}
        />
        <Route
          path="/reader"
          element={
            <PlaceholderPage
              icon="ti-book-open"
              title="Reader"
              description="Open a chapter from your library to start reading with your preferred font, theme, and layout settings."
            />
          }
        />
        <Route
          path="/log"
          element={
            <PlaceholderPage
              icon="ti-list-check"
              title="Reading Log"
              description="A full history of chapters read, time spent, and reading streaks across all your novels."
            />
          }
        />
        <Route
          path="/updates"
          element={
            <PlaceholderPage
              icon="ti-refresh"
              title="Update Jobs"
              description="Monitor background scraping jobs, scheduled update checks, and per-novel update history."
            />
          }
        />
        <Route
          path="/offline"
          element={
            <PlaceholderPage
              icon="ti-cloud-off"
              title="Offline Cache"
              description="Manage which novels are cached for offline reading and how much device storage is being used."
            />
          }
        />
        <Route
          path="/settings"
          element={
            <PlaceholderPage
              icon="ti-settings"
              title="Settings"
              description="Configure reader preferences, update intervals, scraping adapters, and account options."
            />
          }
        />
      </Route>
    </Routes>
  );
}
