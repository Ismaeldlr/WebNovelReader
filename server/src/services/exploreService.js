const db = require('../db/db');

class ExploreService {
  static async getNovels(userId, { search = '', limit = 24 } = {}) {
    const params = [userId];
    const conditions = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(n.title ILIKE $${params.length} OR n.author ILIKE $${params.length})`);
    }

    params.push(limit);

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(
      `
        SELECT
          n.id,
          n.title,
          n.author,
          n.description,
          n.cover_url,
          n.cover_url_orig,
          n.source_site,
          n.source_url,
          n.tags,
          n.total_chapters,
          n.ingested_at,
          (le.id IS NOT NULL) AS in_library
        FROM novels n
        LEFT JOIN library_entries le
          ON le.novel_id = n.id
          AND le.user_id = $1
        ${whereClause}
        ORDER BY n.ingested_at DESC, n.title ASC
        LIMIT $${params.length}
      `,
      params
    );

    return rows;
  }
}

module.exports = ExploreService;
