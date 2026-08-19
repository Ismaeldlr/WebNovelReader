import { useEffect, useMemo, useState } from 'react';
import {
  createDocumentVersion,
  fetchDocumentVersion,
  fetchDocumentVersions,
} from '../../api/write';
import type {
  WritingDocumentVersion,
  WritingDocumentVersionMeta,
} from '../../types/write';
import TiptapEditor from './TiptapEditor';
import styles from './VersionHistoryPanel.module.css';

interface VersionHistoryPanelProps {
  documentId: string;
  currentContent: string;
  currentWordCount: number;
  onClose: () => void;
  onRestore: (content: string, wordCount: number) => Promise<void> | void;
}

const dateTimeFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export default function VersionHistoryPanel({
  documentId,
  currentContent,
  currentWordCount,
  onClose,
  onRestore,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<WritingDocumentVersionMeta[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<WritingDocumentVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchDocumentVersions(documentId)
      .then(nextVersions => {
        if (mounted) setVersions(nextVersions);
      })
      .catch((err: Error) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [documentId]);

  const selectedId = selectedVersion?.id;
  const title = useMemo(() => {
    if (!selectedVersion) return 'Select a snapshot';
    return dateTimeFormatter.format(new Date(selectedVersion.snapshot_at));
  }, [selectedVersion]);

  const handleSelectVersion = async (versionId: string) => {
    setLoadingVersion(true);
    setError(null);
    try {
      const version = await fetchDocumentVersion(documentId, versionId);
      setSelectedVersion(version);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version');
    } finally {
      setLoadingVersion(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedVersion) return;
    const confirmed = window.confirm('Restore this version? The current draft will be saved as a snapshot first.');
    if (!confirmed) return;

    setRestoring(true);
    setError(null);
    try {
      await createDocumentVersion(documentId, {
        content: currentContent,
        word_count: currentWordCount,
      });
      await onRestore(selectedVersion.content, selectedVersion.word_count);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore version');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <aside className={styles.panel} aria-label="Version history">
        <header className={styles.header}>
          <div>
            <h2>Version History</h2>
            <p>{versions.length} snapshot{versions.length === 1 ? '' : 's'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close version history" title="Close">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.body}>
          <div className={styles.list}>
            {loading ? (
              <div className={styles.muted}>Loading snapshots...</div>
            ) : versions.length === 0 ? (
              <div className={styles.muted}>No snapshots yet.</div>
            ) : (
              versions.map(version => (
                <button
                  key={version.id}
                  type="button"
                  className={version.id === selectedId ? styles.versionActive : styles.versionRow}
                  onClick={() => {
                    void handleSelectVersion(version.id);
                  }}
                >
                  <span>{dateTimeFormatter.format(new Date(version.snapshot_at))}</span>
                  <strong>{version.word_count.toLocaleString()} words</strong>
                </button>
              ))
            )}
          </div>

          <section className={styles.preview}>
            <div className={styles.previewHeader}>
              <div>
                <h3>{title}</h3>
                {selectedVersion && <p>{selectedVersion.word_count.toLocaleString()} words</p>}
              </div>
              <button
                type="button"
                onClick={handleRestore}
                disabled={!selectedVersion || restoring}
              >
                {restoring ? 'Restoring...' : 'Restore this version'}
              </button>
            </div>

            {loadingVersion ? (
              <div className={styles.muted}>Loading preview...</div>
            ) : selectedVersion ? (
              <div className={styles.splitPreview}>
                <div className={styles.previewPane}>
                  <span>Current</span>
                  <TiptapEditor initialContent={currentContent} readOnly />
                </div>
                <div className={styles.previewPane}>
                  <span>Snapshot</span>
                  <TiptapEditor initialContent={selectedVersion.content} readOnly />
                </div>
              </div>
            ) : (
              <div className={styles.muted}>Choose a snapshot to preview it.</div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
