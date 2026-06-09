import { useCallback, useEffect, useState } from 'react';
import { addNovelToLibrary, toggleFavorite, updateStatus } from '../api/library';
import { getNovelDetail } from '../api/novels';
import type { LibraryStatus, NovelDetail } from '../types/novel';

export function useNovelDetail(id: string | undefined) {
  const [novel, setNovel] = useState<NovelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearMutationErrorSoon = useCallback(() => {
    window.setTimeout(() => setMutationError(null), 4000);
  }, []);

  const loadNovel = useCallback(async () => {
    if (!id) {
      setNovel(null);
      setLoading(false);
      setError('Novel not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const detail = await getNovelDetail(id);
      setNovel(detail);
    } catch (err: any) {
      setNovel(null);
      setError(err.message || 'Failed to load novel details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadNovel();
  }, [loadNovel]);

  const applyWithRollback = useCallback(async (
    update: (current: NovelDetail) => NovelDetail,
    request: () => Promise<void>
  ) => {
    if (!novel) return;

    const snapshot = novel;
    setNovel(update(snapshot));
    setMutationError(null);

    try {
      await request();
    } catch (err: any) {
      setNovel(snapshot);
      setMutationError(err.message || 'Unable to update novel.');
      clearMutationErrorSoon();
    }
  }, [clearMutationErrorSoon, novel]);

  const handleAddToLibrary = useCallback(async () => {
    if (!novel || novel.library_entry) return;

    const snapshot = novel;
    const optimisticEntry = {
      id: 'optimistic',
      status: 'following' as LibraryStatus,
      is_favorite: false,
      current_chapter_number: 0,
      added_at: new Date().toISOString(),
      last_read_at: null,
    };

    setNovel({ ...snapshot, library_entry: optimisticEntry });
    setMutationError(null);

    try {
      const entry = await addNovelToLibrary(novel.id);
      setNovel((current) => current ? { ...current, library_entry: entry } : current);
    } catch (err: any) {
      setNovel(snapshot);
      setMutationError(err.message || 'Unable to add novel to library.');
      clearMutationErrorSoon();
    }
  }, [clearMutationErrorSoon, novel]);

  const handleStatusChange = useCallback(async (status: LibraryStatus) => {
    await applyWithRollback(
      (current) => current.library_entry
        ? { ...current, library_entry: { ...current.library_entry, status } }
        : current,
      () => novel?.library_entry ? updateStatus(novel.id, status).then(() => undefined) : Promise.resolve()
    );
  }, [applyWithRollback, novel]);

  const handleFavoriteToggle = useCallback(async () => {
    await applyWithRollback(
      (current) => current.library_entry
        ? {
            ...current,
            library_entry: {
              ...current.library_entry,
              is_favorite: !current.library_entry.is_favorite,
            },
          }
        : current,
      () => novel?.library_entry ? toggleFavorite(novel.id).then(() => undefined) : Promise.resolve()
    );
  }, [applyWithRollback, novel]);

  return {
    novel,
    loading,
    error,
    mutationError,
    retry: loadNovel,
    handleAddToLibrary,
    handleStatusChange,
    handleFavoriteToggle,
  };
}
