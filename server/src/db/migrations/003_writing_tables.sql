-- =============================================================================
-- WEBNOVEL HUB - Writing Studio Foundation
-- Migration: 003_writing_tables.sql
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
    CREATE TYPE project_status AS ENUM ('active', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE document_type AS ENUM ('chapter', 'scene', 'note');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_status') THEN
    CREATE TYPE doc_status AS ENUM ('draft', 'in_progress', 'done');
  END IF;
END;
$$;

CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  genre       TEXT,
  status      project_status NOT NULL DEFAULT 'active',
  settings    JSONB NOT NULL DEFAULT '{}',
  word_count  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
  doc_type    document_type NOT NULL DEFAULT 'chapter',
  order_index NUMERIC NOT NULL DEFAULT 0,
  status      doc_status NOT NULL DEFAULT 'draft',
  word_count  INT NOT NULL DEFAULT 0,
  summary     TEXT,
  parent_id   UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE document_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  word_count  INT NOT NULL DEFAULT 0,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_status_updated ON projects(user_id, status, updated_at DESC);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_project_type ON documents(project_id, doc_type);
CREATE INDEX idx_document_versions_document_snapshot ON document_versions(document_id, snapshot_at DESC);

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
