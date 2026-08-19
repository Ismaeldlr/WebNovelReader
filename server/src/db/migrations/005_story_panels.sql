-- =============================================================================
-- WEBNOVEL HUB - Story mode panels
-- Migration: 005_story_panels.sql
-- =============================================================================

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'part';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pending_tag') THEN
    CREATE TYPE pending_tag AS ENUM ('urgent', 'idea', 'scene');
  END IF;
END;
$$;

CREATE TABLE pending_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  tag         pending_tag NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  order_index NUMERIC NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pending_items_project_resolved ON pending_items(project_id, is_resolved);

CREATE TRIGGER trg_pending_items_updated_at
BEFORE UPDATE ON pending_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
