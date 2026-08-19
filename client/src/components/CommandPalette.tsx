import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createDocument, fetchProjectDocuments, fetchProjects } from '../api/write';
import { hasEditorShortcut, runEditorShortcut } from '../lib/editorShortcuts';
import type { WritingDocumentMeta, WritingProject } from '../types/write';
import styles from './CommandPalette.module.css';

export interface CommandPaletteHandle {
  openPalette: () => void;
}

interface PaletteDocument extends WritingDocumentMeta {
  projectTitle: string;
}

interface RecentDocument {
  id: string;
  projectId: string;
  title: string;
  projectTitle: string;
}

type PaletteItemType = 'action' | 'document' | 'project' | 'recent';

interface PaletteItem {
  id: string;
  type: PaletteItemType;
  label: string;
  detail?: string;
  icon: string;
  run: () => void;
}

const RECENT_DOCUMENTS_KEY = 'wnh_recent_documents';

function getCurrentProjectId(pathname: string) {
  const match = pathname.match(/^\/write\/([^/]+)/);
  return match?.[1] || null;
}

function readRecentDocuments() {
  const raw = localStorage.getItem(RECENT_DOCUMENTS_KEY);
  if (!raw) return [];

  try {
    return (JSON.parse(raw) as RecentDocument[]).slice(0, 5);
  } catch {
    return [];
  }
}

