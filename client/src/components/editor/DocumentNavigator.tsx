import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { WritingDocumentMeta } from '../../types/write';
import styles from './DocumentNavigator.module.css';

interface DocumentNavigatorProps {
  projectId: string;
  currentDocumentId: string;
  documents: WritingDocumentMeta[];
}

const VIRTUALIZE_AFTER = 100;

export default function DocumentNavigator({
  projectId,
  currentDocumentId,
  documents,
}: DocumentNavigatorProps) {
  const navigate = useNavigate();
  const parentRef = useRef<HTMLDivElement | null>(null);
  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => a.order_index - b.order_index),
    [documents]
  );
  const shouldVirtualize = sortedDocuments.length > VIRTUALIZE_AFTER;
  const rowVirtualizer = useVirtualizer({
    count: sortedDocuments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 58,
    overscan: 8,
  });

  const renderRow = (document: WritingDocumentMeta) => (
    <button
      key={document.id}
      type="button"
      className={document.id === currentDocumentId ? styles.activeRow : styles.row}
      onClick={() => navigate(`/write/${projectId}/documents/${document.id}`)}
    >
      <span className={`${styles.statusDot} ${styles[`status-${document.status}`]}`} />
      <span className={styles.rowText}>
        <strong>{document.title}</strong>
        <span>{document.word_count.toLocaleString()} words</span>
      </span>
    </button>
  );

  return (
    <div className={styles.navigator}>
      <div className={styles.header}>
        <span>Documents</span>
        <strong>{sortedDocuments.length}</strong>
      </div>

      <div ref={parentRef} className={styles.list}>
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
                  {renderRow(document)}
                </div>
              );
            })}
          </div>
        ) : (
          sortedDocuments.map(renderRow)
        )}
      </div>
    </div>
  );
}
