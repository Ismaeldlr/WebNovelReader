import apiClient from './client';
import type { ChaptersResponse, NovelDetail } from '../types/novel';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export async function getNovelDetail(id: string): Promise<NovelDetail> {
  const res = await apiClient.get<unknown, ApiEnvelope<NovelDetail>>(`/novels/${id}`);
  return res.data;
}

export async function getNovelChapters(
  id: string,
  page = 1,
  limit = 100,
  order: 'asc' | 'desc' = 'asc'
): Promise<ChaptersResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    order,
  });

  const res = await apiClient.get<unknown, ApiEnvelope<ChaptersResponse>>(
    `/novels/${id}/chapters?${params.toString()}`
  );

  return res.data;
}

export interface NovelUpdatePayload {
  title?: string;
  author?: string | null;
  description?: string | null;
  tags?: string[];
}

export async function updateNovel(id: string, changes: NovelUpdatePayload): Promise<NovelDetail> {
  const res = await apiClient.patch<unknown, ApiEnvelope<NovelDetail>>(`/novels/${id}`, changes);
  return res.data;
}

export async function updateNovelCover(id: string, file: File): Promise<string> {
  const body = new FormData();
  body.append('cover', file);

  const res = await apiClient.post<unknown, ApiEnvelope<{ cover_url: string }>>(
    `/novels/${id}/cover`,
    body,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );

  return res.data.cover_url;
}

export async function deleteNovelRecord(id: string): Promise<void> {
  await apiClient.delete(`/novels/${id}`);
}
