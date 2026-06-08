import { useState } from 'react';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  statusFilter: string;
  sourceFilter: string;
  sortBy: string;
  onlyFavorites: boolean;
  onlyUnread: boolean;
  onStatusChange: (status: string) => void;
  onSourceChange: (source: string) => void;
  onSortChange: (sort: string) => void;
  onFavoritesChange: (value: boolean) => void;
  onUnreadChange: (value: boolean) => void;
  onSearch: (query: string) => void;
}

export default function FilterBar({
  statusFilter,
  sourceFilter,
  sortBy,
  onlyFavorites,
  onlyUnread,
  onStatusChange,
  onSourceChange,
  onSortChange,
  onFavoritesChange,
  onUnreadChange,
  onSearch,
}: FilterBarProps) {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput);
  };

  return (
    <div className={styles.filterBar}>
      <div className={styles.filters}>
        <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="reading">Reading</option>
          <option value="following">Following</option>
          <option value="on_hold">On Hold</option>
          <option value="dropped">Dropped</option>
          <option value="completed">Completed</option>
        </select>

        <select value={sourceFilter} onChange={(e) => onSourceChange(e.target.value)}>
          <option value="all">All sources</option>
          <option value="ranobes">Ranobes</option>
          <option value="wtr_lab">WTR Lab</option>
          <option value="royal_road">Royal Road</option>
        </select>

        <select value={sortBy} onChange={(e) => onSortChange(e.target.value)}>
          <option value="lastReadAt">Last read</option>
          <option value="lastUpdated">Last updated</option>
          <option value="title">Title A-Z</option>
          <option value="addedAt">Date added</option>
          <option value="progress">Progress %</option>
        </select>

        <label className={styles.checkbox}>
          <input type="checkbox" checked={onlyFavorites} onChange={(e) => onFavoritesChange(e.target.checked)} />
          <span>Favorites only</span>
        </label>

        <label className={styles.checkbox}>
          <input type="checkbox" checked={onlyUnread} onChange={(e) => onUnreadChange(e.target.checked)} />
          <span>Unread chapters</span>
        </label>
      </div>

      <form onSubmit={handleSearchSubmit} className={styles.search}>
        <i className="ti ti-search" />
        <input
          type="text"
          placeholder="Search title or author..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </form>
    </div>
  );
}