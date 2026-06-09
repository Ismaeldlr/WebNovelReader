import { Link, useParams } from 'react-router-dom';
import ChapterList from '../components/novelDetail/ChapterList';
import NovelAbout from '../components/novelDetail/NovelAbout';
import NovelDetailHero from '../components/novelDetail/NovelDetailHero';
import NovelProgress from '../components/novelDetail/NovelProgress';
import { useNovelDetail } from '../hooks/useNovelDetail';
import styles from './NovelDetailPage.module.css';

export default function NovelDetailPage() {
  const { id } = useParams();
  const {
    novel,
    loading,
    error,
    mutationError,
    retry,
    handleAddToLibrary,
    handleStatusChange,
    handleFavoriteToggle,
  } = useNovelDetail(id);

  if (loading) {
    return <NovelDetailSkeleton />;
  }

  if (!novel) {
    const isMissing = error === 'Novel not found';
    return (
      <div className={styles.centerState}>
        <i className="ti ti-book-off" aria-hidden="true" />
        <h1>{isMissing ? "This novel doesn't exist or has been removed." : 'Failed to load novel details.'}</h1>
        {isMissing ? (
          <Link to="/">Back</Link>
        ) : (
          <button type="button" onClick={retry}>Try again</button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <NovelDetailHero
        novel={novel}
        mutationError={mutationError}
        onAddToLibrary={handleAddToLibrary}
        onStatusChange={handleStatusChange}
        onFavoriteToggle={handleFavoriteToggle}
      />

      <div className={styles.content}>
        <NovelAbout
          description={novel.description}
          tags={novel.tags}
          source_site={novel.source_site}
          source_url={novel.source_url}
          ingested_at={novel.ingested_at}
          last_scraped_at={novel.last_scraped_at}
        />

        {novel.library_entry && (
          <NovelProgress
            currentChapter={novel.library_entry.current_chapter_number}
            totalChapters={novel.total_chapters}
            lastReadAt={novel.library_entry.last_read_at}
            novelId={novel.id}
          />
        )}

        <ChapterList
          novelId={novel.id}
          totalChapters={novel.total_chapters}
          currentChapterNumber={novel.library_entry?.current_chapter_number || 0}
        />
      </div>
    </div>
  );
}

function NovelDetailSkeleton() {
  return (
    <div className={styles.skeletonPage}>
      <div className={`${styles.skeleton} ${styles.skeletonHero}`} />
      <div className={styles.skeletonSection}>
        <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
        <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
        <div className={`${styles.skeleton} ${styles.skeletonLineShort}`} />
      </div>
      <div className={styles.skeletonSection}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div className={`${styles.skeleton} ${styles.skeletonRow}`} key={index} />
        ))}
      </div>
    </div>
  );
}
