import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getNovelChapters } from '../../api/novels';
import type { ChapterItem } from '../../types/novel';
import ChapterListItem from './ChapterListItem';
import styles from './ChapterList.module.css';

interface Props {
  novelId: string;
  totalChapters: number;
  currentChapterNumber: number;
}

export default function ChapterList({
  novelId,
  totalChapters,
  currentChapterNumber,
}: Props) {
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const currentRowRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledRef = useRef(false);

  const loadPage = useCallback(async (targetPage: number, replace = false) => {
    if (replace) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const data = await getNovelChapters(novelId, targetPage, 100, 'asc');
      setChapters((current) => replace ? data.chapters : [...current, ...data.chapters]);
      setPage(data.page);
      setHasMore(data.has_more);
    } catch (err: any) {
      setError(err.message || 'Failed to load chapters.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [novelId]);

  useEffect(() => {
    hasScrolledRef.current = false;
    loadPage(1, true);
  }, [loadPage]);

  useEffect(() => {
    if (!hasScrolledRef.current && currentRowRef.current && totalChapters > 100) {
      currentRowRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
      hasScrolledRef.current = true;
    }
  }, [chapters, totalChapters]);

  const visibleChapters = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sortedChapters = [...chapters].sort((a, b) => {
      return order === 'asc'
        ? a.chapter_number - b.chapter_number
        : b.chapter_number - a.chapter_number;
    });

    if (!query) return sortedChapters;

    return sortedChapters.filter((chapter) =>
      chapter.title.toLowerCase().includes(query)
      || String(chapter.chapter_number).includes(query)
    );
  }, [chapters, order, search]);

  function toggleOrder() {
    setOrder((value) => value === 'asc' ? 'desc' : 'asc');
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>Chapters</h2>
        <span>{totalChapters} chapters total</span>
      </div>

      {totalChapters === 0 ? (
        <div className={styles.empty}>
          <i className="ti ti-book-off" aria-hidden="true" />
          <span>No chapters have been discovered yet.</span>
        </div>
      ) : (
        <>
          <div className={styles.controls}>
            <label className={styles.search}>
              <i className="ti ti-search" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search loaded chapters"
              />
            </label>

            <button className={styles.sortButton} type="button" onClick={toggleOrder}>
              <i className="ti ti-arrows-sort" aria-hidden="true" />
              {order === 'asc' ? 'Oldest first' : 'Newest first'}
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {loading ? (
            <div className={styles.list}>
              {Array.from({ length: 5 }).map((_, index) => (
                <div className={styles.skeletonRow} key={index} />
              ))}
            </div>
          ) : (
            <div className={styles.list}>
              {visibleChapters.map((chapter) => {
                const item = (
                  <ChapterListItem
                    key={chapter.id}
                    chapter={chapter}
                    isRead={!chapter.is_user_new && chapter.chapter_number <= currentChapterNumber}
                    novelId={novelId}
                  />
                );

                if (chapter.chapter_number === currentChapterNumber) {
                  return <div ref={currentRowRef} key={chapter.id}>{item}</div>;
                }

                return item;
              })}
            </div>
          )}

          {hasMore && !loading && (
            <div className={styles.loadMore}>
              <button type="button" onClick={() => loadPage(page + 1)} disabled={loadingMore}>
                {loadingMore ? 'Loading...' : 'Load more chapters'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
