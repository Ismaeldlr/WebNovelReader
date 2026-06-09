const db = require('../db/db');

class LibraryService {
  // Get all library entries for a user with filters, sorting, pagination
  static async getUserLibrary(userId, {
    status = null,
    sourceSite = null,
    onlyFavorites = false,
    onlyUnread = false,
    search = '',
    sortBy = 'lastReadAt', // lastReadAt, lastUpdated, title, addedAt, progress
    order = 'DESC',
    limit = 24,
    offset = 0
  }) {
    const client = await db.getClient();
    try {
      // Build filter clauses
      const conditions = ['le.user_id = $1'];
      const params = [userId];
      let paramIndex = 2;

      if (status && status !== 'all') {
        conditions.push(`le.status = $${paramIndex++}`);
        params.push(status);
      }
      if (sourceSite && sourceSite !== 'all') {
        conditions.push(`n.source_site = $${paramIndex++}`);
        params.push(sourceSite);
      }
      if (onlyFavorites) {
        conditions.push(`le.is_favorite = true`);
      }
      if (onlyUnread) {
        // novels that have at least one unseen new chapter for this user
        conditions.push(`EXISTS (
          SELECT 1 FROM user_new_chapters unc
          WHERE unc.user_id = le.user_id
            AND unc.novel_id = le.novel_id
            AND unc.seen_at IS NULL
        )`);
      }
      if (search) {
        conditions.push(`(n.title ILIKE $${paramIndex} OR n.author ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');
      const filterParams = [...params];

      // Sorting mapping
      let orderByClause;
      switch (sortBy) {
        case 'lastReadAt':
          orderByClause = `le.last_read_at ${order} NULLS LAST`;
          break;
        case 'lastUpdated':
          orderByClause = `n.last_scraped_at ${order} NULLS LAST`;
          break;
        case 'title':
          orderByClause = `n.title ${order}`;
          break;
        case 'addedAt':
          orderByClause = `le.added_at ${order}`;
          break;
        case 'progress':
          // progress percentage = current_chapter_number / total_chapters
          orderByClause = `(le.current_chapter_number::float / NULLIF(n.total_chapters, 0)) ${order} NULLS LAST`;
          break;
        default:
          orderByClause = `le.last_read_at DESC NULLS LAST`;
      }

      // Query for novels
      const novelsQuery = `
        SELECT
          n.id,
          n.title,
          n.author,
          n.cover_url,
          n.source_site,
          n.total_chapters,
          le.status,
          le.is_favorite,
          le.current_chapter_number,
          le.last_read_at,
          le.added_at,
          (
            SELECT COUNT(*) FROM user_new_chapters unc
            WHERE unc.user_id = le.user_id AND unc.novel_id = n.id AND unc.seen_at IS NULL
          ) AS new_chapters_count
        FROM library_entries le
        JOIN novels n ON n.id = le.novel_id
        WHERE ${whereClause}
        ORDER BY ${orderByClause}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      params.push(limit, offset);
      const { rows: novels } = await client.query(novelsQuery, params);

      // Count total matching entries for pagination
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM library_entries le
        JOIN novels n ON n.id = le.novel_id
        WHERE ${whereClause}
      `;
      const { rows: countRows } = await client.query(countQuery, filterParams);
      const total = parseInt(countRows[0].total, 10);

      return { novels, total };
    } finally {
      client.release();
    }
  }

  // Get library statistics for the dashboard
  static async getLibraryStats(userId) {
    const client = await db.getClient();
    try {
      // Total novels
      const totalRes = await client.query(
        `SELECT COUNT(*) AS total FROM library_entries WHERE user_id = $1`,
        [userId]
      );
      const totalNovels = parseInt(totalRes.rows[0].total, 10);

      // Count by status
      const statusRes = await client.query(
        `SELECT status, COUNT(*) AS count FROM library_entries WHERE user_id = $1 GROUP BY status`,
        [userId]
      );
      const statusCounts = {};
      statusRes.rows.forEach(row => { statusCounts[row.status] = parseInt(row.count, 10); });

      // Chapters cached (offline) – sum of chapters_cached from offline_cache_entries for this user
      const cacheRes = await client.query(
        `SELECT COALESCE(SUM(chapters_cached), 0) AS total FROM offline_cache_entries WHERE user_id = $1 AND is_enabled = true`,
        [userId]
      );
      const chaptersCached = parseInt(cacheRes.rows[0].total, 10);
      const chaptersCachedFormatted = chaptersCached.toLocaleString();

      // Last update job run (most recent completed run)
      const updateRes = await client.query(
        `SELECT completed_at FROM update_job_runs WHERE completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1`
      );
      let lastUpdated = 'Never';
      if (updateRes.rows[0]?.completed_at) {
        const diffMs = Date.now() - new Date(updateRes.rows[0].completed_at).getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHrs < 1) lastUpdated = 'Just now';
        else if (diffHrs < 24) lastUpdated = `${diffHrs}h ago`;
        else lastUpdated = `${Math.floor(diffHrs / 24)}d ago`;
      }

      return {
        totalNovels,
        readingCount: statusCounts['reading'] || 0,
        chaptersCached: chaptersCachedFormatted,
        lastUpdated,
        statusCounts
      };
    } finally {
      client.release();
    }
  }

  // Get count of unseen new chapters across all novels (for the update strip)
  static async getUnseenNewChaptersCount(userId) {
    const client = await db.getClient();
    try {
      const res = await client.query(
        `SELECT COUNT(*) AS count FROM user_new_chapters WHERE user_id = $1 AND seen_at IS NULL`,
        [userId]
      );
      return parseInt(res.rows[0].count, 10);
    } finally {
      client.release();
    }
  }

  // Toggle favorite status
  static async addNovel(userId, novelId) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const novelRes = await client.query(
        `SELECT id FROM novels WHERE id = $1`,
        [novelId]
      );

      if (novelRes.rowCount === 0) {
        const error = new Error('Novel not found');
        error.status = 404;
        throw error;
      }

      const res = await client.query(
        `INSERT INTO library_entries (user_id, novel_id, status)
         VALUES ($1, $2, 'following')
         ON CONFLICT (user_id, novel_id) DO UPDATE
         SET updated_at = NOW()
         RETURNING id, status, is_favorite, current_chapter_number, added_at, last_read_at`,
        [userId, novelId]
      );

      await client.query('COMMIT');
      return {
        id: res.rows[0].id,
        status: res.rows[0].status,
        is_favorite: res.rows[0].is_favorite,
        current_chapter_number: res.rows[0].current_chapter_number,
        added_at: res.rows[0].added_at,
        last_read_at: res.rows[0].last_read_at,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Toggle favorite status
  static async toggleFavorite(userId, novelId) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `UPDATE library_entries
         SET is_favorite = NOT is_favorite, updated_at = NOW()
         WHERE user_id = $1 AND novel_id = $2
         RETURNING is_favorite`,
        [userId, novelId]
      );
      if (res.rowCount === 0) throw new Error('Library entry not found');
      await client.query('COMMIT');
      return { isFavorite: res.rows[0].is_favorite };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Update reading status
  static async updateStatus(userId, novelId, newStatus) {
    const validStatuses = ['reading', 'following', 'on_hold', 'dropped', 'completed'];
    if (!validStatuses.includes(newStatus)) throw new Error('Invalid status');
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO library_entries (user_id, novel_id, status)
         SELECT $1, n.id, $2::library_status
         FROM novels n
         WHERE n.id = $3
         ON CONFLICT (user_id, novel_id) DO UPDATE
         SET status = EXCLUDED.status, updated_at = NOW()
         RETURNING id, status, is_favorite, current_chapter_number, added_at, last_read_at`,
        [userId, newStatus, novelId]
      );
      if (res.rowCount === 0) {
        const error = new Error('Novel not found');
        error.status = 404;
        throw error;
      }
      await client.query('COMMIT');
      return {
        id: res.rows[0].id,
        status: res.rows[0].status,
        is_favorite: res.rows[0].is_favorite,
        current_chapter_number: res.rows[0].current_chapter_number,
        added_at: res.rows[0].added_at,
        last_read_at: res.rows[0].last_read_at,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Delete novel from library (cascade removes chapters, progress, etc.)
  static async deleteNovel(userId, novelId) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      // Delete library entry – foreign key ON DELETE CASCADE on novels table will remove
      // chapters, chapter_contents, reading_history, user_new_chapters, etc.
      const res = await client.query(
        `DELETE FROM library_entries WHERE user_id = $1 AND novel_id = $2`,
        [userId, novelId]
      );
      if (res.rowCount === 0) throw new Error('Novel not found in library');
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = LibraryService;
