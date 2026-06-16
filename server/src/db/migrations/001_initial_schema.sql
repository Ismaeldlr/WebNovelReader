-- =============================================================================
-- WEBNOVEL HUB — Initial Schema
-- Migration: 001_initial_schema.sql
-- =============================================================================

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive text for searches


-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE source_site AS ENUM (
  'ranobes',
  'wtr_lab',
  'royal_road',
  'epub'
);

CREATE TYPE library_status AS ENUM (
  'reading',
  'following',
  'on_hold',
  'dropped',
  'completed'
);

CREATE TYPE scrape_error_type AS ENUM (
  'network_error',
  'structure_changed',
  'rate_limited',
  'unknown'
);

CREATE TYPE job_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed'
);

CREATE TYPE job_type AS ENUM (
  'novel_ingestion',
  'chapter_fetch',
  'update_check',
  'manual_update_check'
);

CREATE TYPE reader_theme AS ENUM (
  'light',
  'dark',
  'sepia'
);

CREATE TYPE content_width AS ENUM (
  'narrow',
  'medium',
  'wide'
);


-- =============================================================================
-- USERS
-- =============================================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        CITEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Application users. Supports multi-device progress sync (req 0010).';


-- =============================================================================
-- READER PREFERENCES
-- Req 0009-05: persist across sessions. Stored server-side for cross-device sync.
-- =============================================================================

CREATE TABLE reader_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme         reader_theme NOT NULL DEFAULT 'dark',
  font_size     SMALLINT NOT NULL DEFAULT 18
                  CHECK (font_size BETWEEN 14 AND 28),        -- req 0009-02
  line_spacing  NUMERIC(3,1) NOT NULL DEFAULT 1.8
                  CHECK (line_spacing BETWEEN 1.4 AND 2.2),   -- req 0009-03
  content_width content_width NOT NULL DEFAULT 'medium',      -- req 0009-04
  prefetch_count SMALLINT NOT NULL DEFAULT 3,                 -- req 0002-07 configurable
  update_interval_hours SMALLINT NOT NULL DEFAULT 6,          -- req 0003-01 configurable
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE reader_preferences IS 'Per-user reader settings. One row per user (req 0009-05).';


-- =============================================================================
-- NOVELS
-- =============================================================================

CREATE TABLE novels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_site     source_site NOT NULL,
  source_url      TEXT NOT NULL,
  title           CITEXT NOT NULL,
  author          CITEXT,
  description     TEXT,
  cover_url       TEXT,                    -- local path after download (req 0002-06)
  cover_url_orig  TEXT,                    -- original remote URL, kept for reference
  tags            TEXT[] NOT NULL DEFAULT '{}',
  total_chapters  INT NOT NULL DEFAULT 0,
  is_update_failed BOOLEAN NOT NULL DEFAULT FALSE,  -- req 0003-05
  update_failed_reason TEXT,
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT novels_source_url_unique UNIQUE (source_url)    -- req 0002-05: no duplicates
);

CREATE INDEX idx_novels_source_site ON novels(source_site);
CREATE INDEX idx_novels_title ON novels USING gin(to_tsvector('english', title::text));
CREATE INDEX idx_novels_author ON novels USING gin(to_tsvector('english', COALESCE(author::text, '')));

COMMENT ON TABLE novels IS 'Novel metadata scraped from source sites (req 0002-01).';
COMMENT ON COLUMN novels.cover_url IS 'Local filesystem path. Covers are downloaded at ingestion (req 0002-06).';
COMMENT ON COLUMN novels.is_update_failed IS 'Flagged when a scheduled update check fails for this novel (req 0003-05).';


-- =============================================================================
-- CHAPTERS
-- Split into metadata + content for lazy loading (req 0002-03).
-- =============================================================================

CREATE TABLE chapters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id        UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_number  INT NOT NULL,
  title           TEXT NOT NULL,
  source_url      TEXT NOT NULL,
  is_new          BOOLEAN NOT NULL DEFAULT FALSE,   -- req 0003-03: flagged when discovered by update job
  is_fetched      BOOLEAN NOT NULL DEFAULT FALSE,   -- FALSE = metadata only, TRUE = content stored
  fetch_failed    BOOLEAN NOT NULL DEFAULT FALSE,
  fetch_error     scrape_error_type,
  fetch_error_msg TEXT,
  discovered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fetched_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chapters_novel_number_unique UNIQUE (novel_id, chapter_number)
);

CREATE INDEX idx_chapters_novel_id ON chapters(novel_id);
CREATE INDEX idx_chapters_novel_number ON chapters(novel_id, chapter_number);
CREATE INDEX idx_chapters_is_new ON chapters(novel_id, is_new) WHERE is_new = TRUE;
CREATE INDEX idx_chapters_not_fetched ON chapters(novel_id) WHERE is_fetched = FALSE;

COMMENT ON TABLE chapters IS 'Chapter metadata. Content stored separately for lazy loading (req 0002-03).';


