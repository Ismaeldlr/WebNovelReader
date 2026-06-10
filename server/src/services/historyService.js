const db = require('../db/db');

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 60;

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function buildHistoryFilters(userId, { novelId, from } = {}) {
  const params = [userId];
  const conditions = ['rh.user_id = $1'];

  if (novelId) {
    params.push(novelId);
    conditions.push(`rh.novel_id = $${params.length}`);
  }

  if (from) {
    const fromDate = new Date(from);
    if (!Number.isNaN(fromDate.getTime())) {
      params.push(fromDate.toISOString());
      conditions.push(`rh.read_at >= $${params.length}`);
    }
  }

  return { params, whereClause: conditions.join(' AND ') };
}

class HistoryService {
  static async getHistory(userId, { page = 1, limit = DEFAULT_LIMIT, novelId, from } = {}) {
    const safePage = parsePositiveInt(page, 1);
    const safeLimit = Math.min(parsePositiveInt(limit, DEFAULT_LIMIT), MAX_LIMIT);
    const offset = (safePage - 1) * safeLimit;
    const { params, whereClause } = buildHistoryFilters(userId, { novelId, from });

    const countResult = await db.query(
      `
        SELECT COUNT(*)::int AS total
        FROM reading_history rh
        WHERE ${whereClause}
      `,
      params
    );

    const queryParams = [...params, safeLimit, offset];
    const { rows } = await db.query(
      `
        SELECT
          rh.id,
          rh.read_at,
          n.id AS novel_id,
          n.title AS novel_title,
          n.author AS novel_author,
          n.cover_url,
          n.source_site,
          c.id AS chapter_id,
          c.chapter_number,
          c.title AS chapter_title
        FROM reading_history rh
        INNER JOIN novels n
          ON n.id = rh.novel_id
        INNER JOIN chapters c
          ON c.id = rh.chapter_id
        WHERE ${whereClause}
        ORDER BY rh.read_at DESC
        LIMIT $${queryParams.length - 1}
        OFFSET $${queryParams.length}
      `,
      queryParams
    );

    return {
      entries: rows,
      total: countResult.rows[0]?.total || 0,
      page: safePage,
      limit: safeLimit,
    };
  }

  static async getStats(userId) {
    const { rows } = await db.query(
      `
        SELECT
          COUNT(rh.id)::int AS total_chapters_read,
          COUNT(DISTINCT rh.novel_id)::int AS distinct_novels_read,
          COUNT(DISTINCT n.author)::int AS distinct_authors_read
        FROM reading_history rh
        INNER JOIN novels n
          ON n.id = rh.novel_id
        WHERE rh.user_id = $1
      `,
      [userId]
    );

    return {
      total_chapters_read: rows[0]?.total_chapters_read || 0,
      distinct_novels_read: rows[0]?.distinct_novels_read || 0,
      distinct_authors_read: rows[0]?.distinct_authors_read || 0,
    };
  }

  static async getNovels(userId) {
    const { rows } = await db.query(
      `
        SELECT DISTINCT
          n.id,
          n.title
        FROM reading_history rh
        INNER JOIN novels n
          ON n.id = rh.novel_id
        WHERE rh.user_id = $1
        ORDER BY n.title ASC
      `,
      [userId]
    );

    return rows;
  }

  static async getNovelHistory(userId, { novelId, from } = {}) {
    const { params, whereClause } = buildHistoryFilters(userId, { novelId, from });

    const { rows } = await db.query(
      `
        WITH novel_reads AS (
          SELECT
            rh.novel_id,
            COUNT(rh.id)::int AS reads_count,
            MAX(rh.read_at) AS last_read_at
          FROM reading_history rh
          WHERE ${whereClause}
          GROUP BY rh.novel_id
        ),
        latest_reads AS (
          SELECT DISTINCT ON (rh.novel_id)
            rh.novel_id,
            c.chapter_number AS latest_chapter_number,
            c.title AS latest_chapter_title
          FROM reading_history rh
          INNER JOIN chapters c
            ON c.id = rh.chapter_id
          WHERE ${whereClause}
          ORDER BY rh.novel_id, rh.read_at DESC
        )
        SELECT
          n.id AS novel_id,
          n.title AS novel_title,
          n.author AS novel_author,
          n.cover_url,
          n.source_site,
          n.total_chapters,
          nr.reads_count,
          nr.last_read_at,
          lr.latest_chapter_number,
          lr.latest_chapter_title,
          COALESCE(le.current_chapter_number, lr.latest_chapter_number, 1) AS continue_chapter_number
        FROM novel_reads nr
        INNER JOIN novels n
          ON n.id = nr.novel_id
        INNER JOIN latest_reads lr
          ON lr.novel_id = nr.novel_id
        LEFT JOIN library_entries le
          ON le.user_id = $1
          AND le.novel_id = nr.novel_id
        ORDER BY nr.last_read_at DESC, n.title ASC
      `,
      params
    );

    return rows;
  }
}

module.exports = HistoryService;
