import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import WritingGoalBar from '../components/editor/WritingGoalBar';
import { formatRelativeDate } from '../utils/date';
import type { WritingDocumentStatus } from '../types/write';
import styles from './WritingLayout.module.css';

export type AutosaveState = 'saved' | 'saving' | 'unsaved';
export type WritingLayoutMode = 'story' | 'note';

interface WritingLayoutProps {
  projectId?: string;
  projectTitle: string;
  documentTitle?: string;
  subtitle?: string | null;
  wordCount?: number;
  documentTarget?: number | null;
  dailyGoal?: number | null;
  todayWords?: number;
  autosaveState?: AutosaveState;
  lastSavedAt?: string | null;
  documentStatus?: WritingDocumentStatus;
  layoutMode?: WritingLayoutMode;
  showStatusBar?: boolean;
  distractionFree?: boolean;
  leftPanel?: ReactNode;
  rightPanel?: ReactNode;
  children: ReactNode;
  onDocumentTitleChange?: (title: string) => void;
  onDocumentTitleBlur?: () => void;
  onDocumentStatusChange?: (status: WritingDocumentStatus) => void;
  onSaveDailyGoal?: (goal: number | null) => void;
  onSaveDocumentTarget?: (target: number | null) => void;
  onOpenVersions?: () => void;
  onOpenPendingItems?: () => void;
  onToggleDistractionFree?: () => void;
  typewriterSoundsEnabled?: boolean;
  onToggleTypewriterSounds?: () => void;
}

const statusLabels: Record<AutosaveState, string> = {
  saved: 'Saved',
  saving: 'Saving...',
  unsaved: 'Unsaved changes',
};

