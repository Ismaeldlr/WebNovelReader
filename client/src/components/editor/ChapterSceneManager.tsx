import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { createDocument, deleteDocument, reorderDocument, updateDocument } from '../../api/write';
import type { WritingDocumentMeta, WritingDocumentStatus, WritingDocumentType } from '../../types/write';
import styles from './ChapterSceneManager.module.css';

interface ChapterSceneManagerProps {
  projectId: string;
  currentDocumentId: string;
  documents: WritingDocumentMeta[];
  onDocumentsChange: (documents: WritingDocumentMeta[]) => void;
  onNavigate: (documentId: string) => void;
}

interface SortableTreeProps {
  items: WritingDocumentMeta[];
  depth: number;
  childrenByParent: Map<string | null, WritingDocumentMeta[]>;
  parts: WritingDocumentMeta[];
  currentDocumentId: string;
  projectId: string;
  openIds: Set<string>;
  onToggleOpen: (id: string) => void;
  onDocumentsChange: (documents: WritingDocumentMeta[]) => void;
  onNavigate: (documentId: string) => void;
}

interface TreeRowProps extends Omit<SortableTreeProps, 'items' | 'parentId'> {
  document: WritingDocumentMeta;
}

function midpoint(previous?: WritingDocumentMeta, next?: WritingDocumentMeta) {
  if (previous && next) return (previous.order_index + next.order_index) / 2;
  if (previous) return previous.order_index + 1000;
  if (next) return next.order_index / 2;
  return 1000;
}

function descendantsOf(id: string, documents: WritingDocumentMeta[]): string[] {
  const directChildren = documents.filter(document => document.parent_id === id);
  return directChildren.flatMap(child => [child.id, ...descendantsOf(child.id, documents)]);
}

function sortDocuments(documents: WritingDocumentMeta[]) {
  return [...documents].sort((a, b) => a.order_index - b.order_index || a.created_at.localeCompare(b.created_at));
}

export default function ChapterSceneManager({
  projectId,
  currentDocumentId,
  documents,
  onDocumentsChange,
  onNavigate,
}: ChapterSceneManagerProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(documents.map(document => document.id)));
  const tree = useMemo(() => {
    const childrenByParent = new Map<string | null, WritingDocumentMeta[]>();
    documents.forEach(document => {
      const key = document.parent_id || null;
      const siblings = childrenByParent.get(key) || [];
      siblings.push(document);
      childrenByParent.set(key, siblings);
    });
    childrenByParent.forEach((items, key) => childrenByParent.set(key, sortDocuments(items)));

    return {
      childrenByParent,
      parts: sortDocuments(documents.filter(document => document.doc_type === 'part')),
      rootItems: childrenByParent.get(null) || [],
    };
  }, [documents]);

  const toggleOpen = (id: string) => {
    setOpenIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const appendDocument = async (docType: WritingDocumentType) => {
    const created = await createDocument(projectId, {
      title: docType === 'part' ? 'New part' : docType === 'note' ? 'New note' : 'New chapter',
      doc_type: docType,
    });
    onDocumentsChange([...documents, created]);
    if (docType !== 'part') onNavigate(created.id);
  };

  return (
    <div className={styles.manager}>
      <div className={styles.header}>
        <span>Structure</span>
        <strong>{documents.length}</strong>
      </div>

      <div className={styles.tree}>
        <SortableTree
          items={tree.rootItems}
          depth={0}
          childrenByParent={tree.childrenByParent}
          parts={tree.parts}
          currentDocumentId={currentDocumentId}
          projectId={projectId}
          openIds={openIds}
          onToggleOpen={toggleOpen}
          onDocumentsChange={onDocumentsChange}
          onNavigate={onNavigate}
        />
      </div>

      <div className={styles.footerActions}>
        <button type="button" onClick={() => void appendDocument('chapter')}>
          <i className="ti ti-file-plus" aria-hidden="true" />
          <span>Chapter</span>
        </button>
        <button type="button" onClick={() => void appendDocument('part')}>
          <i className="ti ti-folder-plus" aria-hidden="true" />
          <span>Part</span>
        </button>
        <button type="button" onClick={() => void appendDocument('note')}>
          <i className="ti ti-note" aria-hidden="true" />
          <span>Note</span>
        </button>
      </div>
    </div>
  );
}

