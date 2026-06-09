import { Link, useNavigate } from 'react-router-dom';
import styles from './ChapterNav.module.css';

interface Props {
  novelId: string;
  prevChapter: number | null;
  nextChapter: number | null;
}

export default function ChapterNav({ novelId, prevChapter, nextChapter }: Props) {
  const navigate = useNavigate();

  return (
    <nav className={styles.nav} aria-label="Chapter navigation">
      <button
        className={styles.pill}
        type="button"
        disabled={prevChapter == null}
        onClick={() => {
          if (prevChapter != null) {
            navigate(`/reader/${novelId}/${prevChapter}`);
          }
        }}
      >
        &laquo; BACK
      </button>

      <Link className={`${styles.pill} ${styles.centerPill}`} to={`/novels/${novelId}`}>
        CHAPTERS LIST
      </Link>

      <button
        className={`${styles.pill} ${styles.nextPill}`}
        type="button"
        disabled={nextChapter == null}
        onClick={() => {
          if (nextChapter != null) {
            navigate(`/reader/${novelId}/${nextChapter}`);
          }
        }}
      >
        NEXT &raquo;
      </button>
    </nav>
  );
}
