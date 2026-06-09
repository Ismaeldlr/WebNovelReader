import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { fetchExploreNovels } from '../api/explore';
import type { ExploreNovel } from '../api/explore';
import { addNovelToLibrary, deleteNovel } from '../api/library';
import { toApiAssetUrl } from '../utils/assets';
import styles from './ExplorePage.module.css';

const sourceLabels: Record<string, string> = {
  ranobes: 'Ranobes',
  wtr_lab: 'WTR Lab',
  royal_road: 'Royal Road',
  epub: 'EPUB',
};

export default function ExplorePage() {
  const [novels, setNovels] = useState<ExploreNovel[]>([]);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingNovelId, setUpdatingNovelId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ExploreNovel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchExploreNovels(activeSearch)
      .then((nextNovels) => {
        if (mounted) setNovels(nextNovels);
      })
      .catch((err: any) => {
        if (mounted) setError(err.message || 'Failed to load explore novels');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeSearch]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveSearch(search);
  }

  async function addNovel(novel: ExploreNovel) {
    setUpdatingNovelId(novel.id);
    setError(null);

    try {
      await addNovelToLibrary(novel.id);
      setNovels((currentNovels) =>
        currentNovels.map((item) =>
          item.id === novel.id ? { ...item, in_library: true } : item
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to add novel');
    } finally {
      setUpdatingNovelId(null);
    }
  }

  async function removeNovel() {
    if (!removeTarget) return;

    setUpdatingNovelId(removeTarget.id);
    setError(null);

    try {
      await deleteNovel(removeTarget.id);
      setNovels((currentNovels) =>
        currentNovels.map((item) =>
          item.id === removeTarget.id ? { ...item, in_library: false } : item
        )
      );
      setRemoveTarget(null);
    } catch (err: any) {
      setError(err.message || 'Failed to remove novel');
    } finally {
      setUpdatingNovelId(null);
    }
  }

  function handleLibraryToggle(novel: ExploreNovel) {
    if (novel.in_library) {
      setRemoveTarget(novel);
      return;
    }

    addNovel(novel);
  }

  return (
    <>
      <section className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Explore</div>
          <h1>Discover seeded novels</h1>
        </div>

        <form className={styles.search} onSubmit={handleSearch}>
          <i className="ti ti-search" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title or author"
          />
          <button type="submit" aria-label="Search">
            <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
        </form>
      </section>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Loading explore...</div>
      ) : novels.length === 0 ? (
        <div className={styles.empty}>No novels found.</div>
      ) : (
        <div className={styles.grid}>
          {novels.map((novel) => {
            const coverSrc = toApiAssetUrl(novel.cover_url) || novel.cover_url_orig;

            return (
              <article className={styles.card} key={novel.id}>
                <button
                  className={`${styles.libraryButton} ${novel.in_library ? styles.added : ''}`}
                  type="button"
                  onClick={() => handleLibraryToggle(novel)}
                  disabled={updatingNovelId === novel.id}
                  aria-label={novel.in_library ? `Remove ${novel.title} from library` : `Add ${novel.title} to library`}
                  title={novel.in_library ? 'In library' : 'Add to library'}
                >
                  <i className={`ti ${novel.in_library ? 'ti-check' : 'ti-plus'}`} aria-hidden="true" />
                </button>
                <Link className={styles.cover} to={`/novels/${novel.id}`}>
                  {coverSrc ? (
                    <img src={coverSrc} alt={novel.title} />
                  ) : (
                    <i className="ti ti-book-2" aria-hidden="true" />
                  )}
                </Link>
                <div className={styles.cardBody}>
                  <div className={styles.meta}>
                    <span>{sourceLabels[novel.source_site] || novel.source_site}</span>
                    <span>{novel.total_chapters} chapters</span>
                  </div>
                  <Link className={styles.titleLink} to={`/novels/${novel.id}`}>
                    <h2>{novel.title}</h2>
                  </Link>
                  <div className={styles.author}>{novel.author || 'Unknown author'}</div>
                  <p>{novel.description || 'No description yet.'}</p>
                  <div className={styles.tags}>
                    {novel.tags.slice(0, 1).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {removeTarget && (
        <div className={styles.dialogBackdrop} role="presentation">
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-novel-title"
          >
            <h2 id="remove-novel-title">Remove from library?</h2>
            <p>Do you want to remove {removeTarget.title} from your library?</p>
            <div className={styles.dialogActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => setRemoveTarget(null)}
                disabled={updatingNovelId === removeTarget.id}
              >
                No
              </button>
              <button
                className={styles.dangerButton}
                type="button"
                onClick={removeNovel}
                disabled={updatingNovelId === removeTarget.id}
              >
                Yes
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
