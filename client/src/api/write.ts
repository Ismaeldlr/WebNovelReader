import apiClient from './client';
import type {
  CreateDocumentPayload,
  CreatePendingItemPayload,
  CreateProjectPayload,
  PendingItem,
  ProjectContext,
  UpdateDocumentPayload,
  UpdatePendingItemPayload,
  UpdateProjectPayload,
  WritingDocument,
  WritingDocumentMeta,
  WritingDocumentVersion,
  WritingDocumentVersionMeta,
  WritingProject,
} from '../types/write';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export async function fetchProjects(includeArchived = false): Promise<WritingProject[]> {
  const query = includeArchived ? '?includeArchived=true' : '';
  const res = await apiClient.get<unknown, ApiEnvelope<WritingProject[]>>(`/write/projects${query}`);
  return res.data;
}

export async function createProject(payload: CreateProjectPayload): Promise<WritingProject> {
  const res = await apiClient.post<unknown, ApiEnvelope<WritingProject>>('/write/projects', payload);
  return res.data;
}

export async function getProject(id: string): Promise<WritingProject> {
  const res = await apiClient.get<unknown, ApiEnvelope<WritingProject>>(`/write/projects/${id}`);
  return res.data;
}

export async function getProjectContext(id: string): Promise<ProjectContext> {
  const res = await apiClient.get<unknown, ApiEnvelope<ProjectContext>>(`/write/projects/${id}/context`);
  return res.data;
}

export async function updateProjectContext(
  id: string,
  payload: Partial<ProjectContext>
): Promise<ProjectContext> {
  const res = await apiClient.patch<unknown, ApiEnvelope<ProjectContext>>(
    `/write/projects/${id}/context`,
    payload
  );
  return res.data;
}

export async function updateProject(id: string, payload: UpdateProjectPayload): Promise<WritingProject> {
  const res = await apiClient.patch<unknown, ApiEnvelope<WritingProject>>(`/write/projects/${id}`, payload);
  return res.data;
}

export async function fetchProjectDocuments(projectId: string): Promise<WritingDocumentMeta[]> {
  const res = await apiClient.get<unknown, ApiEnvelope<WritingDocumentMeta[]>>(
    `/write/projects/${projectId}/documents`
  );
  return res.data;
}

export async function createDocument(
  projectId: string,
  payload: CreateDocumentPayload
): Promise<WritingDocument> {
  const res = await apiClient.post<unknown, ApiEnvelope<WritingDocument>>(
    `/write/projects/${projectId}/documents`,
    payload
  );
  return res.data;
}

export async function getDocument(id: string): Promise<WritingDocument> {
  const res = await apiClient.get<unknown, ApiEnvelope<WritingDocument>>(`/write/documents/${id}`);
  return res.data;
}

export async function updateDocument(
  id: string,
  payload: UpdateDocumentPayload
): Promise<WritingDocument> {
  const res = await apiClient.patch<unknown, ApiEnvelope<WritingDocument>>(`/write/documents/${id}`, payload);
  return res.data;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/write/documents/${id}`);
}

export async function reorderDocument(
  id: string,
  orderIndex: number
): Promise<WritingDocumentMeta> {
  const res = await apiClient.patch<unknown, ApiEnvelope<WritingDocumentMeta>>(
    `/write/documents/${id}/reorder`,
    { order_index: orderIndex }
  );
  return res.data;
}

export async function fetchDocumentVersions(documentId: string): Promise<WritingDocumentVersionMeta[]> {
  const res = await apiClient.get<unknown, ApiEnvelope<WritingDocumentVersionMeta[]>>(
    `/write/documents/${documentId}/versions`
  );
  return res.data;
}

export async function fetchDocumentVersion(
  documentId: string,
  versionId: string
): Promise<WritingDocumentVersion> {
  const res = await apiClient.get<unknown, ApiEnvelope<WritingDocumentVersion>>(
    `/write/documents/${documentId}/versions/${versionId}`
  );
  return res.data;
}

export async function createDocumentVersion(
  documentId: string,
  payload?: { content?: string; word_count?: number }
): Promise<WritingDocumentVersion> {
  const res = await apiClient.post<unknown, ApiEnvelope<WritingDocumentVersion>>(
    `/write/documents/${documentId}/versions`,
    payload || {}
  );
  return res.data;
}

export async function fetchPendingItems(
  projectId: string,
  includeResolved = false
): Promise<PendingItem[]> {
  const query = includeResolved ? '?resolved=true' : '';
  const res = await apiClient.get<unknown, ApiEnvelope<PendingItem[]>>(
    `/write/projects/${projectId}/pending${query}`
  );
  return res.data;
}

export async function createPendingItem(
  projectId: string,
  payload: CreatePendingItemPayload
): Promise<PendingItem> {
  const res = await apiClient.post<unknown, ApiEnvelope<PendingItem>>(
    `/write/projects/${projectId}/pending`,
    payload
  );
  return res.data;
}

export async function updatePendingItem(
  itemId: string,
  payload: UpdatePendingItemPayload
): Promise<PendingItem> {
  const res = await apiClient.patch<unknown, ApiEnvelope<PendingItem>>(
    `/write/pending/${itemId}`,
    payload
  );
  return res.data;
}

export async function deletePendingItem(itemId: string): Promise<void> {
  await apiClient.delete(`/write/pending/${itemId}`);
}
