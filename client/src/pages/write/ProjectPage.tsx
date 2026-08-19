import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { createDocument, fetchProjectDocuments, getProject } from '../../api/write';
import WritingLayout from '../../layouts/WritingLayout';
import type { WritingDocumentMeta, WritingDocumentType, WritingProject } from '../../types/write';
import { formatRelativeDate } from '../../utils/date';
import styles from './ProjectPage.module.css';

const VIRTUALIZE_AFTER = 100;

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<WritingProject | null>(null);
  const [documents, setDocuments] = useState<WritingDocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<WritingDocumentType>('chapter');
  const listRef = useRef<HTMLDivElement | null>(null);
  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => a.order_index - b.order_index),
    [documents]
  );
  const shouldVirtualize = sortedDocuments.length > VIRTUALIZE_AFTER;
  const rowVirtualizer = useVirtualizer({
    count: sortedDocuments.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 58,
    overscan: 8,
  });

  const loadProject = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);
    try {
      const [nextProject, nextDocuments] = await Promise.all([
        getProject(projectId),
        fetchProjectDocuments(projectId),
      ]);
      setProject(nextProject);
      setDocuments(nextDocuments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  const resetForm = () => {
    setTitle('');
    setDocType('chapter');
  };

  const handleCreateDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId || !title.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const document = await createDocument(projectId, {
        title: title.trim(),
        doc_type: docType,
      });
      resetForm();
      setModalOpen(false);
      if (document.doc_type === 'part') {
        setDocuments(current => [...current, document]);
      } else {
        navigate(`/write/${projectId}/documents/${document.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setSaving(false);
    }
  };

  const renderDocumentRow = (document: WritingDocumentMeta, index: number) => (
    <button
      key={document.id}
      type="button"
      className={styles.documentRow}
      onClick={() => {
        if (document.doc_type !== 'part') {
          navigate(`/write/${projectId}/documents/${document.id}`);
        }
      }}
    >
      <span className={styles.order}>{index + 1}</span>
      <span className={styles.docMain}>
        <strong>{document.title}</strong>
        <span>{document.summary || `${document.doc_type} / ${document.status}`}</span>
      </span>
      <span className={styles.docMeta}>{document.word_count.toLocaleString()} words</span>
      <i className="ti ti-chevron-right" aria-hidden="true" />
    </button>
  );

  if (!projectId) {
    return <div className={styles.centerState}>Project not found.</div>;
  }

  return (
    <WritingLayout
      projectId={projectId}
      projectTitle={project?.title || 'Writing project'}
      documentTitle="Documents"
      showStatusBar={false}
    >
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <Link to="/write" className={styles.backLink}>
              <i className="ti ti-arrow-left" aria-hidden="true" />
              <span>Projects</span>
            </Link>
            <h1>{project?.title || 'Writing project'}</h1>
            {project?.description && <p>{project.description}</p>}
          </div>
          <button type="button" className={styles.primaryButton} onClick={() => setModalOpen(true)}>
            <i className="ti ti-plus" aria-hidden="true" />
            <span>New Document</span>
          </button>
        </div>

        {project && (
          <div className={styles.stats}>
            <div>
              <span>Words</span>
              <strong>{project.word_count.toLocaleString()}</strong>
            </div>
            <div>
              <span>Documents</span>
              <strong>{project.document_count.toLocaleString()}</strong>
            </div>
            <div>
              <span>Genre</span>
              <strong>{project.genre || 'None'}</strong>
            </div>
            <div>
              <span>Updated</span>
              <strong>{formatRelativeDate(project.updated_at)}</strong>
            </div>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {loading ? (
          <div className={styles.empty}>Loading documents...</div>
        ) : sortedDocuments.length === 0 ? (
          <div className={styles.empty}>No documents yet.</div>
        ) : (
          <div className={styles.documentList} ref={listRef}>
            {shouldVirtualize ? (
              <div
                className={styles.virtualInner}
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {rowVirtualizer.getVirtualItems().map(virtualRow => {
                  const document = sortedDocuments[virtualRow.index];
                  return (
                    <div
                      key={document.id}
                      className={styles.virtualRow}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {renderDocumentRow(document, virtualRow.index)}
                    </div>
                  );
                })}
              </div>
            ) : (
              sortedDocuments.map(renderDocumentRow)
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className={styles.modalOverlay}>
          <form className={styles.modal} onSubmit={handleCreateDocument}>
            <div className={styles.modalHeader}>
              <h2>New Document</h2>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                aria-label="Close"
                title="Close"
              >
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>

            <div className={styles.segmented} aria-label="Document type">
              <button
                type="button"
                className={docType === 'chapter' ? styles.segmentActive : ''}
                onClick={() => setDocType('chapter')}
              >
                Chapter
              </button>
              <button
                type="button"
                className={docType === 'part' ? styles.segmentActive : ''}
                onClick={() => setDocType('part')}
              >
                Part
              </button>
              <button
                type="button"
                className={docType === 'note' ? styles.segmentActive : ''}
                onClick={() => setDocType('note')}
              >
                Note
              </button>
            </div>

            <label>
              <span>Title</span>
              <input value={title} onChange={event => setTitle(event.target.value)} required autoFocus />
            </label>

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving || !title.trim()}>
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </WritingLayout>
  );
}
