import { Link } from 'react-router-dom';
import type { HistoryEntry } from '../../api/history';
import { toApiAssetUrl } from '../../utils/assets';
import styles from './HistoryEntryRow.module.css';

interface HistoryEntryRowProps {
  entry: HistoryEntry;
  showTodayTime: boolean;
}

function formatTime(readAt: string, showTodayTime: boolean) {
  const date = new Date(readAt);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 6 * 60) {
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}h ago`;
  }

  if (showTodayTime) {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  return '';
}

export default function HistoryEntryRow({ entry, showTodayTime }: HistoryEntryRowProps) {
  const coverSrc = toApiAssetUrl(entry.cover_url);
  const timeLabel = formatTime(entry.read_at, showTodayTime);

  return (
    <div className={styles.row}>
      <Link className={styles.thumb} to={`/novels/${entry.novel_id}`} aria-label={entry.novel_title}>
        {coverSrc ? (
          <img src={coverSrc} alt="" />
        ) : (
          <i className="ti ti-book-2" aria-hidden="true" />
        )}
      </Link>

      <div className={styles.main}>
        <Link className={styles.novelLink} to={`/novels/${entry.novel_id}`}>
          {entry.novel_title}
        </Link>
        <Link className={styles.chapterLink} to={`/reader/${entry.novel_id}/${entry.chapter_number}`}>
          Ch. {entry.chapter_number} - {entry.chapter_title}
        </Link>
      </div>

      {timeLabel && <time className={styles.time} dateTime={entry.read_at}>{timeLabel}</time>}
    </div>
  );
}
