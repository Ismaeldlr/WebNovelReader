import { Link } from 'react-router-dom';
import { formatShortDate } from '../../utils/date';
import type { ChapterItem } from '../../types/novel';
import styles from './ChapterListItem.module.css';

interface Props {
  chapter: ChapterItem;
  isRead: boolean;
  novelId: string;
}

export default function ChapterListItem({ chapter, isRead, novelId }: Props) {
  return (
    <Link className={styles.row} to={`/reader/${novelId}/${chapter.chapter_number}`}>
      <span className={styles.number}>Ch. {chapter.chapter_number}</span>
      <span className={styles.title}>{chapter.title}</span>
      <span className={styles.indicator}>
        {chapter.is_user_new ? (
          <span className={styles.newBadge}>NEW</span>
        ) : isRead ? (
          <i className="ti ti-check" aria-hidden="true" />
        ) : null}
      </span>
      <span className={styles.date}>{formatShortDate(chapter.discovered_at)}</span>
    </Link>
  );
}
