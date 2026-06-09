import apiClient from './client';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export interface ExploreNovel {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  cover_url: string | null;
  cover_url_orig: string | null;
  source_site: string;
  source_url: string;
  tags: string[];
  total_chapters: number;
  ingested_at: string;
  in_library: boolean;
}

export async function fetchExploreNovels(search = ''): Promise<ExploreNovel[]> {
  const params = new URLSearchParams();
  if (search.trim()) {
    params.set('search', search.trim());
  }

  const query = params.toString();
  const res = await apiClient.get<unknown, ApiEnvelope<{ novels: ExploreNovel[] }>>(
    `/explore${query ? `?${query}` : ''}`
  );

  return res.data.novels;
}
