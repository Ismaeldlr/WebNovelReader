import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import CoverUpload from '../components/novelEdit/CoverUpload';
import EditForm from '../components/novelEdit/EditForm';
import { deleteNovelRecord } from '../api/novels';
import { useNovelDetail } from '../hooks/useNovelDetail';
import styles from './NovelEditPage.module.css';

export default function NovelEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { novel, loading, error, retry } = useNovelDetail(id);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!novel || deleting) return;
    if (!window.confirm(`Delete "${novel.title}" and all of its chapters? This cannot be undone.`)) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteNovelRecord(novel.id);
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unable to delete novel.');
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className={styles.state}>Loading edit form...</div>;
  }

  if (!novel) {
    return (
      <div className={styles.state}>
        <h1>Unable to load novel.</h1>
        <p>{error || 'The novel could not be found.'}</p>
        <button type="button" onClick={retry}>Try again</button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Novel Metadata</div>
          <h1>Edit Novel</h1>
          <p>{novel.title}</p>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Cover</span>
          <h2>Cover Image</h2>
        </div>
        <CoverUpload novelId={novel.id} title={novel.title} coverUrl={novel.cover_url} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Details</span>
          <h2>Novel Metadata</h2>
        </div>
        <EditForm novel={novel} />
      </section>

      <section className={`${styles.section} ${styles.dangerSection}`}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Danger Zone</span>
          <h2>Delete Novel</h2>
        </div>
        <p>
          Delete this novel, its chapters, reading history, and library entries from Webnovel Hub.
        </p>
        {deleteError && <div className={styles.error}>{deleteError}</div>}
        <button className={styles.deleteButton} type="button" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting...' : 'Delete Novel'}
        </button>
      </section>
    </div>
  );
}
