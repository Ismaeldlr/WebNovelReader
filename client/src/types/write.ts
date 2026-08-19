export type ProjectStatus = 'active' | 'archived';
export type WritingDocumentType = 'part' | 'chapter' | 'scene' | 'note';
export type WritingDocumentStatus = 'draft' | 'in_progress' | 'done';
export type PendingTag = 'urgent' | 'idea' | 'scene';

export interface WritingProject {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  genre: string | null;
  status: ProjectStatus;
  settings: Record<string, unknown>;
  word_count: number;
  document_count: number;
  total_word_count: number;
  created_at: string;
  updated_at: string;
}

export interface WritingDocumentMeta {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  doc_type: WritingDocumentType;
  order_index: number;
  status: WritingDocumentStatus;
  word_count: number;
  word_count_target: number | null;
  summary: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WritingDocument extends WritingDocumentMeta {
  content: string;
}

export interface WritingDocumentVersionMeta {
  id: string;
  document_id: string;
  word_count: number;
  snapshot_at: string;
}

export interface WritingDocumentVersion extends WritingDocumentVersionMeta {
  content: string;
}

export interface ProjectContext {
  setting: string;
  tone: string;
  themes: string;
  timeline: string;
  globalNotes: string;
}

export interface PendingItem {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  tag: PendingTag;
  is_resolved: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectPayload {
  title: string;
  genre?: string;
  description?: string;
}

export interface UpdateProjectPayload {
  title?: string;
  description?: string | null;
  genre?: string | null;
  settings?: Record<string, unknown>;
  status?: ProjectStatus;
}

export interface CreateDocumentPayload {
  title: string;
  doc_type: WritingDocumentType;
  summary?: string;
  parent_id?: string | null;
  order_index?: number;
}

export interface UpdateDocumentPayload {
  title?: string;
  content?: string;
  status?: WritingDocumentStatus;
  summary?: string | null;
  word_count?: number;
  word_count_target?: number | null;
  parent_id?: string | null;
}

export interface CreatePendingItemPayload {
  content: string;
  tag: PendingTag;
}

export interface UpdatePendingItemPayload {
  content?: string;
  tag?: PendingTag;
  is_resolved?: boolean;
  order_index?: number;
}
