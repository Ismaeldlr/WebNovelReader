import apiClient from './client';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export interface LibraryFilters {
  status?: string;
  sourceSite?: string;
  onlyFavorites?: boolean;
  onlyUnread?: boolean;
  search?: string;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface NovelLibraryEntry {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  source_site: string;
  total_chapters: number;
  status: string;
  is_favorite: boolean;
  current_chapter_number: number;
  last_read_at: string | null;
  added_at: string;
  new_chapters_count: number;
}

export interface LibraryResponse {
  novels: NovelLibraryEntry[];
  total: number;
}

export interface LibraryStats {
  totalNovels: number;
  readingCount: number;
  chaptersCached: string;
  lastUpdated: string;
}

export async function fetchLibrary(filters: LibraryFilters): Promise<LibraryResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const res = await apiClient.get<unknown, ApiEnvelope<LibraryResponse>>(`/library?${params.toString()}`);
  return res.data;
}

export async function fetchStats(): Promise<LibraryStats> {
  const res = await apiClient.get<unknown, ApiEnvelope<LibraryStats>>('/library/stats');
  return res.data;
}

export async function fetchNewChaptersCount(): Promise<number> {
  const res = await apiClient.get<unknown, ApiEnvelope<{ count: number }>>('/library/new-chapters-count');
  return res.data.count;
}

export async function toggleFavorite(novelId: string): Promise<boolean> {
  const res = await apiClient.patch<unknown, ApiEnvelope<{ isFavorite: boolean }>>(`/library/${novelId}/favorite`);
  return res.data.isFavorite;
}

export async function updateStatus(novelId: string, status: string): Promise<string> {
  const res = await apiClient.patch<unknown, ApiEnvelope<{ status: string }>>(`/library/${novelId}/status`, { status });
  return res.data.status;
}

export async function deleteNovel(novelId: string): Promise<void> {
  await apiClient.delete(`/library/${novelId}`);
}
