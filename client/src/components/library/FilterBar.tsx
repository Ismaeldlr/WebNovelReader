import { useState } from 'react';
import type { FormEvent } from 'react';
import styles from './FilterBar.module.css';

type FilterOption = {
  value: string;
  label: string;
};

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

const statusOptions: FilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'reading', label: 'Reading' },
  { value: 'following', label: 'Following' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'completed', label: 'Completed' },
];

const sourceOptions: FilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'ranobes', label: 'Ranobes' },
  { value: 'wtr_lab', label: 'WTR Lab' },
  { value: 'royal_road', label: 'Royal Road' },
];

const sortOptions: FilterOption[] = [
  { value: 'lastReadAt', label: 'Last read' },
  { value: 'lastUpdated', label: 'Last updated' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'addedAt', label: 'Date added' },
  { value: 'progress', label: 'Progress %' },
];

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
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch(searchInput);
  };

  return (
    <div className={styles.filterBar}>
      <form onSubmit={handleSearchSubmit} className={styles.search}>
        <i className="ti ti-search" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search title or author"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" aria-label="Search">
          <i className="ti ti-arrow-right" aria-hidden="true" />
        </button>
      </form>

      <div className={styles.filters}>
        <FilterDropdown
          id="status"
          label="Status"
          value={statusFilter}
          options={statusOptions}
          openFilter={openFilter}
          setOpenFilter={setOpenFilter}
          onChange={onStatusChange}
        />

        <FilterDropdown
          id="source"
          label="Source"
          value={sourceFilter}
          options={sourceOptions}
          openFilter={openFilter}
          setOpenFilter={setOpenFilter}
          onChange={onSourceChange}
        />

        <FilterDropdown
          id="sort"
          label="Sort"
          value={sortBy}
          options={sortOptions}
          openFilter={openFilter}
          setOpenFilter={setOpenFilter}
          onChange={onSortChange}
        />

        <label className={styles.checkbox}>
          <input type="checkbox" checked={onlyFavorites} onChange={(e) => onFavoritesChange(e.target.checked)} />
          <span><i className="ti ti-star" aria-hidden="true" />Favorites</span>
        </label>

        <label className={styles.checkbox}>
          <input type="checkbox" checked={onlyUnread} onChange={(e) => onUnreadChange(e.target.checked)} />
          <span><i className="ti ti-sparkles" aria-hidden="true" />Unread</span>
        </label>
      </div>
    </div>
  );
}

function FilterDropdown({
  id,
  label,
  value,
  options,
  openFilter,
  setOpenFilter,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  openFilter: string | null;
  setOpenFilter: (value: string | null) => void;
  onChange: (value: string) => void;
}) {
  const isOpen = openFilter === id;
  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <div className={styles.dropdown}>
      <button
        className={styles.dropdownButton}
        type="button"
        onClick={() => setOpenFilter(isOpen ? null : id)}
        aria-expanded={isOpen}
      >
        <span>{label}</span>
        <strong>{selected.label}</strong>
        <i className="ti ti-chevron-down" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          {options.map((option) => (
            <button
              key={option.value}
              className={option.value === value ? styles.selectedOption : ''}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpenFilter(null);
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <i className="ti ti-check" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