export default function WritingLayout({
  projectId,
  projectTitle,
  documentTitle,
  subtitle = null,
  wordCount = 0,
  documentTarget = null,
  dailyGoal = null,
  todayWords = 0,
  autosaveState = 'saved',
  lastSavedAt = null,
  documentStatus = 'draft',
  layoutMode = 'story',
  showStatusBar = true,
  distractionFree = false,
  leftPanel,
  rightPanel,
  children,
  onDocumentTitleChange,
  onDocumentTitleBlur,
  onDocumentStatusChange,
  onSaveDailyGoal,
  onSaveDocumentTarget,
  onOpenVersions,
  onOpenPendingItems,
  onToggleDistractionFree,
  typewriterSoundsEnabled = false,
  onToggleTypewriterSounds,
}: WritingLayoutProps) {
  const leftPanelStorageKey = `wnh_write_left_panel_${projectId || 'global'}`;
  const rightPanelStorageKey = `wnh_write_right_panel_${projectId || 'global'}`;
  const [leftOpen, setLeftOpen] = useState(() => {
    if (layoutMode === 'note') return false;
    return localStorage.getItem(leftPanelStorageKey) !== 'closed';
  });
  const [rightOpen, setRightOpen] = useState(() => localStorage.getItem(rightPanelStorageKey) === 'open');
  const [hasRightPanelBeenOpened, setHasRightPanelBeenOpened] = useState(() => localStorage.getItem(rightPanelStorageKey) === 'open');
  const [focusUiVisible, setFocusUiVisible] = useState(true);
  const focusHideTimerRef = useRef<number | null>(null);

  const savedLabel = useMemo(() => {
    if (autosaveState !== 'saved' || !lastSavedAt) return statusLabels[autosaveState];
    return `${statusLabels.saved} ${formatRelativeDate(lastSavedAt)}`;
  }, [autosaveState, lastSavedAt]);

  useEffect(() => {
    if (layoutMode !== 'story') return;
    localStorage.setItem(leftPanelStorageKey, leftOpen ? 'open' : 'closed');
  }, [layoutMode, leftOpen, leftPanelStorageKey]);

  useEffect(() => {
    if (layoutMode !== 'story') return;
    localStorage.setItem(rightPanelStorageKey, rightOpen ? 'open' : 'closed');
  }, [layoutMode, rightOpen, rightPanelStorageKey]);

  useEffect(() => {
    if (!distractionFree) return;
    const scheduleHide = () => {
      if (focusHideTimerRef.current) window.clearTimeout(focusHideTimerRef.current);
      setFocusUiVisible(true);
      focusHideTimerRef.current = window.setTimeout(() => setFocusUiVisible(false), 3000);
    };
    const handleMove = () => scheduleHide();
    scheduleHide();
    window.addEventListener('mousemove', handleMove);
    return () => {
      if (focusHideTimerRef.current) window.clearTimeout(focusHideTimerRef.current);
      window.removeEventListener('mousemove', handleMove);
    };
  }, [distractionFree]);

  const showPanels = layoutMode === 'story' && !distractionFree;
  const showTopbar = !distractionFree;
  const showBottomBar = showStatusBar && !distractionFree;
  const layoutClasses = [
    styles.layout,
    layoutMode === 'note' ? styles.noteLayout : styles.storyLayout,
    distractionFree ? styles.distractionFree : '',
    leftOpen && showPanels ? styles.leftIsOpen : '',
    rightOpen && showPanels ? styles.rightIsOpen : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={layoutClasses}>
      {showTopbar && (
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          {layoutMode === 'story' && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setLeftOpen(isOpen => !isOpen)}
              aria-label="Toggle chapter panel"
              title="Toggle chapter panel"
            >
              <i className="ti ti-layout-sidebar-left-collapse" aria-hidden="true" />
            </button>
          )}
          {projectId ? (
            <Link className={styles.projectLink} to={`/write/${projectId}`}>
              {projectTitle}
            </Link>
          ) : (
            <span className={styles.projectLink}>{projectTitle}</span>
          )}
        </div>

        <div className={styles.titleArea}>
          <div className={styles.titleStack}>
            {onDocumentTitleChange ? (
              <input
                className={styles.titleInput}
                value={documentTitle || ''}
                onChange={event => onDocumentTitleChange(event.target.value)}
                onBlur={onDocumentTitleBlur}
                aria-label="Document title"
              />
            ) : (
              <span className={styles.documentTitle}>{documentTitle}</span>
            )}
            {layoutMode === 'note' && subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          </div>
          {layoutMode === 'note' && <span className={styles.saveStatus}>{savedLabel}</span>}
        </div>

        <div className={styles.topbarRight}>
          {layoutMode === 'story' && (
            <label className={styles.statusSelect}>
              <span>Status</span>
              <select
                value={documentStatus}
                onChange={event => onDocumentStatusChange?.(event.target.value as WritingDocumentStatus)}
              >
                <option value="draft">Draft</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </label>
          )}
          {onOpenVersions && (
            <button
              type="button"
              className={styles.textButton}
              onClick={onOpenVersions}
              title="Version history"
            >
              <i className="ti ti-history" aria-hidden="true" />
              <span>Versions</span>
            </button>
          )}
          {layoutMode === 'story' && onOpenPendingItems && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={onOpenPendingItems}
              aria-label="Open pending items"
              title="Open pending items"
            >
              <i className="ti ti-list-check" aria-hidden="true" />
            </button>
          )}
          {layoutMode === 'story' && onToggleDistractionFree && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={onToggleDistractionFree}
              aria-label="Toggle distraction-free mode"
              title="Toggle distraction-free mode"
            >
              <i className="ti ti-arrows-maximize" aria-hidden="true" />
            </button>
          )}
          {layoutMode === 'story' && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => {
                setRightOpen(isOpen => {
                  const nextOpen = !isOpen;
                  if (nextOpen) setHasRightPanelBeenOpened(true);
                  return nextOpen;
                });
              }}
              aria-label="Toggle context panel"
              title="Toggle context panel"
            >
              <i className="ti ti-layout-sidebar-right-collapse" aria-hidden="true" />
            </button>
          )}
        </div>
      </header>
      )}

      <div className={styles.workspace}>
        {showPanels && (
        <aside className={`${styles.sidePanel} ${styles.leftPanel} ${leftOpen ? styles.panelOpen : styles.panelClosed}`}>
          {leftPanel || <PanelPlaceholder title="Chapters coming soon" icon="ti-list-details" />}
        </aside>
        )}

        <main className={styles.centerColumn}>{children}</main>

        {showPanels && (
        <aside className={`${styles.sidePanel} ${styles.rightPanel} ${rightOpen ? styles.panelOpen : styles.panelClosed}`}>
          {hasRightPanelBeenOpened && (rightPanel || <PanelPlaceholder title="Context coming soon" icon="ti-sparkles" />)}
        </aside>
        )}
      </div>

      {showBottomBar && (
        <WritingGoalBar
          wordCount={wordCount}
          saveLabel={savedLabel}
          dailyGoal={dailyGoal}
          todayWords={todayWords}
          documentTarget={documentTarget}
          showDocumentTarget={layoutMode === 'story'}
          onSaveDailyGoal={onSaveDailyGoal || (() => undefined)}
          onSaveDocumentTarget={onSaveDocumentTarget || (() => undefined)}
        />
      )}

      {distractionFree && onToggleDistractionFree && (
        <div className={`${styles.focusHud} ${focusUiVisible ? styles.focusHudVisible : ''}`}>
          <div className={styles.focusWordCount}>{wordCount.toLocaleString()} words</div>
          <div className={styles.focusButtons}>
            {onToggleTypewriterSounds && (
              <button
                type="button"
                onClick={onToggleTypewriterSounds}
                aria-label="Toggle typewriter sounds"
                title="Toggle typewriter sounds"
              >
                <i className={`ti ${typewriterSoundsEnabled ? 'ti-volume' : 'ti-volume-off'}`} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={onToggleDistractionFree}
              aria-label="Exit distraction-free mode"
              title="Exit distraction-free mode"
            >
              <i className="ti ti-arrows-minimize" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelPlaceholder({ title, icon }: { title: string; icon: string }) {
  return (
    <div className={styles.panelPlaceholder}>
      <i className={`ti ${icon}`} aria-hidden="true" />
      <span>{title}</span>
    </div>
  );
}
