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

export type UrlSourceSite = 'ranobes' | 'wtr_lab' | 'royal_road';

export interface UrlImportJob {
  id: string;
  type: 'novel_ingestion';
  status: 'pending' | 'running' | 'completed' | 'failed';
  sourceSite: UrlSourceSite;
  sourceLabel: string;
  url: string;
  createdAt: string;
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
    source_site?: string;
    filename?: string;
    url?: string;
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

export function detectSourceSiteFromUrl(value: string): UrlSourceSite | null {
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host.includes('ranobes')) return 'ranobes';
    if (host.includes('wtr-lab') || host.includes('wtrlab')) return 'wtr_lab';
    if (host.includes('royalroad')) return 'royal_road';
    return null;
  } catch (err) {
    return null;
  }
}

export async function importByUrl(url: string, sourceSite?: UrlSourceSite): Promise<UrlImportJob> {
  const res = await apiClient.post<unknown, ApiEnvelope<UrlImportJob>>('/import/url', {
    url,
    source_site: sourceSite,
  });

  return res.data;
}

export async function getRecentImports(): Promise<RecentImport[]> {
  const res = await apiClient.get<unknown, ApiEnvelope<RecentImport[]>>('/import/recent');
  return res.data;
}
