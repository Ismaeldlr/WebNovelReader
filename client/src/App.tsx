import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import LibraryPage from './pages/LibraryPage';
import PlaceholderPage from './pages/PlaceholderPage';

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
      <Route element={<AppLayout />}>
        <Route index element={<LibraryPage />} />
        <Route
          path="/add"
          element={
            <PlaceholderPage
              icon="ti-plus"
              title="Add Novel"
              description="Paste a novel URL from Ranobes, WTR Lab, or Royal Road to scrape and add it to your library."
            />
          }
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
