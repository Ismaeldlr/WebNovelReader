import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const navSections = [
  {
    label: 'Library',
    items: [
      { to: '/', icon: 'ti-books', label: 'My Library', badge: 3 },
      { to: '/add', icon: 'ti-plus', label: 'Add Novel' },
    ],
  },
  {
    label: 'Reading',
    items: [
      { to: '/reader', icon: 'ti-book-open', label: 'Reader' },
      { to: '/log', icon: 'ti-list-check', label: 'Reading Log' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/updates', icon: 'ti-refresh', label: 'Update Jobs' },
      { to: '/offline', icon: 'ti-cloud-off', label: 'Offline Cache' },
      { to: '/settings', icon: 'ti-settings', label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <i className="ti ti-book-2" aria-hidden="true" />
        </div>
        <div>
          <div className={styles.logoName}>Webnovel Hub</div>
          <div className={styles.logoSub}>Your reading space</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {navSections.map((section, si) => (
          <div key={si}>
            {si > 0 && <div className={styles.divider} />}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>{section.label}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    [styles.navItem, isActive ? styles.active : ''].join(' ')
                  }
                >
                  <i className={`ti ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.badge != null && (
                    <span className={styles.badge}>{item.badge}</span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={styles.bottom}>
        <div className={styles.statusList}>
          <StatusRow dot="green" label="API online" />
          <StatusRow dot="green" label="Job queue idle" />
          <StatusRow dot="amber" label="Next check: 4h 22m" />
        </div>
      </div>
    </aside>
  );
}

function StatusRow({ dot, label }: { dot: 'green' | 'amber' | 'red'; label: string }) {
  return (
    <div className={styles.statusRow}>
      <div className={`${styles.dot} ${styles[`dot-${dot}`]}`} />
      <span>{label}</span>
    </div>
  );
}
