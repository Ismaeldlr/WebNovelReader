const db = require('../db/db');

class SearchService {
  static async searchNovels(userId, { query = '', limit = 5 } = {}) {
    const trimmedQuery = String(query || '').trim();

    if (trimmedQuery.length < 2) {
      return [];
    }

    const parsedLimit = parseInt(limit, 10);
    const safeLimit = Number.isNaN(parsedLimit)
      ? 5
      : Math.min(Math.max(parsedLimit, 1), 10);

    const { rows } = await db.query(
      `
        SELECT
          n.id,
          n.title,
          n.author,
          n.cover_url,
          n.source_site,
          n.total_chapters,
          (le.id IS NOT NULL) AS in_library
        FROM novels n
        LEFT JOIN library_entries le
          ON le.novel_id = n.id
          AND le.user_id = $1
        WHERE n.title ILIKE $2 OR n.author ILIKE $2
        ORDER BY n.title ASC
        LIMIT $3
      `,
      [userId, `%${trimmedQuery}%`, safeLimit]
    );

    return rows;
  }
}

module.exports = SearchService;
