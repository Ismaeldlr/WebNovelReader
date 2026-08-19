-- Persist progress so URL imports remain observable across page refreshes.

ALTER TABLE scrape_jobs
  ADD COLUMN IF NOT EXISTS progress_percent SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_message TEXT,
  ADD COLUMN IF NOT EXISTS progress_current INT,
  ADD COLUMN IF NOT EXISTS progress_total INT;

UPDATE scrape_jobs
SET progress_percent = 100,
    progress_message = COALESCE(progress_message, 'Import complete')
WHERE status = 'completed'
  AND progress_percent = 0;

ALTER TABLE scrape_jobs
  DROP CONSTRAINT IF EXISTS scrape_jobs_progress_percent_check;

ALTER TABLE scrape_jobs
  ADD CONSTRAINT scrape_jobs_progress_percent_check
  CHECK (progress_percent BETWEEN 0 AND 100);
