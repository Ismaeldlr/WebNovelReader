import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecentImports, type RecentImport } from '../../api/import';
import { getJobStatus } from '../../api/jobs';
import { formatRelativeDate } from '../../utils/date';
import styles from './RecentImports.module.css';

interface RecentImportsProps {
  refreshSignal: number;
}

function methodLabel(job: RecentImport): string {
  const source = job.payload?.source_site || job.payload?.source || job.sourceSite;
  if (source === 'epub') return 'EPUB';
  if (source === 'wtr_lab') return 'WTR Lab';
  if (source === 'royal_road') return 'Royal Road';
  if (source === 'ranobes') return 'Ranobes';
  return source || 'Import';
}

function statusLabel(status: RecentImport['status']): string {
  if (status === 'pending') return 'Waiting in queue';
  if (status === 'running') return 'Working';
  if (status === 'completed') return 'Completed';
  return 'Failed';
}

function isActive(job: RecentImport): boolean {
  return job.status === 'pending' || job.status === 'running';
}

export default function RecentImports({ refreshSignal }: RecentImportsProps) {
  const [imports, setImports] = useState<RecentImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let firstLoad = true;

    async function load() {
      if (firstLoad) setLoading(true);
      setError(null);
      try {
        const rows = await getRecentImports();
        if (!cancelled) setImports(rows);

        const activeRows = rows.filter(isActive);
        if (activeRows.length > 0) {
          const updates = await Promise.all(
            activeRows.map(async (row) => {
              try {
                const status = await getJobStatus(row.id);
                return {
                  ...row,
                  status: status.status,
                  completedAt: status.completedAt,
                  startedAt: status.startedAt,
                  errorMessage: status.errorMessage,
                  progress: status.progress,
                };
              } catch (err) {
                return row;
              }
            }),
          );

          if (!cancelled) {
            const byId = new Map(updates.map((row) => [row.id, row]));
            setImports((current) => current.map((row) => byId.get(row.id) || row));
          }
        }

        if (!cancelled && activeRows.length > 0) {
          timer = window.setTimeout(() => void load(), 3000);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load recent imports.');
      } finally {
        if (!cancelled && firstLoad) {
          firstLoad = false;
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
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
                    <span>{job.payload?.filename || job.payload?.url || 'Untitled import'}</span>
                  )}
                  <small>{methodLabel(job)}</small>
                  {isActive(job) && job.progress.message && <small>{job.progress.message}</small>}
                </div>
              </div>
              <div className={styles.statusCell}>
                <span className={`${styles.status} ${styles[job.status]}`}>{statusLabel(job.status)}</span>
                {isActive(job) && (
                  <div className={styles.progressTrack} aria-label={`${job.progress.percent}% complete`}>
                    <span style={{ width: `${Math.max(4, job.progress.percent)}%` }} />
                  </div>
                )}
              </div>
              <time>{formatRelativeDate(job.createdAt)}</time>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
