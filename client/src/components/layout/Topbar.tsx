import ThemePicker from '../ThemePicker';
import type { ThemeId } from '../../hooks/useTheme';
import styles from './Topbar.module.css';

interface TopbarProps {
  title: string;
  currentTheme: ThemeId;
  username: string;
  onLogout: () => void;
  onThemeChange: (themeId: ThemeId) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export default function Topbar({
  title,
  currentTheme,
  username,
  onLogout,
  onThemeChange,
  onToggleSidebar,
  isSidebarOpen,
}: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <button
        className={styles.menuButton}
        onClick={onToggleSidebar}
        aria-label="Open navigation"
        aria-expanded={isSidebarOpen}
        type="button"
      >
        <i className="ti ti-menu-2" aria-hidden="true" />
      </button>
      <div className={styles.title}>{title}</div>

      <div className={styles.right}>
        <div className={styles.searchBox}>
          <i className="ti ti-search" aria-hidden="true" />
          <span>Search titles, authors...</span>
        </div>

        <button className={styles.iconBtn} aria-label="Notifications">
          <i className="ti ti-bell" aria-hidden="true" />
          <div className={styles.notifDot} />
        </button>

        <ThemePicker currentTheme={currentTheme} onThemeChange={onThemeChange} />

        <div className={styles.account} title={username}>
          <i className="ti ti-user-circle" aria-hidden="true" />
          <span>{username}</span>
        </div>

        <button
          className={styles.iconBtn}
          onClick={onLogout}
          aria-label="Sign out"
          title="Sign out"
        >
          <i className="ti ti-logout" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
