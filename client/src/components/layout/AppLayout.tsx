import { useCallback, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import styles from './AppLayout.module.css';

const pageTitles: Record<string, string> = {
  '/':        'My Library',
  '/add':     'Add Novels',
  '/explore': 'Explore',
  '/reader':  'Reader',
  '/history': 'Reading History',
  '/profile': 'Profile',
  '/log':     'Reading Log',
  '/updates': 'Update Jobs',
  '/offline': 'Offline Cache',
  '/settings':'Settings',
};

export default function AppLayout() {
  const { currentTheme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const title = pageTitles[location.pathname] ?? 'Webnovel Hub';
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(isOpen => !isOpen);
  }, []);
  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div
        className={`${styles.backdrop} ${isSidebarOpen ? styles.backdropOpen : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />
      <div className={styles.main}>
        <Topbar
          title={title}
          currentTheme={currentTheme}
          username={user?.username || ''}
          onLogout={logout}
          onThemeChange={setTheme}
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
