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
  '/log':     'Reading Log',
  '/updates': 'Update Jobs',
  '/offline': 'Offline Cache',
  '/settings':'Settings',
};

export default function AppLayout() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? 'Webnovel Hub';

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <Topbar
          title={title}
          theme={theme}
          username={user?.username || ''}
          onLogout={logout}
          onToggleTheme={toggle}
        />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
