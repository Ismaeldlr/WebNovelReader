import { lazy, Suspense, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CommandPalette from './components/CommandPalette';
import type { CommandPaletteHandle } from './components/CommandPalette';
import AppLayout from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { findKeybinding } from './lib/keybindings';
import { runEditorShortcut } from './lib/editorShortcuts';
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

const DocumentEditorPage = lazy(() => import('./pages/write/DocumentEditorPage'));
const ProjectPage = lazy(() => import('./pages/write/ProjectPage'));
const WriteHomePage = lazy(() => import('./pages/write/WriteHomePage'));

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
  const commandPaletteRef = useRef<CommandPaletteHandle | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      const binding = findKeybinding(event);

      if (!binding) return;
      if (isTyping && binding.action !== 'openCommandPalette') return;

      if (binding.action === 'openCommandPalette') {
        event.preventDefault();
        commandPaletteRef.current?.openPalette();
        return;
      }

      if (binding.action === 'forceSave') {
        event.preventDefault();
        runEditorShortcut('forceSave');
        return;
      }

      if (binding.action === 'toggleDistractionFree') {
        if (runEditorShortcut('toggleDistractionFree')) {
          event.preventDefault();
        }
        return;
      }

      if (binding.action === 'openVersionHistory') {
        if (runEditorShortcut('openVersionHistory')) {
          event.preventDefault();
        }
        return;
      }

      if (binding.action === 'openPendingItems') {
        if (runEditorShortcut('openPendingItems')) {
          event.preventDefault();
        }
        return;
      }

      if (binding.action === 'toggleTypewriterSounds') {
        if (runEditorShortcut('toggleTypewriterSounds')) {
          event.preventDefault();
        }
        return;
      }

      if (binding.action === 'previousDocument') {
        if (runEditorShortcut('previousDocument')) {
          event.preventDefault();
        }
        return;
      }

      if (binding.action === 'nextDocument' && runEditorShortcut('nextDocument')) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return <div className="app-loading">Loading...</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <>
      <CommandPalette ref={commandPaletteRef} />
      <Routes>
        <Route
          path="/reader/:novelId/:chapterNumber"
          element={<ReaderPage />}
        />
        <Route
          path="/write/:projectId/documents/:documentId"
          element={<LazyPage><DocumentEditorPage /></LazyPage>}
        />
        <Route
          path="/write/:projectId"
          element={<LazyPage><ProjectPage /></LazyPage>}
        />
        <Route element={<AppLayout />}>
          <Route index element={<LibraryPage />} />
          <Route path="/add" element={<AddNovelsPage />} />
          <Route
            path="/write"
            element={<LazyPage><WriteHomePage /></LazyPage>}
          />
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
    </>
  );
}

function LazyPage({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="app-loading">Loading...</div>}>
      {children}
    </Suspense>
  );
}
