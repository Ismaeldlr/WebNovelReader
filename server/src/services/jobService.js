const db = require('../db/db');

const SOURCE_SITE_LABELS = {
  ranobes: 'Ranobes',
  wtr_lab: 'WTR Lab',
  royal_road: 'Royal Road',
};

function normalizeSourceSite(value) {
  if (!value) return null;

  const normalized = String(value).trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (normalized === 'wtrlab' || normalized === 'wtr') return 'wtr_lab';
  if (normalized === 'royalroad') return 'royal_road';
  if (Object.prototype.hasOwnProperty.call(SOURCE_SITE_LABELS, normalized)) return normalized;
  return null;
}

function detectSourceSite(url) {
  const host = new URL(url).hostname.toLowerCase();

  if (host.includes('ranobes')) return 'ranobes';
  if (host.includes('wtr-lab') || host.includes('wtrlab')) return 'wtr_lab';
  if (host.includes('royalroad')) return 'royal_road';
  return null;
}

function validateHttpUrl(value) {
  if (!value || typeof value !== 'string') {
    const error = new Error('URL is required.');
    error.status = 400;
    throw error;
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch (err) {
    const error = new Error('Please enter a valid URL.');
    error.status = 400;
    throw error;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    const error = new Error('Only http and https URLs are supported.');
    error.status = 400;
    throw error;
  }

  return parsed.toString();
}

function mapJob(row) {
  const result = row.result
    ? {
        ...row.result,
        novelTitle: row.novel_title || null,
      }
    : null;

  return {
    id: row.id,
    type: row.type,
    status: row.status,
    errorType: row.error_type,
    errorMessage: row.error_message,
    retryCount: row.retry_count,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    result,
  };
}

class JobService {
  static detectSourceSite(url) {
    const normalizedUrl = validateHttpUrl(url);
    return detectSourceSite(normalizedUrl);
  }

  static async createUrlImportJob(userId, input) {
    const url = validateHttpUrl(input?.url);
    const requestedSource = input?.source_site || input?.sourceSite;
    const normalizedSource = normalizeSourceSite(requestedSource);

    if (requestedSource && !normalizedSource) {
      const error = new Error('Unsupported source site.');
      error.status = 400;
      throw error;
    }

    const sourceSite = normalizedSource || detectSourceSite(url);

    if (!sourceSite) {
      const error = new Error('This URL is not from a supported source.');
      error.status = 400;
      throw error;
    }

    const maxRetries = Number.parseInt(process.env.MAX_RETRIES || '3', 10);
    const { rows } = await db.query(
      `INSERT INTO scrape_jobs (
          type, status, triggered_by, payload, max_retries
        )
        VALUES (
          'novel_ingestion',
          'pending',
          $1,
          $2,
          $3
        )
        RETURNING id, type, status, payload, created_at`,
      [
        userId,
        JSON.stringify({ url, source_site: sourceSite }),
        Number.isFinite(maxRetries) ? maxRetries : 3,
      ]
    );

    const job = rows[0];
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      sourceSite,
      sourceLabel: SOURCE_SITE_LABELS[sourceSite],
      url: job.payload?.url || url,
      createdAt: job.created_at,
    };
  }

  static async getJobStatus(userId, jobId) {
    const { rows } = await db.query(
      `SELECT
          sj.id,
          sj.type,
          sj.status,
          sj.error_type,
          sj.error_message,
          sj.retry_count,
          sj.created_at,
          sj.started_at,
          sj.completed_at,
          sj.result,
          n.title AS novel_title
        FROM scrape_jobs sj
        LEFT JOIN novels n ON n.id = sj.novel_id
        WHERE sj.id = $1
          AND sj.triggered_by = $2
        LIMIT 1`,
      [jobId, userId]
    );

    if (rows.length === 0) {
      const error = new Error('Job not found.');
      error.status = 404;
      throw error;
    }

    return mapJob(rows[0]);
  }
}

module.exports = JobService;
