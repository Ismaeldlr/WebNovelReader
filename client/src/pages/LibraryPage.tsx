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
    <div className={styles.page}>
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

      <section className={styles.summary}>
        <div>
          <div className={styles.eyebrow}>Library</div>
          <h1>Your reading shelf</h1>
          <p>{total} novel{total === 1 ? '' : 's'} matched by the current view.</p>
        </div>

        <div className={styles.summaryStats}>
          <div>
            <span>Total</span>
            <strong>{statsLoading ? '...' : stats?.totalNovels ?? 0}</strong>
          </div>
          <div>
            <span>Reading</span>
            <strong>{statsLoading ? '...' : stats?.readingCount ?? 0}</strong>
          </div>
          <div>
            <span>Cached</span>
            <strong>{statsLoading ? '...' : stats?.chaptersCached ?? 0}</strong>
          </div>
          <div>
            <span>Updated</span>
            <strong>{statsLoading ? '...' : stats?.lastUpdated ?? 'Never'}</strong>
          </div>
        </div>
      </section>

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
        <span className={styles.sectionTitle}>Novels</span>
        <span className={styles.resultCount}>{novels.length} shown</span>
      </div>

      {loading && novels.length === 0 ? (
        <div className={styles.loading}>Loading library...</div>
      ) : novels.length === 0 ? (
        <div className={styles.empty}>Your library is empty.</div>
      ) : (
        <>
          <div className={styles.grid}>
            {novels.map(novel => (
              <NovelCard key={novel.id} novel={novel} onUpdate={refetch} />
            ))}
          </div>

          {novels.length < total && (
            <div className={styles.loadMore}>
              <button onClick={handleLoadMore} disabled={loading}>
                {loading ? 'Loading...' : `Load more (${total - novels.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
