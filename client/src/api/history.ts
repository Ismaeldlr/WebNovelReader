import apiClient from './client';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export interface HistoryEntry {
  id: string;
  read_at: string;
  novel_id: string;
  novel_title: string;
  novel_author: string | null;
  cover_url: string | null;
  source_site: string;
  chapter_id: string;
  chapter_number: number;
  chapter_title: string;
}

export interface HistoryStats {
  total_chapters_read: number;
  distinct_novels_read: number;
  distinct_authors_read: number;
}

export interface HistoryNovel {
  id: string;
  title: string;
}

export interface HistoryNovelEntry {
  novel_id: string;
  novel_title: string;
  novel_author: string | null;
  cover_url: string | null;
  source_site: string;
  total_chapters: number;
  reads_count: number;
  last_read_at: string;
  latest_chapter_number: number;
  latest_chapter_title: string;
  continue_chapter_number: number;
}

export interface HistoryParams {
  page?: number;
  limit?: number;
  novelId?: string;
  from?: string;
}

export interface HistoryResponse {
  entries: HistoryEntry[];
  total: number;
  page: number;
  limit: number;
}

export async function getHistory(params: HistoryParams = {}): Promise<HistoryResponse> {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.set(key, String(value));
    }
  });

  const query = queryParams.toString();
  const res = await apiClient.get<unknown, ApiEnvelope<HistoryResponse>>(
    `/history${query ? `?${query}` : ''}`
  );

  return res.data;
}

export async function getHistoryStats(): Promise<HistoryStats> {
  const res = await apiClient.get<unknown, ApiEnvelope<HistoryStats>>('/history/stats');
  return res.data;
}

export async function getHistoryNovels(): Promise<HistoryNovel[]> {
  const res = await apiClient.get<unknown, ApiEnvelope<{ novels: HistoryNovel[] }>>('/history/novels');
  return res.data.novels;
}

export async function getNovelHistory(params: Pick<HistoryParams, 'novelId' | 'from'> = {}): Promise<HistoryNovelEntry[]> {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.set(key, String(value));
    }
  });

  const query = queryParams.toString();
  const res = await apiClient.get<unknown, ApiEnvelope<{ novels: HistoryNovelEntry[] }>>(
    `/history/by-novel${query ? `?${query}` : ''}`
  );

  return res.data.novels;
}
