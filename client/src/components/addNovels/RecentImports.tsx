import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecentImports, type RecentImport } from '../../api/import';
import { formatRelativeDate } from '../../utils/date';
import styles from './RecentImports.module.css';

interface RecentImportsProps {
  refreshSignal: number;
}

function methodLabel(job: RecentImport): string {
  const source = job.payload?.source || job.sourceSite;
  if (source === 'epub') return 'EPUB';
  if (source === 'wtr_lab') return 'WTR Lab';
  if (source === 'royal_road') return 'Royal Road';
  if (source === 'ranobes') return 'Ranobes';
  return source || 'Import';
}

export default function RecentImports({ refreshSignal }: RecentImportsProps) {
  const [imports, setImports] = useState<RecentImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const rows = await getRecentImports();
        if (!cancelled) setImports(rows);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load recent imports.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Activity</span>
          <h2>Recent Imports</h2>
        </div>
      </div>

      {loading ? (
        <div className={styles.empty}>Loading recent imports...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : imports.length === 0 ? (
        <div className={styles.empty}>No imports yet.</div>
      ) : (
        <div className={styles.list}>
          {imports.map(job => (
            <div key={job.id} className={styles.row}>
              <div className={styles.titleCell}>
                <i className="ti ti-history" aria-hidden="true" />
                <div>
                  {job.novelId && job.novelTitle ? (
                    <Link to={`/novels/${job.novelId}`}>{job.novelTitle}</Link>
                  ) : (
                    <span>{job.payload?.filename || 'Untitled import'}</span>
                  )}
                  <small>{methodLabel(job)}</small>
                </div>
              </div>
              <span className={`${styles.status} ${styles[job.status]}`}>{job.status}</span>
              <time>{formatRelativeDate(job.createdAt)}</time>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
