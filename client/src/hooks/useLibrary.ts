import { useEffect, useState, useCallback } from 'react';
import { fetchLibrary, fetchStats, fetchNewChaptersCount } from '../api/library';
import type { LibraryFilters, NovelLibraryEntry, LibraryStats } from '../api/library';

export function useLibrary(initialFilters: LibraryFilters) {
  const [novels, setNovels] = useState<NovelLibraryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LibraryFilters>(initialFilters);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLibrary(filters);
      setNovels((currentNovels) => {
        if ((filters.offset || 0) === 0) {
          return data.novels;
        }

        const existingIds = new Set(currentNovels.map((novel) => novel.id));
        return [
          ...currentNovels,
          ...data.novels.filter((novel) => !existingIds.has(novel.id)),
        ];
      });
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load library');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  return { novels, total, loading, error, filters, setFilters, refetch: loadLibrary };
}

export function useLibraryStats() {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { stats, loading, error };
}

export function useNewChaptersCount() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchNewChaptersCount();
        setCount(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { count, loading };
}
