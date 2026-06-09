import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import CoverUpload from '../components/novelEdit/CoverUpload';
import EditForm from '../components/novelEdit/EditForm';
import { useNovelDetail } from '../hooks/useNovelDetail';
import styles from './NovelEditPage.module.css';

export default function NovelEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { novel, loading, error, retry } = useNovelDetail(id);

  useEffect(() => {
    if (novel && novel.source_site !== 'epub') {
      navigate(`/novels/${novel.id}`, { replace: true });
    }
  }, [navigate, novel]);

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

  if (novel.source_site !== 'epub') return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>EPUB Metadata</div>
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
    </div>
  );
}