const CommandPalette = forwardRef<CommandPaletteHandle>(function CommandPalette(_, ref) {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<WritingProject[]>([]);
  const [documents, setDocuments] = useState<PaletteDocument[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);

  const currentProjectId = getCurrentProjectId(location.pathname);
  const isInWriteSection = location.pathname.startsWith('/write');

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery('');
    setSelectedIndex(0);
    setRecentDocuments(readRecentDocuments());
  }, []);

  useImperativeHandle(ref, () => ({ openPalette }), [openPalette]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open || projects.length > 0) return;
    let mounted = true;
    setLoading(true);

    fetchProjects(false)
      .then(async nextProjects => {
        const nestedDocuments = await Promise.all(
          nextProjects.map(project => (
            fetchProjectDocuments(project.id).then(projectDocuments => (
              projectDocuments.map(document => ({
                ...document,
                projectTitle: project.title,
              }))
            ))
          ))
        );

        if (mounted) {
          setProjects(nextProjects);
          setDocuments(nestedDocuments.flat());
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [open, projects.length]);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const actionItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [
      {
        id: 'go-library',
        type: 'action',
        label: 'Go to Library',
        detail: 'Reading',
        icon: 'ti-books',
        run: () => navigate('/'),
      },
      {
        id: 'go-explore',
        type: 'action',
        label: 'Go to Explore',
        detail: 'Reading',
        icon: 'ti-compass',
        run: () => navigate('/explore'),
      },
      {
        id: 'search-novels',
        type: 'action',
        label: 'Search novels',
        detail: 'Reading',
        icon: 'ti-search',
        run: () => navigate('/explore'),
      },
      {
        id: 'new-project',
        type: 'action',
        label: 'New Project',
        detail: 'Write',
        icon: 'ti-folder-plus',
        run: () => navigate('/write'),
      },
    ];

    if (isInWriteSection && currentProjectId) {
      items.push(
        {
          id: 'new-chapter',
          type: 'action',
          label: 'New Chapter',
          detail: 'Create in current project',
          icon: 'ti-file-plus',
          run: () => {
            void createDocument(currentProjectId, {
              title: 'Untitled chapter',
              doc_type: 'chapter',
            }).then(document => navigate(`/write/${currentProjectId}/documents/${document.id}`));
          },
        },
        {
          id: 'new-note',
          type: 'action',
          label: 'New Note',
          detail: 'Create in current project',
          icon: 'ti-notes',
          run: () => {
            void createDocument(currentProjectId, {
              title: 'Untitled note',
              doc_type: 'note',
            }).then(document => navigate(`/write/${currentProjectId}/documents/${document.id}`));
          },
        }
      );
    }

    if (hasEditorShortcut('toggleDistractionFree')) {
      items.push({
        id: 'toggle-focus',
        type: 'action',
        label: 'Toggle Focus Mode',
        detail: 'Editor',
        icon: 'ti-arrows-maximize',
        run: () => {
          runEditorShortcut('toggleDistractionFree');
        },
      });
    }

    if (hasEditorShortcut('openVersionHistory')) {
      items.push({
        id: 'version-history',
        type: 'action',
        label: 'Version History',
        detail: 'Editor',
        icon: 'ti-history',
        run: () => {
          runEditorShortcut('openVersionHistory');
        },
      });
    }

    if (hasEditorShortcut('openPendingItems')) {
      items.push({
        id: 'open-pending-items',
        type: 'action',
        label: 'Open Pending Items',
        detail: 'Editor',
        icon: 'ti-list-check',
        run: () => {
          runEditorShortcut('openPendingItems');
        },
      });
    }

    if (hasEditorShortcut('toggleTypewriterSounds')) {
      items.push({
        id: 'toggle-typewriter-sounds',
        type: 'action',
        label: 'Toggle Typewriter Sounds',
        detail: 'Focus mode',
        icon: 'ti-volume',
        run: () => {
          runEditorShortcut('toggleTypewriterSounds');
        },
      });
    }

    return items;
  }, [currentProjectId, isInWriteSection, navigate, open]);

  const groupedItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = (value: string) => value.toLowerCase().includes(normalizedQuery);

    const recentItems: PaletteItem[] = normalizedQuery
      ? []
      : recentDocuments.map(document => ({
        id: `recent-${document.id}`,
        type: 'recent',
        label: document.title,
        detail: document.projectTitle,
        icon: 'ti-clock',
        run: () => navigate(`/write/${document.projectId}/documents/${document.id}`),
      }));

    const actionResults = actionItems
      .filter(item => !normalizedQuery || matches(item.label) || matches(item.detail || ''));
    const documentResults = documents
      .filter(document => (
        document.doc_type !== 'part' &&
        normalizedQuery &&
        (matches(document.title) || matches(document.projectTitle))
      ))
      .map(document => ({
        id: `document-${document.id}`,
        type: 'document' as const,
        label: document.title,
        detail: document.projectTitle,
        icon: document.doc_type === 'note' ? 'ti-note' : 'ti-file-text',
        run: () => navigate(`/write/${document.project_id}/documents/${document.id}`),
      }));
    const projectResults = projects
      .filter(project => normalizedQuery && matches(project.title))
      .map(project => ({
        id: `project-${project.id}`,
        type: 'project' as const,
        label: project.title,
        detail: `${project.word_count.toLocaleString()} words`,
        icon: 'ti-notebook',
        run: () => navigate(`/write/${project.id}`),
      }));

    return [
      { label: normalizedQuery ? 'Actions' : 'Quick Actions', items: actionResults },
      { label: 'Recent', items: recentItems },
      { label: 'Documents', items: documentResults },
      { label: 'Projects', items: projectResults },
    ].filter(group => group.items.length > 0);
  }, [actionItems, documents, navigate, projects, query, recentDocuments]);

  const flatItems = groupedItems.flatMap(group => group.items);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  const runItem = (item: PaletteItem) => {
    item.run();
    closePalette();
  };

  return (
    <div className={styles.overlay} onMouseDown={closePalette}>
      <div
        className={styles.panel}
        onMouseDown={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className={styles.searchRow}>
          <i className="ti ti-search" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Escape') closePalette();
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSelectedIndex(index => Math.min(index + 1, Math.max(0, flatItems.length - 1)));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setSelectedIndex(index => Math.max(0, index - 1));
              }
              if (event.key === 'Enter' && flatItems[selectedIndex]) {
                event.preventDefault();
                runItem(flatItems[selectedIndex]);
              }
            }}
            placeholder="Search projects, documents, actions..."
          />
        </div>

        <div className={styles.results}>
          {loading && <div className={styles.empty}>Loading writing workspace...</div>}
          {!loading && flatItems.length === 0 && <div className={styles.empty}>No results.</div>}
          {!loading && groupedItems.map(group => (
            <section key={group.label} className={styles.group}>
              <div className={styles.groupLabel}>{group.label}</div>
              {group.items.map(item => {
                const itemIndex = flatItems.findIndex(flatItem => flatItem.id === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={itemIndex === selectedIndex ? styles.activeItem : styles.item}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    onClick={() => runItem(item)}
                  >
                    <i className={`ti ${item.icon}`} aria-hidden="true" />
                    <span>
                      <strong>{item.label}</strong>
                      {item.detail && <small>{item.detail}</small>}
                    </span>
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
});

export default CommandPalette;
