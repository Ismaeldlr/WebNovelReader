import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './NovelCard.module.css';
import { toggleFavorite, updateStatus, deleteNovel } from '../../api/library';

interface NovelCardProps {
  novel: {
    id: string;
    title: string;
    author: string | null;
    cover_url: string | null;
    source_site: string;
    total_chapters: number;
    status: string;
    is_favorite: boolean;
    current_chapter_number: number;
    new_chapters_count: number;
    last_read_at?: string | null;
  };
  onUpdate: () => void;
}

const sourceLabels: Record<string, string> = {
  ranobes: 'Ranobes',
  wtr_lab: 'WTR Lab',
  royal_road: 'Royal Road',
};

const statusLabels: Record<string, string> = {
  reading: 'Reading',
  following: 'Following',
  on_hold: 'On hold',
  dropped: 'Dropped',
  completed: 'Completed',
};

export default function NovelCard({ novel, onUpdate }: NovelCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const percent = novel.total_chapters > 0
    ? Math.min(100, Math.round((novel.current_chapter_number / novel.total_chapters) * 100))
    : 0;

  const progress = novel.total_chapters > 0
    ? `${novel.current_chapter_number} of ${novel.total_chapters}`
    : `${novel.current_chapter_number} read`;

  const readAction = novel.current_chapter_number > 0 ? 'Continue' : 'Start';

  const handleFavorite = async () => {
    setIsUpdating(true);
    try {
      await toggleFavorite(novel.id);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateStatus(novel.id, newStatus);
      setShowStatusMenu(false);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove "${novel.title}" from your library?`)) return;

    setIsUpdating(true);
    try {
      await deleteNovel(novel.id);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <article className={`${styles.card} ${isUpdating ? styles.updating : ''}`}>
      <Link className={styles.cover} to={`/novels/${novel.id}`}>
        {novel.cover_url ? (
          <img src={novel.cover_url} alt={novel.title} />
        ) : (
          <div className={styles.placeholderCover}>
            <i className="ti ti-book-2" aria-hidden="true" />
          </div>
        )}
        {novel.new_chapters_count > 0 && (
          <span className={styles.newBadge}>+{novel.new_chapters_count}</span>
        )}
      </Link>

      <div className={styles.body}>
        <div className={styles.topLine}>
          <span className={styles.source}>
            <i className="ti ti-world" aria-hidden="true" />
            {sourceLabels[novel.source_site] || novel.source_site}
          </span>
          <button
            className={`${styles.iconBtn} ${novel.is_favorite ? styles.favoriteActive : ''}`}
            type="button"
            onClick={handleFavorite}
            disabled={isUpdating}
            aria-label={novel.is_favorite ? 'Remove favorite' : 'Add favorite'}
            title={novel.is_favorite ? 'Remove favorite' : 'Add favorite'}
          >
            <i className={novel.is_favorite ? 'ti ti-star-filled' : 'ti ti-star'} aria-hidden="true" />
          </button>
        </div>

        <Link className={styles.titleBlock} to={`/novels/${novel.id}`}>
          <h2>{novel.title}</h2>
          <p>{novel.author || 'Unknown author'}</p>
        </Link>

        <div className={styles.progressBlock}>
          <div className={styles.progressMeta}>
            <span>{progress}</span>
            <strong>{percent}%</strong>
          </div>
          <div className={styles.progressBar} aria-label={`${percent}% complete`}>
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.statusWrap}>
            <button
              className={`${styles.statusBadge} ${styles[`status-${novel.status}`]}`}
              type="button"
              onClick={() => setShowStatusMenu((value) => !value)}
              disabled={isUpdating}
            >
              {statusLabels[novel.status] || novel.status}
              <i className="ti ti-chevron-down" aria-hidden="true" />
            </button>

            {showStatusMenu && (
              <div className={styles.statusMenu}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => handleStatusChange(value)}>
                    {label}
                  </button>
                ))}
                <button type="button" className={styles.deleteBtn} onClick={handleDelete}>
                  Remove
                </button>
              </div>
            )}
          </div>

          <button className={styles.readButton} type="button">
            <i className="ti ti-player-play-filled" aria-hidden="true" />
            {readAction}
          </button>
        </div>
      </div>
    </article>
  );
}
