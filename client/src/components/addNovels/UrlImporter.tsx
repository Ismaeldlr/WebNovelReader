import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { detectSourceSiteFromUrl, importByUrl, type UrlSourceSite } from '../../api/import';
import { getJobStatus, type ScrapeJobStatus } from '../../api/jobs';
import styles from './UrlImporter.module.css';

interface UrlImporterProps {
  onImported: () => void;
}

const sourceLabels: Record<UrlSourceSite, string> = {
  ranobes: 'Ranobes',
  wtr_lab: 'WTR Lab',
  royal_road: 'Royal Road',
};

function statusMessage(job: ScrapeJobStatus, elapsedSeconds: number): string {
  if (job.progress.message) return job.progress.message;
  if (job.status === 'pending') return 'Waiting for scraper worker...';
  if (job.status === 'completed') return 'Import complete';
  if (job.status === 'failed') return 'Import failed';
  if (elapsedSeconds < 10) return 'Fetching novel details...';
  if (elapsedSeconds < 25) return 'Loading chapters...';
  return 'Finishing up...';
}

function friendlyError(job: ScrapeJobStatus): string {
  if (job.errorType === 'structure_changed') return 'The site structure may have changed.';
  if (job.errorType === 'network_error') return 'Connection failed. The site may be temporarily unavailable.';
  if (job.errorType === 'rate_limited') return 'The site is rate limiting requests. Try again in a few minutes.';
  return job.errorMessage || 'The import could not be completed.';
}

export default function UrlImporter({ onImported }: UrlImporterProps) {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<ScrapeJobStatus | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notifiedJobId, setNotifiedJobId] = useState<string | null>(null);

  const detectedSource = useMemo(() => detectSourceSiteFromUrl(url), [url]);
  const isTerminal = job?.status === 'completed' || job?.status === 'failed';

  useEffect(() => {
    if (!job || isTerminal) return;

    const createdAt = new Date(job.createdAt).getTime();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - createdAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [job, isTerminal]);

  useEffect(() => {
    if (!job || isTerminal) return;

    let cancelled = false;
    const currentJobId = job.id;

    async function poll() {
      try {
        const nextJob = await getJobStatus(currentJobId);
        if (!cancelled) {
          setError(null);
          setJob(nextJob);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load job status.');
      }
    }

    let timer: number | undefined;
    const schedulePoll = () => {
      if (!cancelled) timer = window.setTimeout(pollAndSchedule, 3000);
    };
    async function pollAndSchedule() {
      await poll();
      schedulePoll();
    }

    void pollAndSchedule();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [job?.id, isTerminal]);

  useEffect(() => {
    if (!job || !isTerminal || notifiedJobId === job.id) return;
    setNotifiedJobId(job.id);
    onImported();
  }, [job, isTerminal, notifiedJobId, onImported]);

  const reset = () => {
    setUrl('');
    setSubmitting(false);
    setError(null);
    setJob(null);
    setElapsedSeconds(0);
    setNotifiedJobId(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || !url.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const queued = await importByUrl(url.trim(), detectedSource || undefined);
      setJob({
        id: queued.id,
        type: queued.type,
        status: queued.status,
        errorType: null,
        errorMessage: null,
        retryCount: 0,
        progress: queued.progress,
        createdAt: queued.createdAt,
        startedAt: null,
        completedAt: null,
        result: null,
      });
      setElapsedSeconds(0);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not queue URL import.');
    } finally {
      setSubmitting(false);
    }
  };

  if (job?.status === 'completed') {
    const result = job.result;
    const novelId = result?.novel_id || result?.novelId;
    const chapterCount = result?.chapter_count ?? result?.chapterCount ?? 0;

    return (
      <div className={styles.statePanel}>
        <div className={styles.stateIcon}>
          <i className="ti ti-circle-check" aria-hidden="true" />
        </div>
        <div className={styles.stateBody}>
          <span className={styles.kicker}>Import complete</span>
          <h2>{result?.novelTitle || 'Novel imported'}</h2>
          <div className={styles.summary}>{chapterCount} chapter{chapterCount === 1 ? '' : 's'}</div>
          <div className={styles.actions}>
            {novelId && (
              <Link className={styles.primaryButton} to={`/novels/${novelId}`}>
                View Novel
              </Link>
            )}
            <button type="button" className={styles.secondaryButton} onClick={reset}>
              Import Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (job?.status === 'failed') {
    return (
      <div className={styles.statePanel}>
        <div className={`${styles.stateIcon} ${styles.failedIcon}`}>
          <i className="ti ti-alert-circle" aria-hidden="true" />
        </div>
        <div className={styles.stateBody}>
          <span className={styles.kicker}>Import failed</span>
          <h2>{friendlyError(job)}</h2>
          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} onClick={reset}>
              Try Another URL
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (job) {
    return (
      <div className={styles.statePanel}>
        <div className={`${styles.stateIcon} ${styles.loadingIcon}`}>
          <i className="ti ti-loader-2" aria-hidden="true" />
        </div>
        <div className={styles.stateBody}>
          <span className={styles.kicker}>{job.status}</span>
          <h2>{statusMessage(job, elapsedSeconds)}</h2>
          <div className={styles.progressTrack}>
            <span style={{ width: `${Math.max(4, job.progress.percent)}%` }} />
          </div>
          {job.progress.current != null && job.progress.total != null && (
            <div className={styles.summary}>
              {job.progress.current} of {job.progress.total} chapters
            </div>
          )}
          {error && <div className={styles.error}>{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.inputGroup}>
        <span>Source URL</span>
        <div className={styles.inputShell}>
          <i className="ti ti-link" aria-hidden="true" />
          <input
            type="url"
            value={url}
            placeholder="https://www.royalroad.com/fiction/..."
            onChange={(event) => {
              setUrl(event.target.value);
              setError(null);
            }}
            required
          />
        </div>
      </label>

      <div className={styles.footerRow}>
        <span className={[styles.sourceBadge, detectedSource ? styles.detected : ''].join(' ')}>
          {detectedSource ? `${sourceLabels[detectedSource]} detected` : 'No source detected'}
        </span>
        <button type="submit" className={styles.primaryButton} disabled={!detectedSource || submitting}>
          {submitting ? (
            <>
              <i className={`ti ti-loader-2 ${styles.spinning}`} aria-hidden="true" />
              Queuing...
            </>
          ) : (
            <>
              <i className="ti ti-send" aria-hidden="true" />
              Submit
            </>
          )}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </form>
  );
}
