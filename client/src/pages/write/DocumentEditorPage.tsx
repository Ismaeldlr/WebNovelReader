import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createDocumentVersion,
  fetchProjectDocuments,
  getDocument,
  getProject,
  updateDocument,
  updateProject,
} from '../../api/write';
import ChapterSceneManager from '../../components/editor/ChapterSceneManager';
import ContextTab from '../../components/editor/ContextTab';
import PendingItemsPanel from '../../components/editor/PendingItemsPanel';
import RightPanel from '../../components/editor/RightPanel';
import TiptapEditor from '../../components/editor/TiptapEditor';
import VersionHistoryPanel from '../../components/editor/VersionHistoryPanel';
import {
  ensureDailyWordsRecord,
  getTodayWords,
  updateDailyWordsRecord,
} from '../../lib/dailyGoal';
import type { DailyWordsRecord } from '../../lib/dailyGoal';
import { cacheDocument, getCachedDocument } from '../../lib/editorCache';
import { registerEditorShortcuts } from '../../lib/editorShortcuts';
import WritingLayout from '../../layouts/WritingLayout';
import { playCarriageReturn, playKeystroke } from '../../lib/typewriterSound';
import type { AutosaveState, WritingLayoutMode } from '../../layouts/WritingLayout';
import type {
  WritingDocument,
  WritingDocumentMeta,
  WritingDocumentStatus,
  WritingProject,
} from '../../types/write';
import styles from './DocumentEditorPage.module.css';

const EMPTY_TIPTAP_DOC = '{"type":"doc","content":[{"type":"paragraph"}]}';
const SAVE_DEBOUNCE_MS = 2000;
const WORD_COUNT_DEBOUNCE_MS = 500;
const SNAPSHOT_INTERVAL_MS = 30 * 60 * 1000;
const RECENT_DOCUMENTS_KEY = 'wnh_recent_documents';
const TYPEWRITER_SOUNDS_KEY = 'wnh_typewriter_sounds';

interface TiptapNode {
  text?: string;
  content?: TiptapNode[];
}

interface RecentDocument {
  id: string;
  projectId: string;
  title: string;
  projectTitle: string;
  openedAt: string;
}

function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function extractText(node: TiptapNode): string {
  const ownText = node.text || '';
  const childText = node.content?.map(extractText).join(' ') || '';
  return `${ownText} ${childText}`.trim();
}

function countWordsFromContent(content: string) {
  try {
    return countWords(extractText(JSON.parse(content) as TiptapNode));
  } catch {
    return 0;
  }
}

function getDailyGoal(project: WritingProject | null) {
  const value = project?.settings?.dailyWordGoal;
  return typeof value === 'number' && value > 0 ? value : null;
}

function rememberRecentDocument(project: WritingProject, writingDocument: WritingDocument) {
  const raw = localStorage.getItem(RECENT_DOCUMENTS_KEY);
  let current: RecentDocument[] = [];

  try {
    current = raw ? JSON.parse(raw) as RecentDocument[] : [];
  } catch {
    current = [];
  }

  const nextItem: RecentDocument = {
    id: writingDocument.id,
    projectId: project.id,
    title: writingDocument.title,
    projectTitle: project.title,
    openedAt: new Date().toISOString(),
  };
  const nextItems = [
    nextItem,
    ...current.filter(item => item.id !== writingDocument.id),
  ].slice(0, 5);

  localStorage.setItem(RECENT_DOCUMENTS_KEY, JSON.stringify(nextItems));
}

