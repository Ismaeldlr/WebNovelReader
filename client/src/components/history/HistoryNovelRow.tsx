import { Link } from 'react-router-dom';
import type { HistoryNovelEntry } from '../../api/history';
import { toApiAssetUrl } from '../../utils/assets';
import styles from './HistoryNovelRow.module.css';

interface HistoryNovelRowProps {
  novel: HistoryNovelEntry;
}

function formatLastRead(readAt: string) {
  const date = new Date(readAt);
  if (Number.isNaN(date.getTime())) return '';

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 24 * 60) return `${Math.floor(diffMinutes / 60)}h ago`;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default function HistoryNovelRow({ novel }: HistoryNovelRowProps) {
  const coverSrc = toApiAssetUrl(novel.cover_url);
  const currentChapter = Math.max(novel.continue_chapter_number || novel.latest_chapter_number || 1, 1);
  const percent = novel.total_chapters > 0
    ? Math.min(100, Math.round((currentChapter / novel.total_chapters) * 100))
    : 0;

  return (
    <article className={styles.row}>
      <Link className={styles.thumb} to={`/novels/${novel.novel_id}`} aria-label={novel.novel_title}>
        {coverSrc ? (
          <img src={coverSrc} alt="" />
        ) : (
          <i className="ti ti-book-2" aria-hidden="true" />
        )}
      </Link>

      <div className={styles.main}>
        <div className={styles.topLine}>
          <div className={styles.titleBlock}>
            <Link className={styles.title} to={`/novels/${novel.novel_id}`}>
              {novel.novel_title}
            </Link>
            <span>{novel.novel_author || 'Unknown author'}</span>
          </div>
          <time dateTime={novel.last_read_at}>{formatLastRead(novel.last_read_at)}</time>
        </div>

        <div className={styles.meta}>
          <span>{novel.reads_count} read{novel.reads_count === 1 ? '' : 's'}</span>
          <span>Latest: Ch. {novel.latest_chapter_number} - {novel.latest_chapter_title}</span>
        </div>

        <div className={styles.progressMeta}>
          <span>Chapter {currentChapter} of {novel.total_chapters || '?'}</span>
          <strong>{percent}%</strong>
        </div>
        <div className={styles.progressBar} aria-label={`${percent}% complete`}>
          <div className={styles.progressFill} style={{ width: `${percent}%` }} />
        </div>
      </div>

      <Link className={styles.continueButton} to={`/reader/${novel.novel_id}/${currentChapter}`}>
        <i className="ti ti-player-play-filled" aria-hidden="true" />
        Continue Reading
      </Link>
    </article>
  );
}