CREATE TABLE chapter_contents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  UUID NOT NULL UNIQUE REFERENCES chapters(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,    -- req 0013-01: raw text, stripped of site chrome
  word_count  INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE chapter_contents IS 'Chapter body text, separated from metadata for lazy loading (req 0002-03, 0002-04).';


-- =============================================================================
-- LIBRARY
-- Each user–novel pair. Tracks status, favorites, and reading progress.
-- Reqs: 0005, 0005-01, 0005-04, 0007
-- =============================================================================

CREATE TABLE library_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  novel_id        UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  status          library_status NOT NULL DEFAULT 'following',
  is_favorite     BOOLEAN NOT NULL DEFAULT FALSE,             -- req 0005-04
  current_chapter_id   UUID REFERENCES chapters(id) ON DELETE SET NULL,
  current_chapter_number INT NOT NULL DEFAULT 0,             -- denormalized for fast display
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT library_entries_user_novel_unique UNIQUE (user_id, novel_id)
);

CREATE INDEX idx_library_user_id ON library_entries(user_id);
CREATE INDEX idx_library_user_status ON library_entries(user_id, status);
CREATE INDEX idx_library_user_favorite ON library_entries(user_id) WHERE is_favorite = TRUE;
CREATE INDEX idx_library_last_read ON library_entries(user_id, last_read_at DESC NULLS LAST);

COMMENT ON TABLE library_entries IS 'User library. One row per user/novel pair (req 0005, 0005-01).';
COMMENT ON COLUMN library_entries.current_chapter_number IS 'Denormalized for fast progress display (req 0005-03). Updated on every chapter read.';


-- =============================================================================
-- READING HISTORY
-- Full per-chapter read log. Separate from progress — progress = current position,
-- history = every chapter ever opened. (req 0008-03)
-- =============================================================================

CREATE TABLE reading_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  novel_id        UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_id      UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reading_history_user ON reading_history(user_id, read_at DESC);
CREATE INDEX idx_reading_history_novel ON reading_history(user_id, novel_id, read_at DESC);

COMMENT ON TABLE reading_history IS 'Append-only log of every chapter opened by a user (req 0008-03).';


-- =============================================================================
-- NEW CHAPTER TRACKING
-- Tracks which unread-new chapters are visible per user (req 0003-03, 0005-02, 0006-03).
-- =============================================================================

CREATE TABLE user_new_chapters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id  UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  novel_id    UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  seen_at     TIMESTAMPTZ,   -- NULL = not yet dismissed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_new_chapters_unique UNIQUE (user_id, chapter_id)
);

CREATE INDEX idx_user_new_chapters_unseen ON user_new_chapters(user_id, novel_id) WHERE seen_at IS NULL;

COMMENT ON TABLE user_new_chapters IS 'Tracks new chapters per user for badge counts (req 0005-02, 0006-03).';


-- =============================================================================
-- SCRAPE JOBS
-- Async job tracking for ingestion and update checks (req 0012-03).
-- =============================================================================

CREATE TABLE scrape_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            job_type NOT NULL,
  status          job_status NOT NULL DEFAULT 'pending',
  novel_id        UUID REFERENCES novels(id) ON DELETE SET NULL,
  chapter_id      UUID REFERENCES chapters(id) ON DELETE SET NULL,
  triggered_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  payload         JSONB,               -- input params (e.g. submitted URL)
  result          JSONB,               -- output summary on completion
  error_type      scrape_error_type,
  error_message   TEXT,
  retry_count     SMALLINT NOT NULL DEFAULT 0,
  max_retries     SMALLINT NOT NULL DEFAULT 3,   -- req 0004-01
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scrape_jobs_status ON scrape_jobs(status) WHERE status IN ('pending', 'running');
CREATE INDEX idx_scrape_jobs_novel ON scrape_jobs(novel_id);
CREATE INDEX idx_scrape_jobs_type_status ON scrape_jobs(type, status);

COMMENT ON TABLE scrape_jobs IS 'Async job queue records. Returns job ID immediately to client (req 0012-03).';


-- =============================================================================
-- UPDATE JOB RUNS
-- Logs every scheduled update check run (req 0003-04).
-- =============================================================================

CREATE TABLE update_job_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  novels_checked      INT NOT NULL DEFAULT 0,
  new_chapters_found  INT NOT NULL DEFAULT 0,
  failed_novels       INT NOT NULL DEFAULT 0,
  errors              JSONB,     -- array of {novel_id, error_type, message}
  triggered_manually  BOOLEAN NOT NULL DEFAULT FALSE   -- req 0003-06
);

COMMENT ON TABLE update_job_runs IS 'Audit log for every scheduled or manual update run (req 0003-04).';


-- =============================================================================
-- OFFLINE CACHE REGISTRY
-- Tracks which novels are marked for offline and their cache state (req 0011).
-- =============================================================================

CREATE TABLE offline_cache_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  novel_id            UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  is_enabled          BOOLEAN NOT NULL DEFAULT TRUE,    -- req 0011
  chapters_cached     INT NOT NULL DEFAULT 0,           -- req 0011-03
  last_cache_sync_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT offline_cache_unique UNIQUE (user_id, novel_id)
);

COMMENT ON TABLE offline_cache_entries IS 'Tracks which novels are flagged for offline caching (req 0011, 0011-03).';


-- =============================================================================
-- UTILITY: updated_at auto-update trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to every table with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'reader_preferences', 'novels', 'chapters',
    'chapter_contents', 'library_entries', 'scrape_jobs',
    'offline_cache_entries'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;