export default function DocumentEditorPage() {
  const { projectId, documentId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<WritingProject | null>(null);
  const [projectDocuments, setProjectDocuments] = useState<WritingDocumentMeta[]>([]);
  const [writingDocument, setWritingDocument] = useState<WritingDocument | null>(null);
  const [editorContent, setEditorContent] = useState(EMPTY_TIPTAP_DOC);
  const [draftTitle, setDraftTitle] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [displayWordCount, setDisplayWordCount] = useState(0);
  const [documentStatus, setDocumentStatus] = useState<WritingDocumentStatus>('draft');
  const [documentTarget, setDocumentTarget] = useState<number | null>(null);
  const [dailyWordsRecord, setDailyWordsRecord] = useState<DailyWordsRecord | null>(null);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [distractionFree, setDistractionFree] = useState(false);
  const [typewriterSoundsEnabled, setTypewriterSoundsEnabled] = useState(
    () => localStorage.getItem(TYPEWRITER_SOUNDS_KEY) === 'true'
  );

  const saveTimerRef = useRef<number | null>(null);
  const wordCountTimerRef = useRef<number | null>(null);
  const contentRef = useRef(EMPTY_TIPTAP_DOC);
  const wordCountRef = useRef(0);
  const savedDocumentWordCountRef = useRef(0);
  const latestProjectWordCountRef = useRef(0);
  const lastSnapshotContentRef = useRef(EMPTY_TIPTAP_DOC);

  const layoutMode: WritingLayoutMode = writingDocument?.doc_type === 'note' ? 'note' : 'story';
  const dailyGoal = useMemo(() => getDailyGoal(project), [project]);
  const todayWords = getTodayWords(dailyWordsRecord);

  const updateCurrentDocumentMeta = useCallback((changes: Partial<WritingDocumentMeta>) => {
    if (!documentId) return;
    setProjectDocuments(documents => documents.map(document => (
      document.id === documentId ? { ...document, ...changes } : document
    )));
  }, [documentId]);

  const updateProjectWordProgress = useCallback((nextDocumentWordCount: number) => {
    if (!projectId) return;

    const previousDocumentWordCount = savedDocumentWordCountRef.current;
    savedDocumentWordCountRef.current = nextDocumentWordCount;

    setProject(currentProject => {
      if (!currentProject) return currentProject;

      const nextProjectWordCount = Math.max(
        0,
        currentProject.word_count - previousDocumentWordCount + nextDocumentWordCount
      );
      latestProjectWordCountRef.current = nextProjectWordCount;
      const nextRecord = updateDailyWordsRecord(projectId, nextProjectWordCount);
      setDailyWordsRecord(nextRecord);

      return {
        ...currentProject,
        word_count: nextProjectWordCount,
        total_word_count: nextProjectWordCount,
      };
    });
  }, [projectId]);

  const performSave = useCallback((content: string, nextWordCount: number) => {
    if (!documentId) return;

    setAutosaveState('saving');
    updateDocument(documentId, {
      content,
      word_count: nextWordCount,
    })
      .then(async savedDocument => {
        await cacheDocument(documentId, content, savedDocument.updated_at);
        setWritingDocument(savedDocument);
        setDocumentStatus(savedDocument.status);
        setDocumentTarget(savedDocument.word_count_target);
        setLastSavedAt(savedDocument.updated_at);
        setAutosaveState('saved');
        updateCurrentDocumentMeta({
          title: savedDocument.title,
          status: savedDocument.status,
          word_count: savedDocument.word_count,
          word_count_target: savedDocument.word_count_target,
          updated_at: savedDocument.updated_at,
        });
        updateProjectWordProgress(savedDocument.word_count);
      })
      .catch((err: Error) => {
        setAutosaveState('unsaved');
        setError(err.message || 'Failed to save document');
      });
  }, [documentId, updateCurrentDocumentMeta, updateProjectWordProgress]);

  const scheduleSave = useCallback((content: string, nextWordCount: number) => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    setAutosaveState('unsaved');
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      performSave(content, nextWordCount);
    }, SAVE_DEBOUNCE_MS);
  }, [performSave]);

  const forceSave = useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    performSave(contentRef.current, wordCountRef.current);
  }, [performSave]);

  const loadDocument = useCallback(async () => {
    if (!projectId || !documentId) return;

    setLoading(true);
    setError(null);
    try {
      const [nextProjectRaw, serverDocument, nextDocuments] = await Promise.all([
        getProject(projectId),
        getDocument(documentId),
        fetchProjectDocuments(projectId),
      ]);

      let nextProject = nextProjectRaw;
      let nextDocument = serverDocument;
      let nextContent = serverDocument.content || EMPTY_TIPTAP_DOC;
      let nextWordCount = serverDocument.word_count || countWordsFromContent(nextContent);
      const cached = await getCachedDocument(documentId);

      if (cached) {
        const cachedTime = new Date(cached.updatedAt).getTime();
        const serverTime = new Date(serverDocument.updated_at).getTime();

        if (cachedTime > serverTime) {
          nextContent = cached.content;
          nextWordCount = countWordsFromContent(nextContent);
          nextDocument = await updateDocument(documentId, {
            content: nextContent,
            word_count: nextWordCount,
          });
          await cacheDocument(documentId, nextContent, nextDocument.updated_at);
          nextProject = {
            ...nextProjectRaw,
            word_count: Math.max(0, nextProjectRaw.word_count - serverDocument.word_count + nextDocument.word_count),
            total_word_count: Math.max(0, nextProjectRaw.word_count - serverDocument.word_count + nextDocument.word_count),
          };
          setNotice('Recovered a newer local draft and saved it.');
        } else if (serverTime > cachedTime) {
          await cacheDocument(documentId, nextContent, serverDocument.updated_at);
          setNotice('Server copy was newer; local cache was updated.');
        }
      } else {
        await cacheDocument(documentId, nextContent, serverDocument.updated_at);
      }

      const patchedDocuments = nextDocuments.map(document => (
        document.id === nextDocument.id
          ? {
            ...document,
            title: nextDocument.title,
            status: nextDocument.status,
            word_count: nextDocument.word_count,
            word_count_target: nextDocument.word_count_target,
            updated_at: nextDocument.updated_at,
          }
          : document
      ));
      const record = ensureDailyWordsRecord(projectId, nextProject.word_count);

      setProject(nextProject);
      setProjectDocuments(patchedDocuments);
      setWritingDocument(nextDocument);
      setEditorContent(nextContent);
      setDraftTitle(nextDocument.title);
      setDocumentStatus(nextDocument.status);
      setDocumentTarget(nextDocument.word_count_target);
      setWordCount(nextWordCount);
      setDisplayWordCount(nextWordCount);
      setDailyWordsRecord(record);
      setLastSavedAt(nextDocument.updated_at);
      contentRef.current = nextContent;
      wordCountRef.current = nextWordCount;
      savedDocumentWordCountRef.current = nextDocument.word_count;
      latestProjectWordCountRef.current = nextProject.word_count;
      lastSnapshotContentRef.current = nextContent;
      setAutosaveState('saved');
      rememberRecentDocument(nextProject, nextDocument);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [projectId, documentId]);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (wordCountTimerRef.current) window.clearTimeout(wordCountTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!documentId) return;

    const intervalId = window.setInterval(() => {
      if (window.document.visibilityState !== 'visible') return;
      const currentContent = contentRef.current;
      if (currentContent === lastSnapshotContentRef.current) return;

      void createDocumentVersion(documentId, {
        content: currentContent,
        word_count: wordCountRef.current,
      }).then(() => {
        lastSnapshotContentRef.current = currentContent;
      });
    }, SNAPSHOT_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [documentId]);

  const navigateRelativeDocument = useCallback((direction: -1 | 1) => {
    if (!projectId || !documentId || projectDocuments.length === 0) return;
    const sortedDocuments = [...projectDocuments].sort((a, b) => a.order_index - b.order_index);
    const currentIndex = sortedDocuments.findIndex(document => document.id === documentId);
    const nextDocument = sortedDocuments[currentIndex + direction];
    if (nextDocument) {
      navigate(`/write/${projectId}/documents/${nextDocument.id}`);
    }
  }, [documentId, navigate, projectDocuments, projectId]);

  const toggleDistractionFree = useCallback(() => {
    if (layoutMode === 'story') {
      setDistractionFree(isFree => !isFree);
    }
  }, [layoutMode]);

  const openVersionHistory = useCallback(() => {
    setVersionsOpen(true);
  }, []);

  const openPendingItems = useCallback(() => {
    setPendingOpen(true);
  }, []);

  const toggleTypewriterSounds = useCallback(() => {
    setTypewriterSoundsEnabled(enabled => {
      const next = !enabled;
      localStorage.setItem(TYPEWRITER_SOUNDS_KEY, String(next));
      return next;
    });
  }, []);

  useEffect(() => registerEditorShortcuts({
    forceSave,
    toggleDistractionFree,
    openVersionHistory,
    openPendingItems,
    toggleTypewriterSounds,
    previousDocument: () => navigateRelativeDocument(-1),
    nextDocument: () => navigateRelativeDocument(1),
  }), [
    forceSave,
    navigateRelativeDocument,
    openPendingItems,
    openVersionHistory,
    toggleTypewriterSounds,
    toggleDistractionFree,
  ]);

  useEffect(() => {
    if (!distractionFree || !typewriterSoundsEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Enter') {
        playCarriageReturn();
        return;
      }
      if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
        playKeystroke();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [distractionFree, typewriterSoundsEnabled]);

  const handleEditorChange = useCallback((content: string, plainText: string) => {
    if (!documentId) return;

    const nextWordCount = countWords(plainText);
    contentRef.current = content;
    wordCountRef.current = nextWordCount;
    setEditorContent(content);
    setWordCount(nextWordCount);
    if (wordCountTimerRef.current) {
      window.clearTimeout(wordCountTimerRef.current);
    }
    wordCountTimerRef.current = window.setTimeout(() => {
      setDisplayWordCount(nextWordCount);
    }, WORD_COUNT_DEBOUNCE_MS);
    void cacheDocument(documentId, content);
    scheduleSave(content, nextWordCount);
  }, [documentId, scheduleSave]);

  const handleTitleBlur = useCallback(async () => {
    if (!documentId || !writingDocument) return;

    const nextTitle = draftTitle.trim() || 'Untitled document';
    setDraftTitle(nextTitle);
    if (nextTitle === writingDocument.title) return;

    try {
      const savedDocument = await updateDocument(documentId, { title: nextTitle });
      setWritingDocument(savedDocument);
      updateCurrentDocumentMeta({ title: savedDocument.title, updated_at: savedDocument.updated_at });
    } catch (err) {
      setDraftTitle(writingDocument.title);
      setError(err instanceof Error ? err.message : 'Failed to rename document');
    }
  }, [documentId, draftTitle, updateCurrentDocumentMeta, writingDocument]);

  const handleStatusChange = useCallback(async (nextStatus: WritingDocumentStatus) => {
    if (!documentId || !writingDocument) return;

    setDocumentStatus(nextStatus);
    try {
      const savedDocument = await updateDocument(documentId, { status: nextStatus });
      setWritingDocument(savedDocument);
      updateCurrentDocumentMeta({ status: savedDocument.status, updated_at: savedDocument.updated_at });
    } catch (err) {
      setDocumentStatus(writingDocument.status);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }, [documentId, updateCurrentDocumentMeta, writingDocument]);

  const handleSaveDailyGoal = useCallback((goal: number | null) => {
    if (!projectId || !project) return;
    const nextSettings = { ...project.settings, dailyWordGoal: goal };
    updateProject(projectId, { settings: nextSettings })
      .then(setProject)
      .catch((err: Error) => setError(err.message || 'Failed to update daily goal'));
  }, [project, projectId]);

  const handleSaveDocumentTarget = useCallback((target: number | null) => {
    if (!documentId) return;
    updateDocument(documentId, { word_count_target: target })
      .then(savedDocument => {
        setWritingDocument(savedDocument);
        setDocumentTarget(savedDocument.word_count_target);
        updateCurrentDocumentMeta({
          word_count_target: savedDocument.word_count_target,
          updated_at: savedDocument.updated_at,
        });
      })
      .catch((err: Error) => setError(err.message || 'Failed to update document target'));
  }, [documentId, updateCurrentDocumentMeta]);

  const handleRestore = useCallback(async (content: string, restoredWordCount: number) => {
    if (!documentId) return;

    contentRef.current = content;
    wordCountRef.current = restoredWordCount;
    setEditorContent(content);
    setWordCount(restoredWordCount);
    setDisplayWordCount(restoredWordCount);
    setAutosaveState('saving');
    await cacheDocument(documentId, content);
    const savedDocument = await updateDocument(documentId, {
      content,
      word_count: restoredWordCount,
    });
    await cacheDocument(documentId, content, savedDocument.updated_at);
    setWritingDocument(savedDocument);
    setDocumentStatus(savedDocument.status);
    setDocumentTarget(savedDocument.word_count_target);
    setLastSavedAt(savedDocument.updated_at);
    setAutosaveState('saved');
    updateCurrentDocumentMeta({
      status: savedDocument.status,
      word_count: savedDocument.word_count,
      word_count_target: savedDocument.word_count_target,
      updated_at: savedDocument.updated_at,
    });
    updateProjectWordProgress(savedDocument.word_count);
    lastSnapshotContentRef.current = content;
  }, [documentId, updateCurrentDocumentMeta, updateProjectWordProgress]);

  if (!projectId || !documentId) {
    return <div className={styles.centerState}>Document not found.</div>;
  }

  if (loading) {
    return <div className={styles.centerState}>Loading editor...</div>;
  }

  if (!writingDocument || !project) {
    return (
      <div className={styles.centerState}>
        <p>{error || 'Document not found.'}</p>
        <Link to="/write">Back to projects</Link>
      </div>
    );
  }

  return (
    <WritingLayout
      projectId={projectId}
      projectTitle={project.title}
      documentTitle={draftTitle}
      subtitle={writingDocument.summary}
      wordCount={displayWordCount}
      documentTarget={documentTarget}
      dailyGoal={dailyGoal}
      todayWords={todayWords}
      autosaveState={autosaveState}
      lastSavedAt={lastSavedAt}
      documentStatus={documentStatus}
      layoutMode={layoutMode}
      distractionFree={distractionFree}
      leftPanel={
        <ChapterSceneManager
          projectId={projectId}
          currentDocumentId={documentId}
          documents={projectDocuments}
          onDocumentsChange={setProjectDocuments}
          onNavigate={(nextDocumentId) => navigate(`/write/${projectId}/documents/${nextDocumentId}`)}
        />
      }
      rightPanel={
        <RightPanel
          storageKey={`wnh_right_panel_tab_${projectId}`}
          tabs={[
            {
              id: 'context',
              label: 'Context',
              icon: 'ti-notes',
              content: <ContextTab projectId={projectId} />,
            },
            {
              id: 'characters',
              label: 'Characters',
              icon: 'ti-users',
              content: <div className={styles.panelPlaceholder}>Characters coming soon.</div>,
            },
            {
              id: 'world',
              label: 'World',
              icon: 'ti-world',
              content: <div className={styles.panelPlaceholder}>World details coming soon.</div>,
            },
          ]}
        />
      }
      onDocumentTitleChange={setDraftTitle}
      onDocumentTitleBlur={handleTitleBlur}
      onDocumentStatusChange={(nextStatus) => {
        void handleStatusChange(nextStatus);
      }}
      onSaveDailyGoal={handleSaveDailyGoal}
      onSaveDocumentTarget={handleSaveDocumentTarget}
      onOpenVersions={() => setVersionsOpen(true)}
      onOpenPendingItems={() => setPendingOpen(true)}
      onToggleDistractionFree={toggleDistractionFree}
      typewriterSoundsEnabled={typewriterSoundsEnabled}
      onToggleTypewriterSounds={toggleTypewriterSounds}
    >
      {notice && (
        <div className={styles.notice}>
          <i className="ti ti-info-circle" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}
      {error && <div className={styles.error}>{error}</div>}
      <TiptapEditor
        initialContent={editorContent}
        mode={layoutMode}
        onChange={handleEditorChange}
        onStoryComment={() => setNotice('Comments are coming in a future update.')}
      />
      {versionsOpen && (
        <VersionHistoryPanel
          documentId={documentId}
          currentContent={editorContent}
          currentWordCount={wordCount}
          onClose={() => setVersionsOpen(false)}
          onRestore={handleRestore}
        />
      )}
      {pendingOpen && (
        <PendingItemsPanel
          projectId={projectId}
          onClose={() => setPendingOpen(false)}
        />
      )}
    </WritingLayout>
  );
}
