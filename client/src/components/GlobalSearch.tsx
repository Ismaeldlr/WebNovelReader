import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchNovels, type SearchNovelResult } from '../api/search';
import { toApiAssetUrl } from '../utils/assets';
import styles from './GlobalSearch.module.css';

const sourceLabels: Record<string, string> = {
  ranobes: 'Ranobes',
  wtr_lab: 'WTR Lab',
  royal_road: 'Royal Road',
  epub: 'EPUB',
};

export default function GlobalSearch() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);
  const isFocusedRef = useRef(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchNovelResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const trimmedQuery = query.trim();
  const hasResults = results.length > 0;

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    let ignore = false;
    setIsOpen(false);
    setSelectedIndex(-1);

    const timeoutId = window.setTimeout(() => {
      searchNovels(trimmedQuery)
        .then((nextResults) => {
          if (ignore) return;
          const limitedResults = nextResults.slice(0, 5);
          setResults(limitedResults);
          setSelectedIndex(-1);
          setIsOpen(isFocusedRef.current && limitedResults.length > 0);
        })
        .catch(() => {
          if (ignore) return;
          setResults([]);
          setIsOpen(false);
          setSelectedIndex(-1);
        });
    }, 300);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [trimmedQuery]);

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const resetSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const goToExplore = () => {
    if (!trimmedQuery) return;
    navigate(`/explore?search=${encodeURIComponent(trimmedQuery)}`);
    resetSearch();
  };

  const goToNovel = (novelId: string) => {
    navigate(`/novels/${novelId}`);
    resetSearch();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!hasResults) return;
      setIsOpen(true);
      setSelectedIndex((index) => (index + 1) % results.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!hasResults) return;
      setIsOpen(true);
      setSelectedIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        goToNovel(results[selectedIndex].id);
        return;
      }

      goToExplore();
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    if (hasResults) setIsOpen(true);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);
    }, 150);
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <div className={styles.inputWrap}>
        <i className={`ti ti-search ${styles.leadingIcon}`} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search titles, authors..."
          aria-label="Search novels"
          aria-expanded={isOpen}
        />
        <button
          className={styles.searchButton}
          type="button"
          onClick={goToExplore}
          aria-label="Search all novels"
        >
          <i className="ti ti-search" aria-hidden="true" />
        </button>
      </div>

      {isOpen && hasResults && (
        <div className={styles.dropdown}>
          {results.map((result, index) => {
            const coverSrc = toApiAssetUrl(result.cover_url);
            const sourceLabel = sourceLabels[result.source_site] || result.source_site;
            const isSelected = selectedIndex === index;

            return (
              <button
                key={result.id}
                className={`${styles.resultRow} ${isSelected ? styles.selected : ''}`}
                type="button"
                onMouseEnter={() => setSelectedIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => goToNovel(result.id)}
              >
                <span className={styles.thumb}>
                  {coverSrc ? (
                    <img src={coverSrc} alt="" />
                  ) : (
                    <span>{result.title.charAt(0).toUpperCase()}</span>
                  )}
                </span>

                <span className={styles.resultText}>
                  <span className={styles.resultTitle}>{result.title}</span>
                  <span className={styles.resultMeta}>
                    <span>{result.author || 'Unknown author'}</span>
                    <span className={styles.source}>{sourceLabel}</span>
                  </span>
                </span>

                {result.in_library && (
                  <i className={`ti ti-bookmark-filled ${styles.savedIcon}`} aria-label="In library" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
