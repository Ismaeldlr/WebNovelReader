import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import SourceBadge from '../common/SourceBadge';
import { formatRelativeDate } from '../../utils/date';
import type { LibraryStatus, NovelDetail } from '../../types/novel';
import styles from './NovelDetailHero.module.css';

const statusLabels: Record<LibraryStatus, string> = {
  reading: 'Reading',
  following: 'Following',
  on_hold: 'On Hold',
  dropped: 'Dropped',
  completed: 'Completed',
};

interface Props {
  novel: NovelDetail;
  mutationError: string | null;
  onAddToLibrary: () => Promise<void>;
  onStatusChange: (status: LibraryStatus) => Promise<void>;
  onFavoriteToggle: () => Promise<void>;
}

export default function NovelDetailHero({
  novel,
  mutationError,
  onAddToLibrary,
  onStatusChange,
  onFavoriteToggle,
}: Props) {
  const libraryEntry = novel.library_entry;
  const nextChapter = (libraryEntry?.current_chapter_number || 0) + 1;
  const readLabel = libraryEntry && libraryEntry.current_chapter_number > 0
    ? `Continue - Ch. ${nextChapter}`
    : 'Start Reading';
  const heroStyle = novel.cover_url
    ? ({ '--cover-url': `url("${novel.cover_url}")` } as CSSProperties & Record<string, string>)
    : undefined;

  return (
    <section className={styles.hero} style={heroStyle}>
      {novel.cover_url && <div className={styles.heroBg} />}
      <div className={styles.overlay} />

      <div className={styles.inner}>
        <div className={styles.coverCard}>
          {novel.cover_url ? (
            <img src={novel.cover_url} alt={novel.title} />
          ) : (
            <div className={styles.placeholderCover}>{novel.title.charAt(0)}</div>
          )}
        </div>

        <div className={styles.content}>
          <SourceBadge source={novel.source_site} />

          <div>
            <div className={styles.titleRow}>
              <h1>{novel.title}</h1>
              {novel.source_site === 'epub' && (
                <Link className={styles.editButton} to={`/novels/${novel.id}/edit`} aria-label="Edit novel">
                  <i className="ti ti-pencil" aria-hidden="true" />
                </Link>
              )}
            </div>
            <p className={styles.author}><span>by</span> {novel.author || 'Unknown author'}</p>
          </div>

          {novel.tags.length > 0 && (
            <div className={styles.tags}>
              {novel.tags.slice(0, 6).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}

          <div className={styles.stats}>
            <span><i className="ti ti-book" aria-hidden="true" />{novel.total_chapters} chapters</span>
            <span><i className="ti ti-clock" aria-hidden="true" />Updated {formatRelativeDate(novel.last_scraped_at)}</span>
          </div>

          <div className={styles.actions}>
            {!libraryEntry ? (
              <button className={styles.primaryButton} type="button" onClick={onAddToLibrary}>
                <i className="ti ti-plus" aria-hidden="true" />
                Add to Library
              </button>
            ) : (
              <>
                <StatusSelect value={libraryEntry.status} onChange={onStatusChange} />
                <button
                  className={`${styles.favoriteButton} ${libraryEntry.is_favorite ? styles.favoriteActive : ''}`}
                  type="button"
                  onClick={onFavoriteToggle}
                  aria-label={libraryEntry.is_favorite ? 'Remove favorite' : 'Add favorite'}
                >
                  <i className={libraryEntry.is_favorite ? 'ti ti-star-filled' : 'ti ti-star'} aria-hidden="true" />
                </button>
                <Link className={styles.primaryButton} to={`/reader/${novel.id}/${nextChapter}`}>
                  <i className="ti ti-player-play-filled" aria-hidden="true" />
                  {readLabel}
                </Link>
              </>
            )}
          </div>

          {mutationError && <div className={styles.mutationError}>{mutationError}</div>}
        </div>
      </div>
    </section>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: LibraryStatus;
  onChange: (status: LibraryStatus) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.statusDropdown}>
      <button
        className={styles.statusButton}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        {statusLabels[value]}
        <i className="ti ti-chevron-down" aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.statusMenu}>
          {Object.entries(statusLabels).map(([status, label]) => (
            <button
              className={status === value ? styles.selectedStatus : ''}
              key={status}
              type="button"
              onClick={() => {
                onChange(status as LibraryStatus);
                setOpen(false);
              }}
            >
              <span>{label}</span>
              {status === value && <i className="ti ti-check" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
