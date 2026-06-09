import { Link } from 'react-router-dom';
import { formatRelativeDate } from '../../utils/date';
import styles from './NovelProgress.module.css';

interface Props {
  currentChapter: number;
  totalChapters: number;
  lastReadAt: string | null;
  novelId: string;
}

export default function NovelProgress({
  currentChapter,
  totalChapters,
  lastReadAt,
  novelId,
}: Props) {
  const percent = totalChapters > 0
    ? Math.min(100, Math.round((currentChapter / totalChapters) * 100))
    : 0;
  const label = currentChapter > 0 ? `Continue - Ch. ${currentChapter}` : 'Start Reading';

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <h2>Progress</h2>
          <p>{lastReadAt ? `Last read ${formatRelativeDate(lastReadAt)}` : 'Not started yet.'}</p>
        </div>
        <Link className={styles.cta} to={`/reader/${novelId}/${currentChapter}`}>
          <i className="ti ti-player-play-filled" aria-hidden="true" />
          {label}
        </Link>
      </div>

      <div className={styles.progressMeta}>
        <span>Chapter {currentChapter} of {totalChapters}</span>
        <strong>{percent}%</strong>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}
