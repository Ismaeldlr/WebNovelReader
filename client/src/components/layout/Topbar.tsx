import styles from './Topbar.module.css';

interface TopbarProps {
  title: string;
  theme: 'light' | 'dark';
  username: string;
  onLogout: () => void;
  onToggleTheme: () => void;
}

export default function Topbar({ title, theme, username, onLogout, onToggleTheme }: TopbarProps) {
  return (
    <header className={styles.topbar}>
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

        <button
          className={styles.iconBtn}
          onClick={onToggleTheme}
          aria-label="Toggle theme"
        >
          <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} aria-hidden="true" />
        </button>

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