function SortableTree({
  items,
  depth,
  childrenByParent,
  parts,
  currentDocumentId,
  projectId,
  openIds,
  onToggleOpen,
  onDocumentsChange,
  onNavigate,
}: SortableTreeProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(item => item.id === active.id);
    const newIndex = items.findIndex(item => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const activeItem = items[oldIndex];
    const nextItems = [...items];
    nextItems.splice(oldIndex, 1);
    nextItems.splice(newIndex, 0, activeItem);
    const previous = nextItems[newIndex - 1];
    const next = nextItems[newIndex + 1];
    const nextOrder = midpoint(previous, next);

    const allDocuments = Array.from(childrenByParent.values()).flat();
    const patchedDocuments = allDocuments.map(document => (
      document.id === activeItem.id ? { ...document, order_index: nextOrder } : document
    ));
    onDocumentsChange(patchedDocuments);
    await reorderDocument(activeItem.id, nextOrder);
  };

  if (items.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={event => void handleDragEnd(event)}>
      <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
        <div className={styles.group}>
          {items.map(document => (
            <TreeRow
              key={document.id}
              document={document}
              depth={depth}
              childrenByParent={childrenByParent}
              parts={parts}
              currentDocumentId={currentDocumentId}
              projectId={projectId}
              openIds={openIds}
              onToggleOpen={onToggleOpen}
              onDocumentsChange={onDocumentsChange}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function TreeRow({
  document,
  depth,
  childrenByParent,
  parts,
  currentDocumentId,
  projectId,
  openIds,
  onToggleOpen,
  onDocumentsChange,
  onNavigate,
}: TreeRowProps) {
  const allDocuments = Array.from(childrenByParent.values()).flat();
  const children = childrenByParent.get(document.id) || [];
  const canHaveChildren = document.doc_type === 'part' || document.doc_type === 'chapter';
  const isOpen = openIds.has(document.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(document.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: document.id });
  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  const updateLocal = (patch: Partial<WritingDocumentMeta>) => {
    onDocumentsChange(allDocuments.map(item => (
      item.id === document.id ? { ...item, ...patch } : item
    )));
  };

  const saveRename = async () => {
    const nextTitle = renameDraft.trim() || document.title;
    setRenaming(false);
    if (nextTitle === document.title) return;
    updateLocal({ title: nextTitle });
    await updateDocument(document.id, { title: nextTitle });
  };

  const changeStatus = async (status: WritingDocumentStatus) => {
    setMenuOpen(false);
    updateLocal({ status });
    await updateDocument(document.id, { status });
  };

  const addChild = async (docType: WritingDocumentType) => {
    const siblings = childrenByParent.get(document.id) || [];
    const created = await createDocument(projectId, {
      title: docType === 'scene' ? 'New scene' : 'New chapter',
      doc_type: docType,
      parent_id: document.id,
      order_index: midpoint(siblings[siblings.length - 1]),
    });
    onDocumentsChange([...allDocuments, created]);
    setMenuOpen(false);
    if (!openIds.has(document.id)) onToggleOpen(document.id);
    onNavigate(created.id);
  };

  const moveToPart = async (partId: string | null) => {
    setMenuOpen(false);
    updateLocal({ parent_id: partId });
    await updateDocument(document.id, { parent_id: partId });
  };

  const deleteRow = async () => {
    const removeIds = new Set([document.id, ...descendantsOf(document.id, allDocuments)]);
    onDocumentsChange(allDocuments.filter(item => !removeIds.has(item.id)));
    await deleteDocument(document.id);
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? styles.dragging : undefined}>
      <div
        className={[
          styles.row,
          currentDocumentId === document.id ? styles.activeRow : '',
          document.doc_type === 'part' ? styles.partRow : '',
        ].filter(Boolean).join(' ')}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <button type="button" className={styles.dragHandle} {...attributes} {...listeners} aria-label="Drag item">
          <i className="ti ti-grip-vertical" aria-hidden="true" />
        </button>

        {canHaveChildren && children.length > 0 ? (
          <button type="button" className={styles.collapseButton} onClick={() => onToggleOpen(document.id)}>
            <i className={`ti ${isOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} aria-hidden="true" />
          </button>
        ) : (
          <span className={styles.collapseSpacer} />
        )}

        {renaming ? (
          <input
            className={styles.renameInput}
            value={renameDraft}
            onChange={event => setRenameDraft(event.target.value)}
            onBlur={() => void saveRename()}
            onKeyDown={event => {
              if (event.key === 'Enter') void saveRename();
              if (event.key === 'Escape') {
                setRenameDraft(document.title);
                setRenaming(false);
              }
            }}
            autoFocus
          />
        ) : (
          <button
            type="button"
            className={styles.titleButton}
            onClick={() => document.doc_type === 'part' ? onToggleOpen(document.id) : onNavigate(document.id)}
          >
            <span className={`${styles.statusDot} ${styles[`status-${document.status}`]}`} />
            <span>{document.title}</span>
          </button>
        )}

        <span className={styles.wordCount}>{document.word_count.toLocaleString()}</span>

        <div className={styles.menuAnchor}>
          <button type="button" className={styles.kebab} onClick={() => setMenuOpen(open => !open)}>
            <i className="ti ti-dots" aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className={styles.menu}>
              <button type="button" onClick={() => { setRenaming(true); setMenuOpen(false); }}>Rename</button>
              <div className={styles.menuLabel}>Status</div>
              <button type="button" onClick={() => void changeStatus('draft')}>Draft</button>
              <button type="button" onClick={() => void changeStatus('in_progress')}>In progress</button>
              <button type="button" onClick={() => void changeStatus('done')}>Done</button>
              {document.doc_type === 'chapter' && (
                <button type="button" onClick={() => void addChild('scene')}>Add scene below</button>
              )}
              {document.doc_type === 'part' && (
                <button type="button" onClick={() => void addChild('chapter')}>Add chapter below</button>
              )}
              {document.doc_type !== 'part' && (
                <>
                  <div className={styles.menuLabel}>Move to part</div>
                  <button type="button" onClick={() => void moveToPart(null)}>No part</button>
                  {parts.map(part => (
                    <button key={part.id} type="button" onClick={() => void moveToPart(part.id)}>
                      {part.title}
                    </button>
                  ))}
                </>
              )}
              <button type="button" className={styles.dangerItem} onClick={() => { setConfirmingDelete(true); setMenuOpen(false); }}>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {confirmingDelete && (
        <div className={styles.confirmDelete} style={{ marginLeft: `${8 + depth * 16}px` }}>
          <span>Delete this {document.doc_type}? All children will be lost.</span>
          <button type="button" onClick={() => setConfirmingDelete(false)}>Cancel</button>
          <button type="button" onClick={() => void deleteRow()}>Delete</button>
        </div>
      )}

      {isOpen && children.length > 0 && (
        <SortableTree
          items={children}
          depth={depth + 1}
          childrenByParent={childrenByParent}
          parts={parts}
          currentDocumentId={currentDocumentId}
          projectId={projectId}
          openIds={openIds}
          onToggleOpen={onToggleOpen}
          onDocumentsChange={onDocumentsChange}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
