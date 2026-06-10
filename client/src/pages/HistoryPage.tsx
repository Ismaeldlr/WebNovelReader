import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getHistory,
  getNovelHistory,
  getHistoryNovels,
  getHistoryStats,
  type HistoryEntry,
  type HistoryNovelEntry,
  type HistoryNovel,
  type HistoryStats,
} from '../api/history';
import HistoryGroup from '../components/history/HistoryGroup';
import HistoryNovelRow from '../components/history/HistoryNovelRow';
import styles from './HistoryPage.module.css';

const PAGE_SIZE = 30;

const timeRanges = [
  { id: 'all', label: 'All time', days: null },
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
] as const;

type TimeRange = typeof timeRanges[number]['id'];
type HistoryView = 'chapters' | 'novels';

export interface HistoryDateGroup {
  dateLabel: string;
  entries: HistoryEntry[];
}

function normalizeTimeRange(value: string | null): TimeRange {
  return timeRanges.some((range) => range.id === value) ? (value as TimeRange) : 'all';
}

function normalizeHistoryView(value: string | null): HistoryView {
  return value === 'novels' ? 'novels' : 'chapters';
}

function fromDateForRange(range: TimeRange) {
  const selectedRange = timeRanges.find((item) => item.id === range);
  if (!selectedRange?.days) return '';

  const date = new Date();
  date.setDate(date.getDate() - selectedRange.days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDateLabel(readAt: string) {
  const date = new Date(readAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(date) === dayKey(today)) return 'Today';
  if (dayKey(date) === dayKey(yesterday)) return 'Yesterday';

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function groupHistoryEntries(entries: HistoryEntry[]): HistoryDateGroup[] {
  return entries.reduce<HistoryDateGroup[]>((groups, entry) => {
    const label = formatDateLabel(entry.read_at);
    const currentGroup = groups[groups.length - 1];

    if (currentGroup?.dateLabel === label) {
      currentGroup.entries.push(entry);
      return groups;
    }

    groups.push({ dateLabel: label, entries: [entry] });
    return groups;
  }, []);
}

export default function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedNovelId = searchParams.get('novelId') || '';
  const timeRange = normalizeTimeRange(searchParams.get('range'));
  const historyView = normalizeHistoryView(searchParams.get('view'));
  const novelFilterRef = useRef<HTMLDivElement | null>(null);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [novels, setNovels] = useState<HistoryNovel[]>([]);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [novelEntries, setNovelEntries] = useState<HistoryNovelEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNovelFilterOpen, setIsNovelFilterOpen] = useState(false);
  const [novelQuery, setNovelQuery] = useState('');

  const selectedNovel = novels.find((novel) => novel.id === selectedNovelId);
  const groupedEntries = useMemo(() => groupHistoryEntries(entries), [entries]);
  const hasMore = entries.length < total;

  const filteredNovels = useMemo(() => {
    const query = novelQuery.trim().toLowerCase();
    if (!query) return novels;
    return novels.filter((novel) => novel.title.toLowerCase().includes(query));
  }, [novels, novelQuery]);

  useEffect(() => {
    let mounted = true;

    Promise.all([getHistoryStats(), getHistoryNovels()])
      .then(([nextStats, nextNovels]) => {
        if (!mounted) return;
        setStats(nextStats);
        setNovels(nextNovels);
      })
      .catch((err: any) => {
        if (mounted) setError(err.message || 'Failed to load history metadata');
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (!novelFilterRef.current?.contains(event.target as Node)) {
        setIsNovelFilterOpen(false);
      }
    }

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const sharedParams = {
      novelId: selectedNovelId,
      from: fromDateForRange(timeRange),
    };

    const request = historyView === 'chapters'
      ? getHistory({
          ...sharedParams,
          page: 1,
          limit: PAGE_SIZE,
        })
      : getNovelHistory(sharedParams);

    request
      .then((result) => {
        if (!mounted) return;

        if (historyView === 'chapters' && !Array.isArray(result)) {
          setEntries(result.entries);
          setNovelEntries([]);
          setTotal(result.total);
          setPage(result.page);
          return;
        }

        if (Array.isArray(result)) {
          setNovelEntries(result);
          setEntries([]);
          setTotal(result.length);
          setPage(1);
        }
      })
      .catch((err: any) => {
        if (mounted) setError(err.message || 'Failed to load reading history');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedNovelId, timeRange, historyView]);

  const updateFilters = (updates: { novelId?: string; range?: TimeRange; view?: HistoryView }) => {
    const nextParams = new URLSearchParams(searchParams);

    if (updates.novelId !== undefined) {
      if (updates.novelId) nextParams.set('novelId', updates.novelId);
      else nextParams.delete('novelId');
    }

    if (updates.range !== undefined) {
      if (updates.range === 'all') nextParams.delete('range');
      else nextParams.set('range', updates.range);
    }

    if (updates.view !== undefined) {
      if (updates.view === 'chapters') nextParams.delete('view');
      else nextParams.set('view', updates.view);
    }

    setSearchParams(nextParams);
  };

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    setError(null);

    try {
      const result = await getHistory({
        page: nextPage,
        limit: PAGE_SIZE,
        novelId: selectedNovelId,
        from: fromDateForRange(timeRange),
      });
      setEntries((currentEntries) => [...currentEntries, ...result.entries]);
      setTotal(result.total);
      setPage(result.page);
    } catch (err: any) {
      setError(err.message || 'Failed to load more history');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.summary}>
        <div>
          <span>Total chapters</span>
          <strong>{stats?.total_chapters_read ?? 0}</strong>
        </div>
        <div>
          <span>Novels read</span>
          <strong>{stats?.distinct_novels_read ?? 0}</strong>
        </div>
        <div>
          <span>Authors read</span>
          <strong>{stats?.distinct_authors_read ?? 0}</strong>
        </div>
      </section>

      <section className={styles.filters}>
        <div className={styles.novelFilter} ref={novelFilterRef}>
          <button
            className={styles.novelFilterButton}
            type="button"
            onClick={() => setIsNovelFilterOpen((open) => !open)}
            aria-expanded={isNovelFilterOpen}
          >
            <span>{selectedNovel?.title || 'All novels'}</span>
            <i className="ti ti-chevron-down" aria-hidden="true" />
          </button>

          {isNovelFilterOpen && (
            <div className={styles.novelMenu}>
              <input
                value={novelQuery}
                onChange={(event) => setNovelQuery(event.target.value)}
                placeholder="Search novels"
                autoFocus
              />
              <button
                className={!selectedNovelId ? styles.selectedOption : ''}
                type="button"
                onClick={() => {
                  updateFilters({ novelId: '' });
                  setIsNovelFilterOpen(false);
                  setNovelQuery('');
                }}
              >
                All novels
              </button>
              {filteredNovels.map((novel) => (
                <button
                  key={novel.id}
                  className={novel.id === selectedNovelId ? styles.selectedOption : ''}
                  type="button"
                  onClick={() => {
                    updateFilters({ novelId: novel.id });
                    setIsNovelFilterOpen(false);
                    setNovelQuery('');
                  }}
                >
                  {novel.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.timeRange} aria-label="Time range">
          {timeRanges.map((range) => (
            <button
              key={range.id}
              className={range.id === timeRange ? styles.activeRange : ''}
              type="button"
              onClick={() => updateFilters({ range: range.id })}
            >
              {range.label}
            </button>
          ))}
        </div>

        <div className={styles.viewToggle} aria-label="Reading log view">
          <button
            className={historyView === 'chapters' ? styles.activeRange : ''}
            type="button"
            onClick={() => updateFilters({ view: 'chapters' })}
          >
            Chapter view
          </button>
          <button
            className={historyView === 'novels' ? styles.activeRange : ''}
            type="button"
            onClick={() => updateFilters({ view: 'novels' })}
          >
            Novel view
          </button>
        </div>
      </section>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Loading history...</div>
      ) : total === 0 ? (
        <div className={styles.empty}>
          <i className="ti ti-history" aria-hidden="true" />
          <p>No reading history yet. Start reading to see your activity here.</p>
          <Link to="/">Go to Library</Link>
        </div>
      ) : (
        <>
          <div className={styles.historyList}>
            {historyView === 'chapters'
              ? groupedEntries.map((group, index) => (
                  <HistoryGroup
                    key={`${group.dateLabel}-${index}`}
                    dateLabel={group.dateLabel}
                    entries={group.entries}
                  />
                ))
              : novelEntries.map((novel) => (
                  <HistoryNovelRow key={novel.novel_id} novel={novel} />
                ))}
          </div>

          {historyView === 'chapters' && hasMore && (
            <div className={styles.loadMore}>
              <button type="button" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading...' : `Load more (${total - entries.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
