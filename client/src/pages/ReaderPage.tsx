import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { updateStatus } from '../api/library';
import {
  getReaderChapter,
  markReaderChapterRead,
  updateReaderPreferences,
  type ReaderChapter,
  type ReaderDisplayPreferences,
  type ReaderFontFamily,
} from '../api/reader';
import ChapterContent from '../components/reader/ChapterContent';
import ChapterNav from '../components/reader/ChapterNav';
import OptionsPanel from '../components/reader/OptionsPanel';
import StatusPanel from '../components/reader/StatusPanel';
import type { LibraryEntry, LibraryStatus } from '../types/novel';
import styles from './ReaderPage.module.css';

const READER_FONT_KEY = 'reader_font';

const DEFAULT_PREFERENCES: ReaderDisplayPreferences = {
  theme: 'dark',
  font_size: 18,
  line_spacing: 1.8,
  content_width: 'medium',
  prefetch_count: 3,
  update_interval_hours: 6,
  font_family: 'serif',
};

const WIDTH_CLASS = {
  narrow: styles.narrow,
  medium: styles.medium,
  wide: styles.wide,
};

function getStoredFontFamily(): ReaderFontFamily {
  try {
    const stored = window.localStorage.getItem(READER_FONT_KEY);
    return stored === 'sans' ? 'sans' : 'serif';
  } catch {
    return 'serif';
  }
}

function savedPreferenceKey(preferences: ReaderDisplayPreferences) {
  return JSON.stringify({
    font_size: preferences.font_size,
    line_spacing: preferences.line_spacing,
    content_width: preferences.content_width,
  });
}

