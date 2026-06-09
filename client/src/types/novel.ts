export type SourceSite = 'ranobes' | 'wtr_lab' | 'royal_road' | 'epub';

export type LibraryStatus = 'reading' | 'following' | 'on_hold' | 'dropped' | 'completed';

export interface NovelDetail {
  id: string;
  source_site: SourceSite;
  source_url: string;
  title: string;
  author: string | null;
  description: string | null;
  cover_url: string | null;
  tags: string[];
  total_chapters: number;
  is_update_failed: boolean;
  ingested_at: string;
  last_scraped_at: string | null;
  library_entry: LibraryEntry | null;
  new_chapters_count: number;
}

export interface LibraryEntry {
  id: string;
  status: LibraryStatus;
  is_favorite: boolean;
  current_chapter_number: number;
  added_at: string;
  last_read_at: string | null;
}

export interface ChapterItem {
  id: string;
  chapter_number: number;
  title: string;
  source_url: string;
  is_fetched: boolean;
  discovered_at: string;
  is_user_new: boolean;
}

export interface ChaptersResponse {
  chapters: ChapterItem[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}
