import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  createPendingItem,
  deletePendingItem,
  fetchPendingItems,
  updatePendingItem,
} from '../../api/write';
import type { PendingItem, PendingTag } from '../../types/write';
import styles from './PendingItemsPanel.module.css';

interface PendingItemsPanelProps {
  projectId: string;
  onClose: () => void;
}

interface PendingRowProps {
  item: PendingItem;
  onPatch: (itemId: string, patch: Partial<PendingItem>) => void;
  onDelete: (itemId: string) => void;
}

const tagOptions: PendingTag[] = ['urgent', 'idea', 'scene'];

function midpoint(previous?: PendingItem, next?: PendingItem) {
  if (previous && next) return (previous.order_index + next.order_index) / 2;
  if (previous) return previous.order_index + 1000;
  if (next) return next.order_index / 2;
  return 1000;
}

function positionKey(projectId: string) {
  return `wnh_pending_panel_position_${projectId}`;
}

function readPosition(projectId: string) {
  const raw = localStorage.getItem(positionKey(projectId));
  if (!raw) return { x: 24, y: 80 };

  try {
    const parsed = JSON.parse(raw) as { x: number; y: number };
    return Number.isFinite(parsed.x) && Number.isFinite(parsed.y) ? parsed : { x: 24, y: 80 };
  } catch {
    return { x: 24, y: 80 };
  }
}

export default function PendingItemsPanel({ projectId, onClose }: PendingItemsPanelProps) {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<PendingTag>('idea');
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState(() => readPosition(projectId));
  const dragStartRef = useRef<{ x: number; y: number; panelX: number; panelY: number } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const unresolvedItems = useMemo(
    () => items.filter(item => !item.is_resolved).sort((a, b) => a.order_index - b.order_index),
    [items]
  );
  const resolvedItems = useMemo(
    () => items.filter(item => item.is_resolved).sort((a, b) => a.order_index - b.order_index),
    [items]
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchPendingItems(projectId, true)
      .then(nextItems => {
        if (mounted) setItems(nextItems);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    localStorage.setItem(positionKey(projectId), JSON.stringify(position));
  }, [position, projectId]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStartRef.current) return;
      const next = {
        x: Math.max(8, dragStartRef.current.panelX + event.clientX - dragStartRef.current.x),
        y: Math.max(8, dragStartRef.current.panelY + event.clientY - dragStartRef.current.y),
      };
      setPosition(next);
    };
    const handleMouseUp = () => {
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const patchItem = useCallback((itemId: string, patch: Partial<PendingItem>) => {
    setItems(current => current.map(item => item.id === itemId ? { ...item, ...patch } : item));
  }, []);

  const handleAdd = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const created = await createPendingItem(projectId, { content: trimmed, tag });
    setItems(current => [...current, created]);
    setContent('');
    setTag('idea');
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = unresolvedItems.findIndex(item => item.id === active.id);
    const newIndex = unresolvedItems.findIndex(item => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const activeItem = unresolvedItems[oldIndex];
    const nextItems = [...unresolvedItems];
    nextItems.splice(oldIndex, 1);
    nextItems.splice(newIndex, 0, activeItem);
    const nextOrder = midpoint(nextItems[newIndex - 1], nextItems[newIndex + 1]);
    patchItem(activeItem.id, { order_index: nextOrder });
    await updatePendingItem(activeItem.id, { order_index: nextOrder });
  };

  const startPanelDrag = (event: ReactMouseEvent<HTMLDivElement>) => {
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      panelX: position.x,
      panelY: position.y,
    };
  };

  return (
    <div className={styles.panel} style={{ right: `${position.x}px`, bottom: `${position.y}px` }}>
      <div className={styles.titleBar} onMouseDown={startPanelDrag}>
        <strong>Open Threads</strong>
        <button type="button" onClick={onClose} aria-label="Close pending items" title="Close">
          <i className="ti ti-x" aria-hidden="true" />
        </button>
      </div>

      <div className={styles.addForm}>
        <input
          value={content}
          placeholder="Add item..."
          onChange={event => setContent(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') void handleAdd();
          }}
        />
        <div className={styles.tagPicker}>
          {tagOptions.map(option => (
            <button
              key={option}
              type="button"
              className={tag === option ? styles[`tag-${option}`] : ''}
              onClick={() => setTag(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <button type="button" className={styles.addButton} onClick={() => void handleAdd()}>
          Add
        </button>
      </div>

      <div className={styles.list}>
        {loading ? (
          <div className={styles.empty}>Loading threads...</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={event => void handleDragEnd(event)}>
            <SortableContext items={unresolvedItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
              {unresolvedItems.map(item => (
                <PendingRow
                  key={item.id}
                  item={item}
                  onPatch={patchItem}
                  onDelete={itemId => setItems(current => current.filter(item => item.id !== itemId))}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {!loading && unresolvedItems.length === 0 && <div className={styles.empty}>No open threads.</div>}

        <label className={styles.showResolved}>
          <input
            type="checkbox"
            checked={showResolved}
            onChange={event => setShowResolved(event.target.checked)}
          />
          <span>Show resolved</span>
        </label>

        {showResolved && (
          <div className={styles.resolvedList}>
            {resolvedItems.map(item => (
              <div key={item.id} className={styles.resolvedRow}>
                <span>{item.content}</span>
                <button
                  type="button"
                  onClick={() => {
                    patchItem(item.id, { is_resolved: false });
                    void updatePendingItem(item.id, { is_resolved: false });
                  }}
                >
                  Unresolve
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PendingRow({ item, onPatch, onDelete }: PendingRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(item.content);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  const saveDraft = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === item.content) return;
    onPatch(item.id, { content: trimmed });
    await updatePendingItem(item.id, { content: trimmed });
  };

  return (
    <div ref={setNodeRef} style={style} className={`${styles.itemRow} ${isDragging ? styles.dragging : ''}`}>
      <button type="button" className={styles.dragHandle} {...attributes} {...listeners} aria-label="Drag pending item">
        <i className="ti ti-grip-vertical" aria-hidden="true" />
      </button>
      <span className={`${styles.tagBadge} ${styles[`tag-${item.tag}`]}`}>{item.tag}</span>
      <button type="button" className={styles.itemText} onClick={() => setExpanded(open => !open)}>
        {item.content}
      </button>
      <button
        type="button"
        className={styles.resolveButton}
        onClick={() => {
          onPatch(item.id, { is_resolved: true });
          void updatePendingItem(item.id, { is_resolved: true });
        }}
        aria-label="Resolve item"
        title="Resolve"
      >
        <i className="ti ti-check" aria-hidden="true" />
      </button>
      {expanded && (
        <div className={styles.expandedEditor}>
          <textarea
            value={draft}
            rows={3}
            onChange={event => setDraft(event.target.value)}
            onBlur={() => void saveDraft()}
          />
          <button
            type="button"
            onClick={() => {
              onDelete(item.id);
              void deletePendingItem(item.id);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