export default function ReaderPage() {
  const { novelId, chapterNumber } = useParams();
  const parsedChapterNumber = useMemo(() => parseInt(chapterNumber || '', 10), [chapterNumber]);
  const hasValidParams = Boolean(novelId) && Number.isInteger(parsedChapterNumber) && parsedChapterNumber > 0;
  const [chapter, setChapter] = useState<ReaderChapter | null>(null);
  const [preferences, setPreferences] = useState<ReaderDisplayPreferences>(() => ({
    ...DEFAULT_PREFERENCES,
    font_family: getStoredFontFamily(),
  }));
  const [libraryEntry, setLibraryEntry] = useState<LibraryEntry | null>(null);
  const [openPanel, setOpenPanel] = useState<'options' | 'status' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trackedReadsRef = useRef<Set<string>>(new Set());
  const topControlsRef = useRef<HTMLDivElement | null>(null);
  const lastSavedPreferencesRef = useRef(savedPreferenceKey(preferences));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [chapterNumber]);

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (!openPanel) return;
      if (!topControlsRef.current?.contains(event.target as Node)) {
        setOpenPanel(null);
      }
    }

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [openPanel]);

  useEffect(() => {
    if (!chapter) return;

    const nextKey = savedPreferenceKey(preferences);
    if (nextKey === lastSavedPreferencesRef.current) return;

    const timeoutId = window.setTimeout(async () => {
      try {
        const saved = await updateReaderPreferences({
          font_size: preferences.font_size,
          line_spacing: preferences.line_spacing,
          content_width: preferences.content_width,
        });

        setPreferences((current) => ({
          ...current,
          ...saved,
        }));
        lastSavedPreferencesRef.current = savedPreferenceKey({
          ...preferences,
          ...saved,
        });
      } catch {
        // The live preview remains usable even if the background preference save fails.
      }
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [chapter, preferences]);

  useEffect(() => {
    if (!hasValidParams || !novelId) return;

    const readKey = `${novelId}:${parsedChapterNumber}`;
    if (trackedReadsRef.current.has(readKey)) return;

    trackedReadsRef.current.add(readKey);
    void markReaderChapterRead(novelId, parsedChapterNumber).catch(() => undefined);
  }, [hasValidParams, novelId, parsedChapterNumber]);

  useEffect(() => {
    let isMounted = true;

    async function loadChapter() {
      if (!hasValidParams || !novelId) {
        setLoading(false);
        setChapter(null);
        setError('Chapter not found');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getReaderChapter(novelId, parsedChapterNumber);
        if (isMounted) {
          setChapter(data);
          setLibraryEntry(data.library_entry);
          setPreferences((current) => {
            const next = {
              ...current,
              ...data.reader_preferences,
            };
            lastSavedPreferencesRef.current = savedPreferenceKey(next);
            return next;
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setChapter(null);
          setError(err.message || 'Failed to load chapter.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadChapter();

    return () => {
      isMounted = false;
    };
  }, [hasValidParams, novelId, parsedChapterNumber]);

  function handlePreferenceChange(changes: Partial<ReaderDisplayPreferences>) {
    setPreferences((current) => {
      const next = { ...current, ...changes };

      if (changes.font_family) {
        try {
          window.localStorage.setItem(READER_FONT_KEY, changes.font_family);
        } catch {
          // Ignore unavailable storage; the current session still updates immediately.
        }
      }

      return next;
    });
  }

  async function handleStatusChange(status: LibraryStatus) {
    if (!chapter) return;

    setOpenPanel(null);
    try {
      const updatedEntry = await updateStatus(chapter.novel_id, status);
      setLibraryEntry(updatedEntry);
    } catch {
      // Keep the reader focused; library failures can be retried by choosing again.
    }
  }

  const widthClass = WIDTH_CLASS[preferences.content_width] || styles.medium;

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={`${styles.reader} ${styles.medium}`}>
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading chapter...</span>
          </div>
        </div>
      </main>
    );
  }

  if (!chapter) {
    const isUnavailable = error === 'Chapter content is not available yet.';

    return (
      <main className={styles.page}>
        <div className={`${styles.reader} ${styles.medium}`}>
          <div className={styles.centerState}>
            <i className={isUnavailable ? 'ti ti-cloud-off' : 'ti ti-book-off'} aria-hidden="true" />
            <h1>{isUnavailable ? 'This chapter is not downloaded yet.' : 'Chapter not found.'}</h1>
            <p>
              {isUnavailable
                ? 'The chapter exists, but its content is not available in your local library.'
                : 'The chapter may have been removed or the chapter number is invalid.'}
            </p>
            {novelId && <Link to={`/novels/${novelId}`}>Back to chapters</Link>}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={`${styles.reader} ${widthClass}`}>
        <div className={styles.topArea}>
          <div className={styles.topControls} ref={topControlsRef}>
            <div className={styles.controlSlot}>
              <button
                className={`${styles.utilityButton} ${openPanel === 'options' ? styles.utilityActive : ''}`}
                type="button"
                onClick={() => setOpenPanel((current) => current === 'options' ? null : 'options')}
                aria-expanded={openPanel === 'options'}
              >
                <i className="ti ti-adjustments-horizontal" aria-hidden="true" />
                OPTIONS
              </button>
              {openPanel === 'options' && (
                <OptionsPanel preferences={preferences} onChange={handlePreferenceChange} />
              )}
            </div>

            <div className={styles.controlSlot}>
              <button
                className={`${styles.utilityButton} ${openPanel === 'status' ? styles.utilityActive : ''}`}
                type="button"
                onClick={() => setOpenPanel((current) => current === 'status' ? null : 'status')}
                aria-expanded={openPanel === 'status'}
              >
                <i className="ti ti-list-check" aria-hidden="true" />
                STATUS
              </button>
              {openPanel === 'status' && (
                <StatusPanel
                  currentStatus={libraryEntry?.status || null}
                  onStatusChange={handleStatusChange}
                />
              )}
            </div>
          </div>

          <ChapterNav
            novelId={chapter.novel_id}
            prevChapter={chapter.previous_chapter_number}
            nextChapter={chapter.next_chapter_number}
          />
        </div>

        <header className={styles.header}>
          <Link className={styles.novelLink} to={`/novels/${chapter.novel_id}`}>
            {chapter.novel_title}
          </Link>
          <h1>{chapter.chapter_title}</h1>
          <span>Chapter {chapter.chapter_number}</span>
        </header>

        <ChapterContent
          content={chapter.content}
          preferences={preferences}
        />

        <ChapterNav
          novelId={chapter.novel_id}
          prevChapter={chapter.previous_chapter_number}
          nextChapter={chapter.next_chapter_number}
        />
      </div>
    </main>
  );
}
