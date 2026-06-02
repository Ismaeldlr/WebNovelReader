import { useState } from 'react';
import styles from './FilterBar.module.css';

const statusFilters = [
  { label: 'All',          icon: 'ti-layout-grid' },
  { label: 'Reading',      icon: 'ti-eye' },
  { label: 'Following',    icon: 'ti-rss' },
  { label: 'On Hold',      icon: 'ti-clock-pause' },
  { label: 'Completed',    icon: 'ti-check' },
  { label: 'Dropped',      icon: 'ti-x' },
  { label: 'Favorites',    icon: 'ti-heart' },
  { label: 'New chapters', icon: 'ti-bell-ringing' },
];

const sortOptions = [
  'Last read',
  'Last updated',
  'Title A–Z',
  'Date added',
  'Progress %',
];

export default function FilterBar() {
  const [active, setActive] = useState('All');
  const [sort, setSort] = useState('Last read');

  return (
    <div className={styles.bar}>
      {statusFilters.map(f => (
        <button
          key={f.label}
          className={`${styles.chip} ${active === f.label ? styles.active : ''}`}
          onClick={() => setActive(f.label)}
        >
          <i className={`ti ${f.icon}`} aria-hidden="true" />
          {f.label}
        </button>
      ))}

      <select
        className={styles.sortSelect}
        value={sort}
        onChange={e => setSort(e.target.value)}
        aria-label="Sort by"
      >
        {sortOptions.map(o => (
          <option key={o} value={o}>Sort: {o}</option>
        ))}
      </select>
    </div>
  );
}
