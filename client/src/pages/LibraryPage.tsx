import { useState, useEffect } from 'react';
import NovelCard from '../components/library/NovelCard';
import FilterBar from '../components/library/FilterBar';
import { useLibrary, useLibraryStats, useNewChaptersCount } from '../hooks/useLibrary';
import styles from './LibraryPage.module.css';

export default function LibraryPage() {
  const { novels, total, loading, error, filters, setFilters, refetch } = useLibrary({
    status: 'all',
    sourceSite: 'all',
    onlyFavorites: false,
    onlyUnread: false,
    search: '',
    sortBy: 'lastReadAt',
    order: 'DESC',
    limit: 24,
    offset: 0,
  });

  const { stats, loading: statsLoading } = useLibraryStats();
  const { count: newChaptersCount, loading: newCountLoading } = useNewChaptersCount();

  const [recentNovels, setRecentNovels] = useState(novels.slice(0, 4));

  useEffect(() => {
    // Show first 4 novels as "Recently read" (sorted by last_read_at already)
    setRecentNovels(novels.slice(0, 4));
  }, [novels]);

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };

  const handleLoadMore = () => {
    setFilters(prev => ({ ...prev, offset: (prev.offset || 0) + (prev.limit || 24) }));
  };

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  return (
    <>
      {/* Update strip */}
      {!newCountLoading && newChaptersCount > 0 && (
        <div className={styles.updateStrip}>
          <i className="ti ti-sparkles" aria-hidden="true" />
          <span>
            <strong>{newChaptersCount} new chapter{newChaptersCount !== 1 ? 's' : ''}</strong> available across your library since your last visit.
          </span>
          <div className={styles.stripRight}>
            View all <i className="ti ti-arrow-right" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total novels</div>
          <div className={styles.statValue}>{statsLoading ? '...' : stats?.totalNovels}</div>
          <div className={styles.statSub}>across 3 sources</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Reading</div>
          <div className={`${styles.statValue} ${styles.statAccent}`}>
            {statsLoading ? '...' : stats?.readingCount}
          </div>
          <div className={styles.statSub}>active series</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Chapters cached</div>
          <div className={styles.statValue}>{statsLoading ? '...' : stats?.chaptersCached}</div>
          <div className={styles.statSub}>offline ready</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Last updated</div>
          <div className={styles.statValue}>{statsLoading ? '...' : stats?.lastUpdated}</div>
          <div className={styles.statSub}>all sources checked</div>
        </div>
      </div>

      <FilterBar
        statusFilter={filters.status || 'all'}
        sourceFilter={filters.sourceSite || 'all'}
        sortBy={filters.sortBy || 'lastReadAt'}
        onlyFavorites={filters.onlyFavorites || false}
        onlyUnread={filters.onlyUnread || false}
        onStatusChange={(val) => handleFilterChange('status', val === 'all' ? null : val)}
        onSourceChange={(val) => handleFilterChange('sourceSite', val === 'all' ? null : val)}
        onSortChange={(val) => handleFilterChange('sortBy', val)}
        onFavoritesChange={(val) => handleFilterChange('onlyFavorites', val)}
        onUnreadChange={(val) => handleFilterChange('onlyUnread', val)}
        onSearch={(query) => handleFilterChange('search', query)}
      />

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Recently read</span>
        <a className={styles.seeAll} onClick={() => handleFilterChange('sortBy', 'lastReadAt')}>
          See all {total}
        </a>
      </div>

      {loading && novels.length === 0 ? (
        <div className={styles.loading}>Loading library...</div>
      ) : (
        <>
          <div className={styles.grid}>
            {recentNovels.map(novel => (
              <NovelCard key={novel.id} novel={novel} onUpdate={refetch} />
            ))}
          </div>

          {novels.length > recentNovels.length && (
            <div className={styles.loadMore}>
              <button onClick={handleLoadMore} disabled={loading}>
                Load more ({novels.length - recentNovels.length} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}