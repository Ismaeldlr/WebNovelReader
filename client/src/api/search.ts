import apiClient from './client';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export interface SearchNovelResult {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  source_site: string;
  total_chapters: number;
  in_library: boolean;
}

export async function searchNovels(query: string): Promise<SearchNovelResult[]> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  const params = new URLSearchParams({
    q: trimmedQuery,
    limit: '5',
  });

  const res = await apiClient.get<unknown, ApiEnvelope<{ results: SearchNovelResult[] }>>(
    `/search?${params.toString()}`
  );

  return res.data.results.slice(0, 5);
}
