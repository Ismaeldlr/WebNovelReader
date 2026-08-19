-- =============================================================================
-- WEBNOVEL HUB - Per-document writing targets
-- Migration: 004_word_count_target.sql
-- =============================================================================

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS word_count_target INT;
