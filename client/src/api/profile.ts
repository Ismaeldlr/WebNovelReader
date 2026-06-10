import apiClient from './client';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export interface ProfileUser {
  id: string;
  username: string;
  created_at: string;
}

export interface ProfileBreakdownItem {
  key: string;
  count: number;
}

export interface ProfileActivityDay {
  date: string;
  count: number;
}

export interface ProfileTopNovel {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  reads_count: number;
}

export interface ProfileStats {
  total_novels: number;
  chapters_read: number;
  words_read: number;
  novels_started: number;
  novels_completed: number;
  authors_explored: number;
  average_chapters_per_day: number;
  longest_novel_read: {
    id: string;
    title: string;
    chapter_number: number;
  } | null;
  streak: {
    current: number;
    longest: number;
  };
  library_status_breakdown: ProfileBreakdownItem[];
  library_source_breakdown: ProfileBreakdownItem[];
  top_novels: ProfileTopNovel[];
  activity: ProfileActivityDay[];
}

export interface ProfileResponse {
  user: ProfileUser;
  stats: ProfileStats;
}

export async function getProfile(): Promise<ProfileResponse> {
  const res = await apiClient.get<unknown, ApiEnvelope<ProfileResponse>>('/user/profile');
  return res.data;
}

export async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.patch('/user/password', { currentPassword, newPassword });
}
