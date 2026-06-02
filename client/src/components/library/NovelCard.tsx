import styles from './NovelCard.module.css';

type Status = 'Reading' | 'Following' | 'On Hold' | 'Completed' | 'Dropped';

interface NovelCardProps {
  title: string;
  author: string;
  status: Status;
  currentChapter: number;
  totalChapters: number;
  newChapters?: number;
  isFavorite?: boolean;
  coverVariant?: 'a' | 'b' | 'c' | 'd';
}

const statusClass: Record<Status, string> = {
  Reading:   styles.sReading,
  Following: styles.sFollowing,
  'On Hold': styles.sHold,
  Completed: styles.sCompleted,
  Dropped:   styles.sDropped,
};

export default function NovelCard({
  title,
  author,
  status,
  currentChapter,
  totalChapters,
  newChapters,
  isFavorite,
  coverVariant = 'a',
}: NovelCardProps) {
  const progress = Math.round((currentChapter / totalChapters) * 100);

  return (
    <div className={styles.card}>
      <div className={`${styles.cover} ${styles[`cover-${coverVariant}`]}`}>
        <div className={styles.coverTitle}>{title}</div>
        {newChapters != null && newChapters > 0 && (
          <div className={styles.newBadge}>+{newChapters} new</div>
        )}
        {isFavorite && (
          <div className={styles.favBadge} aria-label="Favorite">
            <i className="ti ti-star-filled" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.cardTitle}>{title}</div>
        <div className={styles.cardAuthor}>{author}</div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.footer}>
          <span className={`${styles.statusPill} ${statusClass[status]}`}>{status}</span>
          <span className={styles.progressText}>
            Ch {currentChapter.toLocaleString()} / {totalChapters.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
