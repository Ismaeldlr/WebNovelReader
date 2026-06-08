import { useState } from 'react';
import styles from './NovelCard.module.css';
import { toggleFavorite, updateStatus, deleteNovel } from '../../api/library';

interface NovelCardProps {
  novel: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
    source_site: string;
    total_chapters: number;
    status: string;
    is_favorite: boolean;
    current_chapter_number: number;
    new_chapters_count: number;
  };
  onUpdate: () => void; // refetch library after changes
}

const sourceLabels: Record<string, string> = {
  ranobes: 'Ranobes',
  wtr_lab: 'WTR Lab',
  royal_road: 'Royal Road',
};

export default function NovelCard({ novel, onUpdate }: NovelCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const progress = novel.total_chapters > 0
    ? `${novel.current_chapter_number} / ${novel.total_chapters}`
    : `${novel.current_chapter_number} / ?`;

  const percent = novel.total_chapters > 0
    ? Math.round((novel.current_chapter_number / novel.total_chapters) * 100)
    : 0;

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
    if (window.confirm(`Delete "${novel.title}" from your library? All progress and cached chapters will be lost.`)) {
      setIsUpdating(true);
      try {
        await deleteNovel(novel.id);
        onUpdate();
      } catch (err) {
        console.error(err);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  return (
    <div className={`${styles.card} ${isUpdating ? styles.updating : ''}`}>
      <div className={styles.cover}>
        {novel.cover_url ? (
          <img src={novel.cover_url} alt={novel.title} />
        ) : (
          <div className={styles.placeholderCover}>
            <i className="ti ti-book" />
          </div>
        )}
        <button
          className={`${styles.favoriteBtn} ${novel.is_favorite ? styles.active : ''}`}
          onClick={handleFavorite}
          disabled={isUpdating}
          title={novel.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <i className="ti ti-star-filled" />
        </button>
      </div>

      <div className={styles.info}>
        <h3 className={styles.title}>{novel.title}</h3>
        <div className={styles.author}>{novel.author || 'Unknown author'}</div>
        <div className={styles.source}>
          <i className="ti ti-link" />
          <span>{sourceLabels[novel.source_site] || novel.source_site}</span>
        </div>

        <div className={styles.statusRow}>
          <div className={`${styles.statusBadge} ${styles[`status-${novel.status}`]}`}>
            {novel.status.replace('_', ' ')}
          </div>
          {novel.new_chapters_count > 0 && (
            <div className={styles.newBadge}>+{novel.new_chapters_count} new</div>
          )}
          <button className={styles.moreBtn} onClick={() => setShowStatusMenu(!showStatusMenu)}>
            <i className="ti ti-dots" />
          </button>
          {showStatusMenu && (
            <div className={styles.statusMenu}>
              {['reading', 'following', 'on_hold', 'dropped', 'completed'].map(s => (
                <button key={s} onClick={() => handleStatusChange(s)}>
                  {s.replace('_', ' ')}
                </button>
              ))}
              <hr />
              <button onClick={handleDelete} className={styles.deleteBtn}>Delete</button>
            </div>
          )}
        </div>

        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
          <div className={styles.progressText}>{progress}</div>
        </div>
      </div>
    </div>
  );
}