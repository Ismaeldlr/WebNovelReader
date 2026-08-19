import apiClient from './client';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export type ScrapeJobState = 'pending' | 'running' | 'completed' | 'failed';

export interface ScrapeJobResult {
  novel_id?: string;
  novelId?: string;
  novelTitle?: string | null;
  chapter_count?: number;
  chapterCount?: number;
}

export interface ScrapeJobStatus {
  id: string;
  type: string;
  status: ScrapeJobState;
  errorType: 'network_error' | 'structure_changed' | 'rate_limited' | 'unknown' | null;
  errorMessage: string | null;
  retryCount: number;
  progress: {
    percent: number;
    message: string | null;
    current: number | null;
    total: number | null;
  };
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  result: ScrapeJobResult | null;
}

export async function getJobStatus(jobId: string): Promise<ScrapeJobStatus> {
  const res = await apiClient.get<unknown, ApiEnvelope<ScrapeJobStatus>>(`/jobs/${jobId}`, {
    params: { poll: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  });
  return res.data;
}
