import apiClient from './client';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export interface EpubImportResult {
  id: string;
  title: string;
  author: string | null;
  chapterCount: number;
}

export interface RecentImport {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  novelId: string | null;
  novelTitle: string | null;
  sourceSite: string;
  payload: {
    source?: string;
    filename?: string;
  } | null;
}

export async function importEpub(file: File): Promise<EpubImportResult> {
  const body = new FormData();
  body.append('file', file);

  const res = await apiClient.post<unknown, ApiEnvelope<EpubImportResult>>('/import/epub', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data;
}

export async function getRecentImports(): Promise<RecentImport[]> {
  const res = await apiClient.get<unknown, ApiEnvelope<RecentImport[]>>('/import/recent');
  return res.data;
}
