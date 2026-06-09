import apiClient from './client';
import type { LibraryEntry } from '../types/novel';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export type ContentWidth = 'narrow' | 'medium' | 'wide';
export type ReaderFontFamily = 'serif' | 'sans';

export interface ReaderPreferences {
  theme: 'light' | 'dark' | 'sepia';
  font_size: number;
  line_spacing: number;
  content_width: ContentWidth;
  prefetch_count: number;
  update_interval_hours: number;
}

export interface ReaderDisplayPreferences extends ReaderPreferences {
  font_family: ReaderFontFamily;
}

export interface ReaderChapter {
  novel_id: string;
  novel_title: string;
  chapter_id: string;
  chapter_number: number;
  chapter_title: string;
  content: string;
  word_count: number | null;
  previous_chapter_number: number | null;
  next_chapter_number: number | null;
  reader_preferences: ReaderPreferences;
  library_entry: LibraryEntry | null;
}

export async function getReaderChapter(
  novelId: string,
  chapterNumber: number
): Promise<ReaderChapter> {
  const res = await apiClient.get<unknown, ApiEnvelope<ReaderChapter>>(
    `/reader/${novelId}/chapters/${chapterNumber}`
  );

  return res.data;
}

export async function markReaderChapterRead(
  novelId: string,
  chapterNumber: number
): Promise<void> {
  await apiClient.post(`/reader/${novelId}/chapters/${chapterNumber}/read`);
}

export async function updateReaderPreferences(
  changes: Partial<Pick<ReaderPreferences, 'font_size' | 'line_spacing' | 'content_width'>>
): Promise<ReaderPreferences> {
  const res = await apiClient.patch<unknown, ApiEnvelope<ReaderPreferences>>(
    '/user/preferences',
    changes
  );

  return res.data;
}
